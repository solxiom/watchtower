import {makeArgMap} from '@nirvana/base/utils/argUtil';
import {mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {NodeCoordinatorReadFileStore} from '../../src/foundation/lane/coordinator/CoordinatorReadFileStore.js';
import {parseCoordinatorOptions} from '../../src/commands/coordinator/coordinatorCommandOptions.js';
import {parseEventsOptions} from '../../src/commands/events/eventsCommandOptions.js';
import {parseReadySetProjection} from '../../src/foundation/scheduling/index.js';
import {projectEvents} from '../../src/foundation/lane/coordinator/CoordinatorReadService.js';

describe('CA-14 coordinator read contracts', function () {
    it('fails closed on the first malformed JSONL record instead of silently omitting it', function () {
        const root = mkdtempSync(join(tmpdir(), 'wt-ca14-'));
        try {
            mkdirSync(join(root, 'coordinator', 'journal'), {recursive: true});
            writeFileSync(join(root, 'coordinator', 'journal', 'coordinator-events.jsonl'), '{"eventId":"ok"}\nnot-json\n');
            const result = new NodeCoordinatorReadFileStore().readJsonLines(root, 'coordinator/journal/coordinator-events.jsonl');
            expect(result).toEqual({ok: false, reason: 'COORDINATOR_JSONL_INVALID', path: 'coordinator/journal/coordinator-events.jsonl', line: 2});
        } finally { rmSync(root, {recursive: true, force: true}); }
    });

    it('rejects traversal and duplicate/unknown command arguments with stable CLI errors', function () {
        expect(new NodeCoordinatorReadFileStore().path('/tmp/lane', '../outside')).toBeUndefined();
        expect(() => parseCoordinatorOptions(makeArgMap(['coordinator', 'index', 'status', '--bogus']))).toThrowError(/Invalid arguments/);
        expect(() => parseEventsOptions(makeArgMap(['events', 'tail', '--limit=2', '--limit=3']))).toThrowError(/Invalid arguments/);
    });

    it('delegates ready-set projection validation to the scheduling owner', function () {
        const parsed = parseReadySetProjection({pendingBatchIds: ['CA-14'], candidateBatchIds: ['CA-14'], blocked: [], classification: 'unique', populationReason: null});
        expect(parsed.ok).toBeTrue();
        expect(parseReadySetProjection({pendingBatchIds: ['CA-14'], candidateBatchIds: ['CA-14'], blocked: [], classification: 'unique', populationReason: null, unsupported: true})).toEqual({ok: false, reason: 'READY_SET_INVALID'});
        expect(parseReadySetProjection({candidateBatchIds: ['CA-14'], blocked: [], classification: 'unique', populationReason: null})).toEqual({ok: false, reason: 'READY_SET_INVALID'});
    });

    it('projects latest as one event and tail since as a strict event-id cursor', function () {
        const event = (eventId: string, batchId: string) => ({schemaVersion: 1, eventId, type: 'coordinator-cycle-complete', laneId: 'lane', correlationId: eventId, producer: 'test', policyVersion: 'v1', payload: {batchId}});
        const events = [event('e1', 'CA-01'), event('e2', 'CA-01'), event('e3', 'CA-02')];
        expect(projectEvents(events, 'latest', undefined, undefined, 50) as unknown).toEqual({items: [events[2]], hasMore: false, cursor: 'e3'});
        expect(projectEvents(events, 'latest', 'CA-01', undefined, 50) as unknown).toEqual({items: [events[1]], hasMore: false, cursor: 'e2'});
        expect(projectEvents(events, 'tail', undefined, 'e1', 50) as unknown).toEqual({items: [events[1], events[2]], hasMore: false, cursor: 'e3'});
        expect(projectEvents(events, 'tail', undefined, 'missing', 50) as unknown).toEqual({ok: false, reason: 'COORDINATOR_CURSOR_INVALID', path: 'missing'});
    });

    it('rejects symlink escape and validates malformed JSONL before the bounded suffix', function () {
        const root = mkdtempSync(join(tmpdir(), 'wt-ca14-')); const outside = mkdtempSync(join(tmpdir(), 'wt-ca14-outside-'));
        try {
            mkdirSync(join(root, 'coordinator', 'journal'), {recursive: true});
            writeFileSync(join(outside, 'events.jsonl'), '{}\n');
            rmSync(join(root, 'coordinator'), {recursive: true, force: true}); symlinkSync(outside, join(root, 'coordinator'));
            expect(new NodeCoordinatorReadFileStore().path(root, 'coordinator/events.jsonl')).toBeUndefined();
        } finally { rmSync(root, {recursive: true, force: true}); rmSync(outside, {recursive: true, force: true}); }

        const prefixRoot = mkdtempSync(join(tmpdir(), 'wt-ca14-prefix-'));
        try {
            mkdirSync(join(prefixRoot, 'coordinator', 'journal'), {recursive: true});
            const records = ['malformed', ...Array.from({length: 205}, (_, index) => JSON.stringify({eventId: `e${index}`}))].join('\n');
            writeFileSync(join(prefixRoot, 'coordinator', 'journal', 'coordinator-events.jsonl'), records);
            expect(new NodeCoordinatorReadFileStore().readJsonLines(prefixRoot, 'coordinator/journal/coordinator-events.jsonl')).toEqual({ok: false, reason: 'COORDINATOR_JSONL_INVALID', path: 'coordinator/journal/coordinator-events.jsonl', line: 1});
        } finally { rmSync(prefixRoot, {recursive: true, force: true}); }
    });
});
