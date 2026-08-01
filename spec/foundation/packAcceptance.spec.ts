import {consumePack} from '../../src/foundation/index.js';
import type {PackConsumerResult, PackRejectionReason} from '../../src/contracts/index.js';
import type {PackSessionIdentity, PathKind} from '../../src/foundation/index.js';
import {
    ACCEPTED_INPUT_PATH,
    ACCEPTED_INPUT_REPOSITORY,
    ACCEPTED_INPUT_SHA256,
    HEAD_COMMIT,
    REVIEWED_COMMIT,
    REVIEWER_LANE_ID,
    REVIEW_SESSION_ID,
    buildPackFixture,
    deps,
    fakeEvidence,
    fakeGit,
    packReviewEvents,
    type PackFixture
} from './fixtures/packFixture.js';
import type {PackAcceptanceEvidence} from '../../src/foundation/index.js';

function reject(result: PackConsumerResult): PackRejectionReason {
    if (result.ok) throw new Error('expected a rejection');
    return result.reason;
}

function consume(fixture: PackFixture, git = fakeGit(fixture), evidence = fakeEvidence()): Promise<PackConsumerResult> {
    return consumePack(fixture.context, deps(fixture, git, evidence));
}

describe('consumePack — §3.3 acceptance and independence', function () {
    it('requires a review reference for a superseded critical finding and rejects a mismatched accepted digest', async function () {
        const missingReference = buildPackFixture({acceptance: {
            findings: [{id: 'F-1', severity: 'critical', disposition: 'superseded'}]
        }});
        expect(reject(await consume(missingReference))).toBe('PACK_SCHEMA_INVALID');
        const superseded = buildPackFixture({acceptance: {findings: [{
            id: 'F-1', severity: 'critical', disposition: 'superseded', acceptedReviewRef: 'accepted-review-event'
        }]}});
        expect((await consume(superseded)).ok).toBe(true);
        const wrong = buildPackFixture({acceptance: {acceptedManifestDigest: `sha256:${'0'.repeat(64)}`}});
        expect(reject(await consume(wrong))).toBe('PACK_ACCEPTANCE_INVALID');
    });

    it('requires reviewedCommit to be a strict ancestor with an available candidate tree', async function () {
        const fixture = buildPackFixture();
        expect(reject(await consume(fixture, fakeGit(fixture, {ancestor: () => false})))).toBe('PACK_ACCEPTANCE_INVALID');
        expect(reject(await consume(fixture, fakeGit(fixture, {ancestor: () => true})))).toBe('PACK_ACCEPTANCE_INVALID');
        expect(reject(await consume(fixture, fakeGit(fixture, {treeFiles: () => null})))).toBe('PACK_ACCEPTANCE_INVALID');
    });

    it('binds the reviewed candidate file set, byte identity, and entry type', async function () {
        const fixture = buildPackFixture();
        const extra = fakeGit(fixture, {treeFiles: () => [...fixture.candidatePaths.map((path) => ({path, symlink: false})),
            {path: 'pack/extra.md', symlink: false}]});
        expect(reject(await consume(fixture, extra))).toBe('PACK_ACCEPTANCE_INVALID');
        const missing = fakeGit(fixture, {treeFiles: () => fixture.candidatePaths.slice(1).map((path) => ({path, symlink: false}))});
        expect(reject(await consume(fixture, missing))).toBe('PACK_ACCEPTANCE_INVALID');
        const symlink = fakeGit(fixture, {treeFiles: () => fixture.candidatePaths.map((path, index) =>
            ({path, symlink: index === 0}))});
        expect(reject(await consume(fixture, symlink))).toBe('PACK_ACCEPTANCE_INVALID');
        const changed = fakeGit(fixture, {blobId: (ref, path) =>
            (ref !== HEAD_COMMIT && path === fixture.candidatePaths[0] ? 'reviewed-oid' : `oid-${path}`)});
        expect(reject(await consume(fixture, changed))).toBe('PACK_ACCEPTANCE_INVALID');
    });

    it('fails closed when a reviewed or HEAD candidate blob is unavailable', async function () {
        const fixture = buildPackFixture();
        const bothNull = fakeGit(fixture, {blobId: () => null});
        expect(reject(await consume(fixture, bothNull))).toBe('PACK_ACCEPTANCE_INVALID');
        const reviewedNull = fakeGit(fixture, {blobId: (ref, path) => (ref === REVIEWED_COMMIT ? null : `oid-${path}`)});
        expect(reject(await consume(fixture, reviewedNull))).toBe('PACK_ACCEPTANCE_INVALID');
        const headNull = fakeGit(fixture, {blobId: (ref, path) => (ref === HEAD_COMMIT ? null : `oid-${path}`)});
        expect(reject(await consume(fixture, headNull))).toBe('PACK_ACCEPTANCE_INVALID');
    });

    it('rejects when accepted-evidence Git state is unavailable', async function () {
        const fixture = buildPackFixture();
        const ignoreDown = fakeGit(fixture, {ignored: (path) => (path.endsWith('.acceptance.json') ? 'unavailable' : false)});
        expect(reject(await consume(fixture, ignoreDown))).toBe('PACK_IO_FAILED');
        const committedDown = fakeGit(fixture, {committedMatches: () => 'unavailable'});
        expect(reject(await consume(fixture, committedDown))).toBe('PACK_IO_FAILED');
    });

    it('rejects when either strict-ancestry query is unavailable', async function () {
        const fixture = buildPackFixture();
        const forwardDown = fakeGit(fixture, {ancestor: (a, b) => (a === REVIEWED_COMMIT && b === HEAD_COMMIT ? 'unavailable' : false)});
        expect(reject(await consume(fixture, forwardDown))).toBe('PACK_ACCEPTANCE_INVALID');
        const reverseDown = fakeGit(fixture, {ancestor: (a, b) =>
            (a === HEAD_COMMIT && b === REVIEWED_COMMIT ? 'unavailable' : a === REVIEWED_COMMIT && b === HEAD_COMMIT)});
        expect(reject(await consume(fixture, reverseDown))).toBe('PACK_ACCEPTANCE_INVALID');
    });

    it('maps accepted-input evidence/session and review-journal failures to a typed I/O result', async function () {
        const fixture = buildPackFixture();
        const bound: PackAcceptanceEvidence = {verdict: 'accept', repository: ACCEPTED_INPUT_REPOSITORY,
            inputPath: ACCEPTED_INPUT_PATH, inputSha256: ACCEPTED_INPUT_SHA256, reviewSessionId: REVIEW_SESSION_ID};
        const reviewer = (sessionId: string): PackSessionIdentity => ({sessionId, laneId: REVIEWER_LANE_ID, role: 'reviewer'});

        // The accepted-input evidence store throws.
        expect(reject(await consume(fixture, fakeGit(fixture),
            fakeEvidence(undefined, () => {throw new Error('evidence store down');})))).toBe('PACK_IO_FAILED');

        // The evidence record's own review session store throws.
        const evidenceSession = {...bound, reviewSessionId: 'evidence-review'};
        const throwEvidenceSession = (id: string): PackSessionIdentity => {
            if (id === 'evidence-review') throw new Error('session store down');
            return reviewer(id);
        };
        expect(reject(await consume(fixture, fakeGit(fixture),
            fakeEvidence(throwEvidenceSession, () => evidenceSession)))).toBe('PACK_IO_FAILED');

        // The current-main pack-review journal store throws after accepted-input evidence passes.
        expect(reject(await consume(fixture, fakeGit(fixture),
            fakeEvidence(reviewer, () => bound, () => {throw new Error('review journal down');})))).toBe('PACK_IO_FAILED');
    });

    it('validates accepted-input and acceptanceRef evidence under Git identity', async function () {
        const fixture = buildPackFixture();
        const untrackedInput = fakeGit(fixture, {tracked: (path) => !path.includes('source-input')});
        expect(reject(await consume(fixture, untrackedInput))).toBe('PACK_FILESET_INVALID');
        const ignoredEvidence = fakeGit(fixture, {ignored: (path) => path.endsWith('.acceptance.json')});
        expect(reject(await consume(fixture, ignoredEvidence))).toBe('PACK_FILESET_INVALID');
        const uncommittedEvidence = fakeGit(fixture, {committedMatches: (path) => !path.endsWith('.acceptance.json')});
        expect(reject(await consume(fixture, uncommittedEvidence))).toBe('PACK_ACCEPTANCE_INVALID');
    });

    it('rejects accepted evidence that is missing or escapes its declared root', async function () {
        const fixture = buildPackFixture();
        const base = deps(fixture);
        const missingFs = {...base.fs,
            authorizeContained: (root: string, path: string, kind: PathKind) =>
                (kind === 'file' && path.includes('source-input') ? 'missing' as const
                    : base.fs.authorizeContained(root, path, kind))};
        expect(reject(await consumePack(fixture.context, {...base, fs: missingFs}))).toBe('PACK_FILE_MISSING');
    });

    it('binds accepted-review evidence to the exact input and a resolved reviewer session', async function () {
        const fixture = buildPackFixture();
        const bound: PackAcceptanceEvidence = {verdict: 'accept', repository: ACCEPTED_INPUT_REPOSITORY,
            inputPath: ACCEPTED_INPUT_PATH, inputSha256: ACCEPTED_INPUT_SHA256, reviewSessionId: REVIEW_SESSION_ID};

        // No record, or a non-accept verdict.
        expect(reject(await consume(fixture, fakeGit(fixture), fakeEvidence(undefined, () => null)))).toBe('PACK_ACCEPTANCE_INVALID');
        expect(reject(await consume(fixture, fakeGit(fixture),
            fakeEvidence(undefined, () => ({...bound, verdict: 'reject'}))))).toBe('PACK_ACCEPTANCE_INVALID');

        // A reused acceptanceRef whose record binds a different input path or digest.
        expect(reject(await consume(fixture, fakeGit(fixture),
            fakeEvidence(undefined, () => ({...bound, inputPath: 'docs/spec/other.md'}))))).toBe('PACK_ACCEPTANCE_INVALID');
        expect(reject(await consume(fixture, fakeGit(fixture),
            fakeEvidence(undefined, () => ({...bound, inputSha256: `sha256:${'0'.repeat(64)}`}))))).toBe('PACK_ACCEPTANCE_INVALID');
        expect(reject(await consume(fixture, fakeGit(fixture),
            fakeEvidence(undefined, () => ({...bound, repository: 'other'}))))).toBe('PACK_ACCEPTANCE_INVALID');

        // Evidence resolvable only under a different repository root.
        expect(reject(await consume(fixture, fakeGit(fixture),
            fakeEvidence(undefined, (root) => (root === '/elsewhere' ? bound : null))))).toBe('PACK_ACCEPTANCE_INVALID');

        // The record's review session is missing, unbound, or not a reviewer.
        expect(reject(await consume(fixture, fakeGit(fixture),
            fakeEvidence(() => null, () => bound)))).toBe('PACK_ACCEPTANCE_INVALID');
        expect(reject(await consume(fixture, fakeGit(fixture),
            fakeEvidence(() => ({sessionId: 'other-session', laneId: REVIEWER_LANE_ID, role: 'reviewer'}), () => bound))))
            .toBe('PACK_ACCEPTANCE_INVALID');
        expect(reject(await consume(fixture, fakeGit(fixture),
            fakeEvidence(() => ({sessionId: REVIEW_SESSION_ID, laneId: REVIEWER_LANE_ID, role: 'author'}), () => bound))))
            .toBe('PACK_ACCEPTANCE_INVALID');
    });

    it('enforces the current-main causal review chain and reviewer/pack-author independence', async function () {
        const fixture = buildPackFixture();
        expect((await consume(fixture)).ok).toBe(true);
        expect(reject(await consume(fixture, fakeGit(fixture),
            fakeEvidence(undefined, undefined, () => null)))).toBe('PACK_ACCEPTANCE_INVALID');

        const [author, primary, superseding] = packReviewEvents();
        const sameSession = [{...author, payload: {...author.payload, session: REVIEW_SESSION_ID}}, primary, superseding];
        const brokenCause = [author, {...primary, causationId: 'different-author'}, superseding];
        const duplicateAuthor = [author, {...author, eventId: 'second-author'}, primary, superseding];
        for (const events of [sameSession, brokenCause, duplicateAuthor]) {
            expect(reject(await consume(fixture, fakeGit(fixture),
                fakeEvidence(undefined, undefined, () => events)))).toBe('PACK_ACCEPTANCE_INVALID');
        }
    });
});
