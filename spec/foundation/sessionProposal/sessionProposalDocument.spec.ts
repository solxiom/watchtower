/**
 * CA-26 acceptance proof — **the durable document is a closed shape at every
 * layer**.
 *
 * The batch contract requires that malformed, missing, extra, duplicate, and
 * unsupported values produce the exact typed reason and never partially
 * succeed. A durable record is a trust boundary: this capsule rewrites the
 * whole document on every transition, so a member it does not name is either a
 * different schema version, a hand edit, or another writer's value it would
 * silently drop. Each layer therefore declares its exact member set and refuses
 * anything else — the one deliberate exception being the embedded
 * `$defs.decisionProposal`, whose members are CA-09's to close.
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {
    parseSessionProposalDocument, SessionProposalDocumentError
} from '../../../src/foundation/lane/coordinator/sessionProposal/index.js';
import {
    confirmed, makeLaneDir, OPERATOR_SESSION_ID, recorded, removeLaneDir, scenario, type Scenario
} from './support/sessionProposalFixtures.js';

describe('CA-26 durable document — unsupported members fail closed', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('refuses an extra top-level member', function () {
        expect(() => parseSessionProposalDocument(stored(scene, (document) => { document.unexpected = 123; })))
            .toThrowMatching((error: unknown) => error instanceof SessionProposalDocumentError && error.subject === 'document');
    });

    it('refuses an extra member inside the confirmation record', function () {
        expect(() => parseSessionProposalDocument(stored(scene, (document) => {
            (document.confirmation as Record<string, unknown>).grantedAuthority = 'all';
        }))).toThrowMatching((error: unknown) => error instanceof SessionProposalDocumentError
            && error.subject === 'document.confirmation');
    });

    it('refuses an extra member inside the publication record', function () {
        expect(() => parseSessionProposalDocument(stored(scene, (document) => {
            (document.publication as Record<string, unknown>).suppress = true;
        }))).toThrowMatching((error: unknown) => error instanceof SessionProposalDocumentError
            && error.subject === 'document.publication');
    });

    it('refuses an extra member inside the effect record', function () {
        expect(() => parseSessionProposalDocument({
            ...stored(scene, () => undefined),
            effect: {
                idempotencyKey: 'key-1', status: 'applied', effect: 'dispatch-batch',
                recordedAt: '2026-08-06T12:00:00Z', forced: true
            }
        })).toThrowMatching((error: unknown) => error instanceof SessionProposalDocumentError
            && error.subject === 'document.effect');
    });

    it('names every unsupported member it found, so a hand edit is diagnosable', function () {
        try {
            parseSessionProposalDocument(stored(scene, (document) => { document.zeta = 1; document.alpha = 2; }));
            throw new Error('expected a refusal');
        } catch (error) {
            expect(error).toBeInstanceOf(SessionProposalDocumentError);
            expect((error as SessionProposalDocumentError).message).toContain('alpha, zeta');
        }
    });

    it('refuses an unsupported publication status rather than treating it as settled', function () {
        expect(() => parseSessionProposalDocument(stored(scene, (document) => {
            (document.publication as Record<string, unknown>).status = 'skipped';
        }))).toThrowMatching((error: unknown) => error instanceof SessionProposalDocumentError
            && error.subject === 'document.publication.status');
    });

    it('refuses an unsupported publication event rather than publishing an arbitrary type', function () {
        expect(() => parseSessionProposalDocument(stored(scene, (document) => {
            (document.publication as Record<string, unknown>).event = 'operator-session-closed';
        }))).toThrowMatching((error: unknown) => error instanceof SessionProposalDocumentError
            && error.subject === 'document.publication.event');
    });

    it('surfaces an unsupported member through the store as a typed record refusal, not as absence', async function () {
        recorded(scene);
        write(scene, (document) => { document.unexpected = 'value'; });
        const result = await scene.service.apply(scene.applyRequest);
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_RECORD_INVALID'}));
    });

    it('still accepts the exact closed shape this capsule writes', function () {
        confirmed(scene);
        const document = parseSessionProposalDocument(stored(scene, () => undefined));
        expect(document.state).toBe('operator-confirmed');
        expect(document.publication?.status).toBe('published');
    });
});

describe('CA-26 durable document — missing members fail closed (correction CA26-R2-03)', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('refuses a document missing its confirmation member, rather than reading absence as null', function () {
        expect(() => parseSessionProposalDocument(stored(scene, (document) => { delete document.confirmation; })))
            .toThrowMatching((error: unknown) => error instanceof SessionProposalDocumentError && error.subject === 'document.confirmation');
    });

    it('refuses a document missing its effect member', function () {
        expect(() => parseSessionProposalDocument(stored(scene, (document) => { delete document.effect; })))
            .toThrowMatching((error: unknown) => error instanceof SessionProposalDocumentError && error.subject === 'document.effect');
    });

    it('refuses a document missing its publication member', function () {
        expect(() => parseSessionProposalDocument(stored(scene, (document) => { delete document.publication; })))
            .toThrowMatching((error: unknown) => error instanceof SessionProposalDocumentError && error.subject === 'document.publication');
    });

    it('refuses a document missing all three of confirmation/effect/publication at once', function () {
        expect(() => parseSessionProposalDocument(stored(scene, (document) => {
            delete document.confirmation; delete document.effect; delete document.publication;
        }))).toThrowMatching((error: unknown) => error instanceof SessionProposalDocumentError && error.subject === 'document.confirmation');
    });

    it('refuses a publication record missing rejectedBy, reason, or detail, rather than reading absence as null', function () {
        for (const key of ['rejectedBy', 'reason', 'detail']) {
            expect(() => parseSessionProposalDocument(stored(scene, (document) => {
                delete (document.publication as Record<string, unknown>)[key];
            }))).withContext(key).toThrowMatching((error: unknown) => error instanceof SessionProposalDocumentError
                && error.subject === `document.publication.${key}`);
        }
    });

    it('surfaces a missing member through the store as a typed record refusal, not as absence', async function () {
        recorded(scene);
        write(scene, (document) => { delete document.confirmation; });
        const result = await scene.service.apply(scene.applyRequest);
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_RECORD_INVALID'}));
    });
});

/** The confirmed document as stored, with one mutation applied to the raw JSON. */
function stored(scene: Scenario, mutate: (document: Record<string, unknown>) => void): Record<string, unknown> {
    if (scene.store.read(OPERATOR_SESSION_ID, scene.proposalId).kind !== 'document') confirmed(scene);
    const document = JSON.parse(readFileSync(scene.store.path(OPERATOR_SESSION_ID, scene.proposalId), 'utf8')) as Record<string, unknown>;
    mutate(document);
    return document;
}

function write(scene: Scenario, mutate: (document: Record<string, unknown>) => void): void {
    writeFileSync(scene.store.path(OPERATOR_SESSION_ID, scene.proposalId), `${JSON.stringify(stored(scene, mutate))}\n`);
}

describe('CA-26 durable document — impossible lifecycle combinations fail closed (correction CA26-R3-01)', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    /** Exactly the reviewer's probe: a verified effect that carries no effect record. */
    it('refuses effect-verified with no effect record', function () {
        expect(() => parseSessionProposalDocument(stored(scene, (document) => {
            document.state = 'effect-verified';
            document.effect = null;
            document.publication = null;
        }))).toThrowMatching((error: unknown) => error instanceof SessionProposalDocumentError
            && error.subject === 'document.effect');
    });

    it('refuses a confirmed publication on a proposal that claims no confirmation', function () {
        expect(() => parseSessionProposalDocument(proposedDocument(scene, (document) => {
            document.publication = {
                event: 'operator-session-proposal-confirmed', rejectedBy: null,
                reason: null, detail: null, status: 'published'
            };
        }))).toThrowMatching((error: unknown) => error instanceof SessionProposalDocumentError
            && error.subject === 'document.publication');
    });

    it('refuses a confirmation on a proposal still in the proposed state', function () {
        const confirmedDocument = stored(scene, () => undefined);
        expect(() => parseSessionProposalDocument({...confirmedDocument, state: 'proposed'}))
            .toThrowMatching((error: unknown) => error instanceof SessionProposalDocumentError
                && error.subject === 'document.confirmation');
    });

    it('refuses a terminal rejection carrying a confirmed publication event', function () {
        expect(() => parseSessionProposalDocument(stored(scene, (document) => {
            document.state = 'rejected-stale-or-illegal';
        }))).toThrowMatching((error: unknown) => error instanceof SessionProposalDocumentError
            && error.subject === 'document.publication.event');
    });

    it('refuses an operator rejection that also claims an operator confirmation', function () {
        expect(() => parseSessionProposalDocument(stored(scene, (document) => {
            document.state = 'operator-rejected';
            document.publication = {
                event: 'operator-session-proposal-rejected', rejectedBy: 'operator',
                reason: 'operator-rejected', detail: 'no', status: 'published'
            };
        }))).toThrowMatching((error: unknown) => error instanceof SessionProposalDocumentError
            && error.subject === 'document.confirmation');
    });

    it('still accepts every shape this capsule actually writes', async function () {
        confirmed(scene);
        expect(parseSessionProposalDocument(stored(scene, () => undefined)).state).toBe('operator-confirmed');
        await scene.service.apply(scene.applyRequest);
        expect(parseSessionProposalDocument(stored(scene, () => undefined)).state).toBe('effect-verified');
    });
});

/** A freshly recorded `proposed` document, before any confirmation exists. */
function proposedDocument(scene: Scenario, mutate: (document: Record<string, unknown>) => void): Record<string, unknown> {
    const fresh = scenario(scene.laneDir);
    recorded(fresh);
    const document = JSON.parse(readFileSync(fresh.store.path(OPERATOR_SESSION_ID, fresh.proposalId), 'utf8')) as Record<string, unknown>;
    mutate(document);
    return document;
}

describe('CA-26 durable document — publication metadata must agree with its event (correction CA26-R4-01)', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    /** No writer can produce these: a rejection always supplies all three, a confirmation none. */
    for (const member of ['rejectedBy', 'reason', 'detail'] as const) {
        it(`refuses a rejection publication whose ${member} is null`, function () {
            expect(() => parseSessionProposalDocument(rejectedDocument(scene, (publication) => {
                publication[member] = null;
            }))).toThrowMatching((error: unknown) => error instanceof SessionProposalDocumentError
                && error.subject === `document.publication.${member}`);
        });

        it(`refuses a confirmation publication carrying ${member}`, function () {
            expect(() => parseSessionProposalDocument(stored(scene, (document) => {
                (document.publication as Record<string, unknown>)[member] = member === 'rejectedBy' ? 'operator' : 'forged';
            }))).toThrowMatching((error: unknown) => error instanceof SessionProposalDocumentError
                && error.subject === `document.publication.${member}`);
        });
    }

    it('surfaces forged publication metadata through the store as a typed record refusal', async function () {
        recorded(scene);
        scene.service.reject({operatorSessionId: OPERATOR_SESSION_ID, proposalId: scene.proposalId}, 'not now');
        const document = JSON.parse(readFileSync(scene.store.path(OPERATOR_SESSION_ID, scene.proposalId), 'utf8')) as Record<string, unknown>;
        (document.publication as Record<string, unknown>).rejectedBy = null;
        writeFileSync(scene.store.path(OPERATOR_SESSION_ID, scene.proposalId), `${JSON.stringify(document)}\n`);
        const result = await scene.service.apply(scene.applyRequest);
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_RECORD_INVALID'}));
    });

    it('still accepts the rejection and confirmation publications this capsule writes', function () {
        // Separate lane directories: both fixtures use the same proposal id, so sharing
        // one directory would make the second record collide with the first.
        expect(parseSessionProposalDocument(rejectedDocument(scene, () => undefined)).publication?.rejectedBy).toBe('operator');
        const other = makeLaneDir();
        try {
            expect(parseSessionProposalDocument(stored(scenario(other), () => undefined)).publication?.rejectedBy).toBeNull();
        } finally {
            removeLaneDir(other);
        }
    });
});

/** A really-rejected document, with one mutation applied to its publication record. */
function rejectedDocument(scene: Scenario, mutate: (publication: Record<string, unknown>) => void): Record<string, unknown> {
    const fresh = scenario(scene.laneDir);
    recorded(fresh);
    fresh.service.reject({operatorSessionId: OPERATOR_SESSION_ID, proposalId: fresh.proposalId}, 'not now');
    const document = JSON.parse(readFileSync(fresh.store.path(OPERATOR_SESSION_ID, fresh.proposalId), 'utf8')) as Record<string, unknown>;
    mutate(document.publication as Record<string, unknown>);
    return document;
}
