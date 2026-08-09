/**
 * CA-27 `ScopedHoldService` proof: durable place/release/list, no-implicit-
 * global-hold refusal, and the "impact-scoped expiry/interleaving" property —
 * proven against the *real*, already-accepted CA-09 `checkClaimConflict`/
 * `checkPrecondition` rather than re-implemented assertions, so this proof
 * cannot silently drift from what the validator actually enforces.
 */
import {ScopedHoldError} from '../../../src/foundation/lane/coordinator/hold/holdContracts.js';
import {checkClaimConflict, checkPrecondition} from '../../../src/foundation/proposal/proposalPreconditions.js';
import {baseContext, typedProposalFor, fixtureFor} from '../proposal/support/proposalFixtures.js';
import {LANE_ID, countingHoldIds, files, makeLaneDir, removeLaneDir, serviceFor} from './support/holdFixtures.js';

function reasonOf(error: unknown): string | undefined {
    return (error as {reason?: string}).reason;
}

describe('CA-27 ScopedHoldService', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('places a hold and lists it back', () => {
        const service = serviceFor(laneDir);
        const record = service.place({scope: ['B1'], reason: 'safety', expiresAt: '2026-08-08T01:00:00.000Z'}, 'operator');
        expect(record.holdId).toBe('hold-1');
        expect(service.list()).toEqual([record]);
        expect(service.activeHolds()).toEqual([{holdId: 'hold-1', scope: ['B1'], status: 'active'}]);
    });

    it('refuses an empty scope as an implicit global hold', () => {
        const service = serviceFor(laneDir);
        expect(() => service.place({scope: [], reason: 'safety', expiresAt: '2026-08-08T01:00:00.000Z'}, 'operator'))
            .toThrowMatching((error: Error) => reasonOf(error) === 'HOLD_SCOPE_EMPTY');
    });

    it('refuses a blank-only scope after trimming as an implicit global hold', () => {
        const service = serviceFor(laneDir);
        expect(() => service.place({scope: ['   '], reason: 'safety', expiresAt: '2026-08-08T01:00:00.000Z'}, 'operator'))
            .toThrowMatching((error: Error) => reasonOf(error) === 'HOLD_SCOPE_EMPTY');
    });

    it('refuses a duplicate scope entry rather than silently deduping it (correction CA27-04)', () => {
        const service = serviceFor(laneDir);
        expect(() => service.place({scope: ['B1', 'B1'], reason: 'safety', expiresAt: '2026-08-08T01:00:00.000Z'}, 'operator'))
            .toThrowMatching((error: Error) => reasonOf(error) === 'HOLD_SCOPE_INVALID');
        expect(service.list()).toEqual([]);
    });

    it('refuses a scope mixing a real target with a blank entry rather than trimming it away (correction CA27-04)', () => {
        const service = serviceFor(laneDir);
        expect(() => service.place({scope: ['B1', ''], reason: 'safety', expiresAt: '2026-08-08T01:00:00.000Z'}, 'operator'))
            .toThrowMatching((error: Error) => reasonOf(error) === 'HOLD_SCOPE_INVALID');
        expect(service.list()).toEqual([]);
    });

    it('refuses a scope mixing a real target with a whitespace-only entry rather than trimming it away (correction CA27-04)', () => {
        const service = serviceFor(laneDir);
        expect(() => service.place({scope: ['B1', '   '], reason: 'safety', expiresAt: '2026-08-08T01:00:00.000Z'}, 'operator'))
            .toThrowMatching((error: Error) => reasonOf(error) === 'HOLD_SCOPE_INVALID');
        expect(service.list()).toEqual([]);
    });

    it('stores a valid scope byte-for-byte, with no trimming or reordering (correction CA27-04)', () => {
        const service = serviceFor(laneDir);
        const record = service.place({scope: ['B2', 'B1'], reason: 'safety', expiresAt: '2026-08-08T01:00:00.000Z'}, 'operator');
        expect(record.scope).toEqual(['B2', 'B1']);
    });

    it('refuses an empty reason', () => {
        const service = serviceFor(laneDir);
        expect(() => service.place({scope: ['B1'], reason: '  ', expiresAt: '2026-08-08T01:00:00.000Z'}, 'operator'))
            .toThrowMatching((error: Error) => reasonOf(error) === 'HOLD_REASON_REQUIRED');
    });

    it('refuses an expiry that is not strictly in the future', () => {
        const service = serviceFor(laneDir);
        expect(() => service.place({scope: ['B1'], reason: 'safety', expiresAt: '2026-08-08T00:00:00.000Z'}, 'operator'))
            .toThrowMatching((error: Error) => reasonOf(error) === 'HOLD_EXPIRY_INVALID');
        expect(() => service.place({scope: ['B1'], reason: 'safety', expiresAt: 'not-a-date'}, 'operator'))
            .toThrowMatching((error: Error) => reasonOf(error) === 'HOLD_EXPIRY_INVALID');
    });

    it('releases an active hold, and refuses releasing an unknown one', () => {
        const service = serviceFor(laneDir);
        const record = service.place({scope: ['B1'], reason: 'safety', expiresAt: '2026-08-08T01:00:00.000Z'}, 'operator');
        service.release({holdId: record.holdId});
        expect(service.list()).toEqual([]);
        expect(() => service.release({holdId: record.holdId}))
            .toThrowMatching((error: Error) => reasonOf(error) === 'HOLD_NOT_FOUND');
        expect(() => service.release({holdId: 'never-existed'}))
            .toThrowMatching((error: Error) => reasonOf(error) === 'HOLD_NOT_FOUND');
    });

    it('prunes an expired hold from list()/activeHolds() without a caller sweep', () => {
        const ids = countingHoldIds();
        const placing = serviceFor(laneDir, '2026-08-08T00:00:00.000Z', ids);
        placing.place({scope: ['B1'], reason: 'safety', expiresAt: '2026-08-08T00:30:00.000Z'}, 'operator');
        const laterService = serviceFor(laneDir, '2026-08-08T01:00:00.000Z', ids);
        expect(laterService.list()).toEqual([]);
        expect(laterService.activeHolds()).toEqual([]);
    });

    it('impact-scoped interleaving: a hold on B1 blocks B1 but never affects unrelated B2', () => {
        const service = serviceFor(laneDir);
        service.place({scope: ['B1'], reason: 'safety', expiresAt: '2026-08-08T01:00:00.000Z'}, 'operator');
        const context = baseContext({now: '2026-08-08T00:00:00.000Z', activeHolds: service.activeHolds()});

        const heldFixture = fixtureFor('select-ready-batch');
        const heldConflict = checkClaimConflict(typedProposalFor(heldFixture), context);
        expect(heldConflict?.code).toBe('PROPOSAL_CLAIM_CONFLICT');

        const unrelatedProposal = typedProposalFor({...heldFixture, body: {batchId: 'B2'}});
        expect(checkClaimConflict(unrelatedProposal, context)).toBeNull();
    });

    it('impact-scoped expiry: the same claim conflict clears once the hold is pruned', () => {
        const ids = countingHoldIds();
        const placing = serviceFor(laneDir, '2026-08-08T00:00:00.000Z', ids);
        placing.place({scope: ['B1'], reason: 'safety', expiresAt: '2026-08-08T00:30:00.000Z'}, 'operator');

        const stillActive = baseContext({now: '2026-08-08T00:00:00.000Z', activeHolds: placing.activeHolds()});
        expect(checkClaimConflict(typedProposalFor(fixtureFor('select-ready-batch')), stillActive)?.code).toBe('PROPOSAL_CLAIM_CONFLICT');

        const laterService = serviceFor(laneDir, '2026-08-08T01:00:00.000Z', ids);
        const expired = baseContext({now: '2026-08-08T01:00:00.000Z', activeHolds: laterService.activeHolds()});
        expect(checkClaimConflict(typedProposalFor(fixtureFor('select-ready-batch')), expired)).toBeNull();
    });

    it('feeds the CA-09 place-hold/release-hold preconditions from the same durable projection', () => {
        const service = serviceFor(laneDir);
        const record = service.place({scope: ['B1'], reason: 'safety', expiresAt: '2026-08-08T01:00:00.000Z'}, 'operator');

        const releaseContext = baseContext({now: '2026-08-08T00:00:00.000Z', activeHolds: service.activeHolds()});
        const releaseProposal = typedProposalFor({...fixtureFor('release-hold'), body: {holdId: record.holdId}});
        expect(checkPrecondition(releaseProposal, releaseContext)).toBeNull();

        const unknownReleaseProposal = typedProposalFor({...fixtureFor('release-hold'), body: {holdId: 'nope'}});
        expect(checkPrecondition(unknownReleaseProposal, releaseContext)?.code).toBe('PROPOSAL_PRECONDITION_FAILED');
    });

    it('is durable across service instances over the same lane directory', () => {
        const first = serviceFor(laneDir);
        const record = first.place({scope: ['B1'], reason: 'safety', expiresAt: '2026-08-08T01:00:00.000Z'}, 'operator');
        const second = serviceFor(laneDir, undefined, countingHoldIds('other'));
        expect(second.list()).toEqual([record]);
    });

    it('surfaces a corrupt holds projection as a typed refusal rather than silently restarting empty', () => {
        const service = serviceFor(laneDir);
        files.ensureDirectory(`${laneDir}/coordinator/holds`);
        files.writeAtomic(`${laneDir}/coordinator/holds/holds.json`, '{not json');
        expect(() => service.list()).toThrowMatching((error: Error) => error instanceof ScopedHoldError && reasonOf(error) === 'HOLD_STATE_UNREADABLE');
    });

    function validHoldRecord(overrides: Record<string, unknown> = {}) {
        return {
            holdId: 'hold-1', scope: ['B1'], reason: 'safety', origin: 'operator',
            createdAt: '2026-08-08T00:00:00.000Z', expiresAt: '2026-08-08T01:00:00.000Z', ...overrides
        };
    }

    function writeRawHolds(record: Record<string, unknown>): void {
        files.ensureDirectory(`${laneDir}/coordinator/holds`);
        files.writeAtomic(`${laneDir}/coordinator/holds/holds.json`,
            `${JSON.stringify({schemaVersion: 1, laneId: LANE_ID, holds: [record], projectionRevision: 0})}\n`);
    }

    function expectRejectedHold(record: Record<string, unknown>): void {
        writeRawHolds(record);
        expect(() => serviceFor(laneDir).list())
            .toThrowMatching((error: Error) => error instanceof ScopedHoldError && reasonOf(error) === 'HOLD_STATE_UNREADABLE');
    }

    it('rejects a persisted hold record with an origin outside the closed ProposalOrigin vocabulary (CA27-01)', () => {
        expectRejectedHold(validHoldRecord({origin: 'not-a-real-origin'}));
    });

    it('rejects a persisted hold record with a non-RFC-3339 expiry/createdAt timestamp (CA27-01)', () => {
        expectRejectedHold(validHoldRecord({expiresAt: '2026/08/08 01:00'}));
        expectRejectedHold(validHoldRecord({createdAt: 'not-a-date'}));
    });

    it('rejects a persisted hold record with a blank or duplicated scope entry (CA27-01)', () => {
        expectRejectedHold(validHoldRecord({scope: ['B1', '']}));
        expectRejectedHold(validHoldRecord({scope: ['B1', 'B1']}));
        expectRejectedHold(validHoldRecord({scope: []}));
    });

    it('rejects a persisted hold record carrying an unrecognized member (CA27-01)', () => {
        expectRejectedHold(validHoldRecord({unexpectedField: 'x'}));
    });

    it('rejects a persisted hold record missing a required member (CA27-01)', () => {
        const {reason: _omit, ...withoutReason} = validHoldRecord();
        expectRejectedHold(withoutReason);
    });

    it('rejects a holds projection whose declared laneId does not match the requested lane (CA27-01)', () => {
        files.ensureDirectory(`${laneDir}/coordinator/holds`);
        files.writeAtomic(`${laneDir}/coordinator/holds/holds.json`,
            `${JSON.stringify({schemaVersion: 1, laneId: 'a-different-lane', holds: [], projectionRevision: 0})}\n`);
        expect(() => serviceFor(laneDir).list())
            .toThrowMatching((error: Error) => error instanceof ScopedHoldError && reasonOf(error) === 'HOLD_STATE_UNREADABLE');
    });

    it('rejects a holds projection with a negative or fractional projection revision (CA27-01)', () => {
        files.ensureDirectory(`${laneDir}/coordinator/holds`);
        files.writeAtomic(`${laneDir}/coordinator/holds/holds.json`,
            `${JSON.stringify({schemaVersion: 1, laneId: LANE_ID, holds: [], projectionRevision: -1})}\n`);
        expect(() => serviceFor(laneDir).list())
            .toThrowMatching((error: Error) => error instanceof ScopedHoldError && reasonOf(error) === 'HOLD_STATE_UNREADABLE');
    });
});
