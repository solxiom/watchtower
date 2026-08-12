/**
 * LC-11 correction 01, F-04 — the init-time evidence persistence boundary.
 *
 * Every repository byte the evidence host reads must cross LC-02's injected
 * `PackFileSystem` port (the commons `Storage`-backed adapter), never
 * `node:fs`, and every external document must enter as `unknown` and be
 * narrowed by predicates rather than cast. These specs drive the host with a
 * recording double so both properties are observable: the port is the only
 * read path, containment is asked before any read, and anything that is not
 * exactly the closed evidence contract fails closed.
 */
import {createInitPackEvidenceInspector} from '../../src/foundation/lane/init/index.js';
import type {PackEntry, PackFileSystem, PathAuthorization, PathKind} from '../../src/foundation/pack/index.js';

const ROOT = '/repo';
const REFERENCE = 'docs/spec/input.acceptance.json';
const VALID = {
    verdict: 'accept', repository: 'nirvana', inputPath: 'docs/spec/input.md',
    inputSha256: `sha256:${'a'.repeat(64)}`, reviewSessionId: 'session-review-1'
};

interface RecordingFileSystem extends PackFileSystem {
    readonly authorized: string[];
    readonly read: string[];
}

describe('init pack evidence host — persistence boundary', function () {
    it('asks containment first and reads only through the injected port', function () {
        const fs = recordingFileSystem(encode(JSON.stringify(VALID)));

        const evidence = inspector(fs).resolveAcceptanceEvidence(ROOT, REFERENCE);

        expect(evidence).toEqual(VALID);
        expect(fs.authorized).toEqual([`${ROOT}::${REFERENCE}::file`]);
        expect(fs.read).toEqual([`${ROOT}/${REFERENCE}`]);
    });

    it('never reads bytes when the port refuses containment', function () {
        const fs = recordingFileSystem(encode(JSON.stringify(VALID)), 'unsafe');

        expect(inspector(fs).resolveAcceptanceEvidence(ROOT, REFERENCE)).toBeNull();
        expect(fs.read).toEqual([]);
    });

    it('fails closed on a missing document without throwing', function () {
        const fs = recordingFileSystem(null);

        expect(inspector(fs).resolveAcceptanceEvidence(ROOT, REFERENCE)).toBeNull();
    });

    for (const scenario of [
        {name: 'a non-object document', bytes: encode('"accept"')},
        {name: 'an array document', bytes: encode('[]')},
        {name: 'malformed JSON', bytes: encode('{')},
        {name: 'invalid UTF-8', bytes: Uint8Array.from([0xff, 0xfe, 0xfd])},
        {name: 'a non-string verdict', bytes: encode(JSON.stringify({...VALID, verdict: 1}))},
        {name: 'an empty reviewSessionId', bytes: encode(JSON.stringify({...VALID, reviewSessionId: ''}))},
        {name: 'a missing inputSha256', bytes: encode(JSON.stringify({...VALID, inputSha256: undefined}))},
        {name: 'an oversized document', bytes: encode(`{"verdict":"${'a'.repeat(300 * 1024)}"}`)}
    ]) {
        it(`rejects ${scenario.name}`, function () {
            expect(inspector(recordingFileSystem(scenario.bytes)).resolveAcceptanceEvidence(ROOT, REFERENCE)).toBeNull();
        });
    }
});

function inspector(fs: PackFileSystem) {
    return createInitPackEvidenceInspector({controlHome: '/absent-control-home', dataHome: '/absent-data-home', fs});
}

function encode(text: string): Uint8Array {
    return new TextEncoder().encode(text);
}

/** A `PackFileSystem` double that records every boundary call and serves one document. */
function recordingFileSystem(bytes: Uint8Array | null, authorization: PathAuthorization = 'ok'): RecordingFileSystem {
    const authorized: string[] = [];
    const read: string[] = [];
    return {
        authorized, read,
        authorizeContained(root: string, relativePath: string, kind: PathKind): PathAuthorization {
            authorized.push(`${root}::${relativePath}::${kind}`);
            return bytes === null ? 'missing' : authorization;
        },
        readFile(absolutePath: string): Uint8Array {
            read.push(absolutePath);
            if (bytes === null) throw Object.assign(new Error('ENOENT'), {code: 'ENOENT'});
            return bytes;
        },
        listEntries(): readonly PackEntry[] {
            return [];
        }
    };
}
