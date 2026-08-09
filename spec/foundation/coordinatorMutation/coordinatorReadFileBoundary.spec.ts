/**
 * The shared coordinator JSON read boundary refuses a document that repeats an
 * object member name (CA-25 correction-02).
 *
 * `JSON.parse` accepts a repeated name and keeps the last value, so bytes that
 * claim two things would read as one. Every coordinator projection reads
 * through this store, so the fence belongs here rather than in each schema.
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {
    hasDuplicateMembers
} from '../../../src/foundation/lane/coordinator/coordinatorReadContracts.js';
import {
    NodeCoordinatorReadFileStore
} from '../../../src/foundation/lane/coordinator/CoordinatorReadFileStore.js';
import {makeLaneDir, removeLaneDir} from './support/mutationFixtures.js';

describe('coordinator JSON read boundary duplicate-member fence (CA-25)', () => {
    let laneDir: string;
    const store = new NodeCoordinatorReadFileStore();

    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    function write(name: string, text: string): string {
        mkdirSync(join(laneDir, 'coordinator'), {recursive: true});
        writeFileSync(join(laneDir, 'coordinator', name), text, 'utf8');
        return `coordinator/${name}`;
    }

    it('accepts documents whose member names are unique at every depth', () => {
        expect(hasDuplicateMembers('{"a": 1, "b": {"a": 2}, "c": [{"a": 3}, {"a": 4}]}')).toBeFalse();
        // A value that merely looks like a member, and a name repeated only
        // inside a string, are not duplicates.
        expect(hasDuplicateMembers('{"a": "b\\": 1, \\"b", "b": 2}')).toBeFalse();
        expect(hasDuplicateMembers('[{"a": 1}, {"a": 2}]')).toBeFalse();
    });

    it('detects a repeated name at the top level, nested, and inside an array element', () => {
        expect(hasDuplicateMembers('{"a": 1, "a": 2}')).toBeTrue();
        expect(hasDuplicateMembers('{"outer": {"a": 1, "a": 2}}')).toBeTrue();
        expect(hasDuplicateMembers('{"items": [{"a": 1}, {"b": 2, "b": 3}]}')).toBeTrue();
        // Escapes decode to the same name, so the document still says it twice.
        expect(hasDuplicateMembers('{"a": 1, "\\u0061": 2}')).toBeTrue();
    });

    it('reports a repeated member as the typed JSON failure, whatever the values are', () => {
        const distinct = write('distinct.json', '{"schemaVersion": 1, "status": "held", "status": "closed"}');
        expect(store.readJson(laneDir, distinct)).toEqual({
            ok: false, reason: 'COORDINATOR_JSON_INVALID', path: distinct
        });
        const identical = write('identical.json', '{"schemaVersion": 1, "status": "held", "status": "held"}');
        expect(store.readJson(laneDir, identical)).toEqual({
            ok: false, reason: 'COORDINATOR_JSON_INVALID', path: identical
        });
    });

    it('reports the offending line when a durable event repeats a member', () => {
        const path = write('events.jsonl', '{"a": 1}\n{"a": 2, "a": 3}\n');
        expect(store.readJsonLines(laneDir, path)).toEqual({
            ok: false, reason: 'COORDINATOR_JSONL_INVALID', path, line: 2
        });
    });

    it('still reads a well-formed document unchanged', () => {
        const path = write('clean.json', '{"schemaVersion": 1, "status": "held", "nested": {"status": "held"}}');
        const read = store.readJson(laneDir, path);
        expect(read.ok).toBeTrue();
        expect(read.ok ? (read.value as unknown) : null)
            .toEqual({schemaVersion: 1, status: 'held', nested: {status: 'held'}});
    });
});
