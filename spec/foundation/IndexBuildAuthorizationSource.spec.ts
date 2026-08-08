import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DurableIndexBuildAuthorizationSource} from '../../src/foundation/index/assembly/IndexBuildAuthorizationSource.js';
import {baseContext} from './proposal/support/proposalFixtures.js';

function capsule(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    const context = baseContext({operatorSession: {sessionId: 'op-1', role: 'operator', confirmedProposalIds: new Set(['default-index-proposal'])}});
    const proposal = {schemaVersion: 1, cycleId: 'default-index-cycle', proposalId: 'default-index-proposal', type: 'propose-reconciliation',
        snapshotDigest: context.laneState.snapshotDigest, expiresAt: '2099-01-01T00:00:00.000Z', evidenceRefs: ['finding:F1'],
        body: {projectionId: context.laneId, plan: 'rebuild-index'}, requestedEffects: [{effect: 'rebuild-index'}]};
    return {schemaVersion: 1, proposal, currentState: {...context, operatorSession: {sessionId: 'op-1', role: 'operator', confirmedProposalIds: ['default-index-proposal']}, journalState: {completedIdempotencyKeys: []}, packAuthorSessionId: null}, ...overrides};
}

function writeCapsule(laneDir: string, value: unknown): void {
    mkdirSync(join(laneDir, 'coordinator', 'index'), {recursive: true});
    writeFileSync(join(laneDir, 'coordinator', 'index', 'index-build-authorization.json'), `${JSON.stringify(value)}\n`);
}

describe('default index-build authorization composition', () => {
    it('loads a typed proposal and rereads authoritative state for lock-time revalidation', () => {
        const laneDir = mkdtempSync(join(tmpdir(), 'wt-ca30-auth-'));
        try {
            writeCapsule(laneDir, capsule());
            const source = new DurableIndexBuildAuthorizationSource();
            const authorization = source.read(laneDir);
            expect((authorization.proposal as {type: string}).type).toBe('propose-reconciliation');
            expect(authorization.currentState.laneId).toBe('lane-1');
            writeCapsule(laneDir, capsule({currentState: {...(capsule().currentState as Record<string, unknown>), now: '2099-01-01T00:00:00.000Z', journalState: {completedIdempotencyKeys: []}}}));
            expect(authorization.revalidate().state.now).toBe('2099-01-01T00:00:00.000Z');
        } finally { rmSync(laneDir, {recursive: true, force: true}); }
    });

    it('fails closed for default/malformed/stale/unaccepted/unconfirmed capsules', () => {
        const laneDir = mkdtempSync(join(tmpdir(), 'wt-ca30-auth-'));
        try {
            const source = new DurableIndexBuildAuthorizationSource();
            const cases = [
                ['default missing', undefined, true],
                ['malformed', {proposal: null, currentState: {}}, true],
                ['stale', capsule({proposal: {...capsule().proposal as Record<string, unknown>, snapshotDigest: 'sha256:stale'}}), true],
                ['unaccepted', capsule({currentState: {...(capsule().currentState as Record<string, unknown>), predecessorEvidence: {}}}), true],
                ['unconfirmed', capsule({currentState: {...(capsule().currentState as Record<string, unknown>), operatorSession: {sessionId: 'op-1', role: 'operator', confirmedProposalIds: []}}}), false]
            ] as const;
            for (const [label, value, rejectsAtCapsuleBoundary] of cases) {
                if (value === undefined) {
                    expect(() => source.read(laneDir)).withContext(label).toThrow();
                } else {
                    writeCapsule(laneDir, value);
                    if (rejectsAtCapsuleBoundary) expect(() => source.read(laneDir)).withContext(label).toThrow();
                    else expect(() => source.read(laneDir)).withContext(label).not.toThrow();
                }
            }
        } finally { rmSync(laneDir, {recursive: true, force: true}); }
    });
});
