import Ajv2020 from 'ajv/dist/2020.js';
import type {ValidateFunction} from 'ajv';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {baseContext} from './proposal/support/proposalFixtures.js';

function validCapsule(): Record<string, unknown> {
    const context = baseContext({operatorSession: {sessionId: 'op-1', role: 'operator', confirmedProposalIds: new Set(['schema-proposal'])}});
    return {schemaVersion: 1,
        proposal: {schemaVersion: 1, cycleId: 'schema-cycle', proposalId: 'schema-proposal', type: 'propose-reconciliation', snapshotDigest: context.laneState.snapshotDigest, expiresAt: '2099-01-01T00:00:00.000Z', evidenceRefs: ['finding:F1'], body: {projectionId: context.laneId, plan: 'rebuild-index'}, requestedEffects: [{effect: 'rebuild-index'}]},
        currentState: {...context, operatorSession: {sessionId: 'op-1', role: 'operator', confirmedProposalIds: ['schema-proposal']}, journalState: {completedIdempotencyKeys: []}, packAuthorSessionId: null}};
}

function validator(): ValidateFunction {
    const schema = JSON.parse(readFileSync(join(process.cwd(), 'docs/spec/schemas/index-build-authorization-capsule.schema.json'), 'utf8')) as object;
    const ajv = new Ajv2020({allErrors: true, strict: false});
    return ajv.compile(schema);
}

describe('CA-30 versioned authorization capsule schema', () => {
    it('accepts the normalized production capsule shape', () => {
        const validate = validator();
        expect(validate(validCapsule())).withContext(JSON.stringify(validate.errors)).toBeTrue();
    });

    it('rejects malformed nested payloads and unsupported members', () => {
        const validate = validator();
        const base = validCapsule();
        const proposal = base.proposal as Record<string, unknown>;
        const malformed = [
            {schemaVersion: 1, proposal: null, currentState: 42},
            {...validCapsule(), proposal: {}},
            {...validCapsule(), currentState: {...validCapsule().currentState as Record<string, unknown>, extra: true}},
            {...validCapsule(), currentState: {...validCapsule().currentState as Record<string, unknown>, journalState: {completedIdempotencyKeys: ['ok', 7]}}},
            {...validCapsule(), currentState: {...validCapsule().currentState as Record<string, unknown>, envelope: {...(validCapsule().currentState as Record<string, unknown>).envelope as Record<string, unknown>, unsupported: true}}},
            {...validCapsule(), proposal: {...(validCapsule().proposal as Record<string, unknown>), body: {...((validCapsule().proposal as Record<string, unknown>).body as Record<string, unknown>), extra: true}}},
            {...validCapsule(), proposal: {...(validCapsule().proposal as Record<string, unknown>), body: {projectionId: 'lane'}}},
            {...validCapsule(), proposal: {...(validCapsule().proposal as Record<string, unknown>), type: 'propose-reconciliation', body: {batchId: 'B1'}}},
            {...validCapsule(), proposal: {...(validCapsule().proposal as Record<string, unknown>), requestedEffects: [{effect: 'rebuild-index', extra: true}]}},
            {...base, proposal: {...proposal, type: 'escalate', body: {reason: 'blocked'}}},
            {...base, proposal: {...proposal, type: 'escalate', body: {reason: 'blocked', profile: 'operator', extra: true}}}
        ];
        for (const value of malformed) expect(validate(value)).withContext(JSON.stringify(value)).toBeFalse();
        expect(validate({...base, proposal: {...proposal, type: 'escalate', body: {reason: 'blocked', profile: 'operator'}}})).toBeTrue();
    });
});
