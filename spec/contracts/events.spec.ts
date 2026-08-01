import {roleEventCompatibility, validateEventCompatibility} from '../../src/contracts/events.js';
import type {WorkerEventRecord} from '../../src/contracts/events.js';

function event(type: string, role: 'implementer' | 'reviewer', sequence = 0): WorkerEventRecord {
    return {
        schemaVersion: 1,
        eventId: `event:${sequence}`,
        type,
        sequence,
        at: `2026-08-01T00:00:${String(sequence % 60).padStart(2, '0')}Z`,
        laneId: '9d0ee3d2-8833-4fb7-b112-8438f04f57d2',
        producer: `worker:${role}`,
        correlationId: 'cycle:1',
        causationId: null,
        policyVersion: 'v1',
        payload: {role, batch: 'RM-05', session: `session:${role}`}
    };
}

describe('worker-event contracts', function () {
    it('declares the complete compatibility matrix', function () {
        expect(roleEventCompatibility.implementer).toEqual(['handoff', 'blocked']);
        expect(roleEventCompatibility.reviewer).toEqual(['accept', 'reject', 'blocked']);
    });

    it('returns warnings only for known incompatible role-event pairs', function () {
        expect(validateEventCompatibility(event('accept', 'implementer'))).toEqual(['implementer cannot emit accept']);
        expect(validateEventCompatibility(event('handoff', 'reviewer'))).toEqual(['reviewer cannot emit handoff']);
        expect(validateEventCompatibility(event('unknown-event', 'reviewer'))).toEqual([]);
    });

    it('covers every role and known event pairing', function () {
        const expected = new Map<string, string[]>([
            ['implementer:handoff', []], ['implementer:blocked', []],
            ['implementer:accept', ['implementer cannot emit accept']], ['implementer:reject', ['implementer cannot emit reject']],
            ['reviewer:handoff', ['reviewer cannot emit handoff']], ['reviewer:blocked', []],
            ['reviewer:accept', []], ['reviewer:reject', []]
        ]);
        for (const [key, warnings] of expected) {
            const [role, type] = key.split(':') as ['implementer' | 'reviewer', string];
            expect(validateEventCompatibility(event(type, role))).toEqual(warnings);
        }
    });
});
