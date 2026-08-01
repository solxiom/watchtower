import {latest, parseJsonlStream} from '../../src/foundation/JsonlParser.js';
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

function jsonl(...records: WorkerEventRecord[]): string {
    return `${records.map(record => JSON.stringify(record)).join('\n')}\n`;
}

describe('parseJsonlStream', function () {
    it('parses every permitted role-event combination and optional commits', function () {
        const records = [
            event('handoff', 'implementer', 1), event('blocked', 'implementer', 2),
            {...event('accept', 'reviewer', 3), payload: {...event('accept', 'reviewer', 3).payload, commits: {watchtower: 'abc123'}}},
            event('reject', 'reviewer', 4), event('blocked', 'reviewer', 5)
        ];
        const result = parseJsonlStream(jsonl(...records));
        expect(result.records).toEqual(records);
        expect(result.warnings).toEqual([]);
    });

    it('accepts schema-valid producer and policy strings plus additional properties', function () {
        const record = {
            ...event('handoff', 'implementer'), producer: 'worker/account 1', policyVersion: 'policy/v1 beta',
            laneId: '9d0ee3d2-8833-7fb7-b112-8438f04f57d2', extension: {longValue: 'x'.repeat(256)}
        };
        expect(parseJsonlStream(jsonl(record))).toEqual({records: [record], warnings: []});
    });

    it('preserves role-incompatible records with line-numbered warnings', function () {
        const result = parseJsonlStream(jsonl(event('accept', 'implementer'), event('handoff', 'reviewer', 1)));
        expect(result.records).toHaveSize(2);
        expect(result.warnings).toEqual([
            {line: 1, reason: 'implementer cannot emit accept'},
            {line: 2, reason: 'reviewer cannot emit handoff'}
        ]);
    });

    it('skips malformed lines without dropping adjacent valid records', function () {
        const result = parseJsonlStream(`${JSON.stringify(event('handoff', 'implementer'))}\nnot json\n{broken\n{'event': 'handoff'}\n${JSON.stringify(event('accept', 'reviewer', 1))}\n`);
        expect(result.records.map(record => record.eventId)).toEqual(['event:0', 'event:1']);
        expect(result.warnings).toEqual([
            {line: 2, reason: 'malformed JSON'}, {line: 3, reason: 'malformed JSON'}, {line: 4, reason: 'malformed JSON'}
        ]);
    });

    it('rejects duplicate envelope, payload, and commits members with diagnostics', function () {
        const committed = {...event('accept', 'reviewer', 2), payload: {...event('accept', 'reviewer', 2).payload, commits: {watchtower: 'abc'}}};
        const duplicateEnvelope = JSON.stringify(event('handoff', 'implementer')).replace('"sequence":0', '"sequence":99,"sequence":0');
        const duplicatePayload = JSON.stringify(event('blocked', 'implementer', 1)).replace('"role":"implementer"', '"role":"reviewer","role":"implementer"');
        const duplicateCommit = JSON.stringify(committed).replace('"watchtower":"abc"', '"watchtower":"first","watchtower":"abc"');
        const first = JSON.stringify(event('handoff', 'implementer', 10));
        const last = JSON.stringify(event('accept', 'reviewer', 11));
        const result = parseJsonlStream(`${first}\n${duplicateEnvelope}\n${duplicatePayload}\n${duplicateCommit}\n${last}\n`);
        expect(result.records.map(record => record.sequence)).toEqual([10, 11]);
        expect(result.warnings).toEqual([
            {line: 2, reason: 'duplicate JSON member: sequence'}, {line: 3, reason: 'duplicate JSON member: role'},
            {line: 4, reason: 'duplicate JSON member: watchtower'}
        ]);
    });

    it('classifies a duplicate-containing incomplete final line as tail corruption', function () {
        const first = JSON.stringify(event('handoff', 'implementer', 10));
        const truncated = '{"sequence":1,"sequence":';
        const result = parseJsonlStream(`${first}\n${truncated}`);
        expect(result.records.map(record => record.sequence)).toEqual([10]);
        expect(result.warnings).toEqual([{line: 2, reason: 'partial final line corruption'}]);
    });

    it('reports schema failures and partial final-line corruption', function () {
        const incomplete = JSON.stringify(event('handoff', 'implementer')).slice(0, -1);
        const wrongType = {...event('accept', 'reviewer', 1), sequence: 'one'};
        const {eventId: ignoredEventId, ...missingField} = event('handoff', 'implementer', 2);
        const result = parseJsonlStream(`${JSON.stringify(wrongType)}\n${JSON.stringify(missingField)}\n${incomplete}`);
        expect(result.records).toEqual([]);
        expect(result.warnings[0]).toEqual({line: 1, reason: 'sequence must be a non-negative integer'});
        expect(result.warnings[1]).toEqual({line: 2, reason: 'eventId must be a valid ID'});
        expect(result.warnings[2]).toEqual({line: 3, reason: 'partial final line corruption'});
    });

    it('allows an empty final line and preserves unknown event types with a warning', function () {
        const unknown = event('unknown-event', 'reviewer');
        const result = parseJsonlStream(`${JSON.stringify(unknown)}\n\n`);
        expect(result.records).toEqual([unknown]);
        expect(result.warnings).toEqual([{line: 1, reason: 'unknown event type: unknown-event'}]);
    });

    it('handles empty and malformed-only streams', function () {
        expect(parseJsonlStream('')).toEqual({records: [], warnings: []});
        const result = parseJsonlStream('nope\n{bad}\n');
        expect(result.records).toEqual([]);
        expect(result.warnings).toEqual([{line: 1, reason: 'malformed JSON'}, {line: 2, reason: 'malformed JSON'}]);
    });

    it('rejects each required envelope and payload field when absent or the wrong scalar type', function () {
        const required = ['schemaVersion', 'eventId', 'type', 'sequence', 'at', 'laneId', 'producer', 'correlationId', 'causationId', 'policyVersion', 'payload'];
        const missing = required.map(field => {
            const source = event('handoff', 'implementer');
            delete (source as Record<string, unknown>)[field];
            return JSON.stringify(source);
        });
        const invalidPayload = {...event('handoff', 'implementer'), payload: {role: 'implementer', batch: [], session: 1}};
        const result = parseJsonlStream(`${missing.join('\n')}\n${JSON.stringify(invalidPayload)}\n`);
        expect(result.records).toEqual([]);
        expect(result.warnings).toHaveSize(required.length + 1);
        expect(result.warnings.every(warning => warning.line >= 1)).toBeTrue();
    });

    it('accepts a complete final record without a newline', function () {
        const record = event('handoff', 'implementer');
        expect(parseJsonlStream(JSON.stringify(record))).toEqual({records: [record], warnings: []});
    });
});

describe('latest', function () {
    it('returns the requested bounded durable-sequence window across timestamp skew', function () {
        const records = Array.from({length: 150}, (_, index) => ({
            ...event('handoff', 'implementer', index),
            at: new Date(Date.UTC(2026, 7, 1, 0, 0, 149 - index)).toISOString()
        }));
        expect(latest(records, 'implementer', 10).map(record => record.eventId)).toEqual([
            'event:149', 'event:148', 'event:147', 'event:146', 'event:145', 'event:144', 'event:143', 'event:142', 'event:141', 'event:140'
        ]);
        expect(latest(records, 'implementer', 100)).toHaveSize(100);
        expect(latest(records, 'reviewer', 10)).toEqual([]);
    });

    it('orders equal timestamps by sequence and rejects invalid bounds deterministically', function () {
        const first = {...event('handoff', 'implementer', 1), at: '2026-08-01T00:00:00Z'};
        const second = {...event('blocked', 'implementer', 2), at: '2026-08-01T00:00:00Z'};
        const reviewer = event('accept', 'reviewer', 3);
        expect(latest([first, reviewer, second], 'implementer', 2)).toEqual([second, first]);
        expect(latest([first], 'implementer', -1)).toEqual([]);
        expect(latest([first], 'implementer', 0)).toEqual([]);
        expect(latest([first], 'implementer', 1.5)).toEqual([]);
        expect(latest([first], 'implementer', Number.NaN)).toEqual([]);
        expect(latest([first], 'implementer', Number.POSITIVE_INFINITY)).toEqual([]);
    });
});
