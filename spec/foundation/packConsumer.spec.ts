import {consumePack} from '../../src/foundation/index.js';
import type {PackConsumerResult, PackRejectionReason} from '../../src/contracts/index.js';
import type {PathKind} from '../../src/foundation/index.js';
import {
    PACK_ROOT,
    buildPackFixture,
    deps,
    fakeGit,
    type PackFixture
} from './fixtures/packFixture.js';

const encoder = new TextEncoder();

function reject(result: PackConsumerResult): PackRejectionReason {
    if (result.ok) throw new Error('expected a rejection');
    return result.reason;
}

function serve(fixture: PackFixture, relativePath: string, document: unknown): void {
    fixture.files.set(`${PACK_ROOT}/${relativePath}`, encoder.encode(JSON.stringify(document)));
}

describe('consumePack — valid sealed pack', function () {
    it('accepts a schema-valid, sealed, accepted pack and exposes the sealed view', async function () {
        const fixture = buildPackFixture();
        const result = await consumePack(fixture.context, deps(fixture));
        if (!result.ok) throw new Error(`unexpected rejection ${result.reason}`);
        expect(result.pack.packId).toBe('watchtower-v1');
        expect(result.pack.sealId).toBe(fixture.lock.sealId as string);
        expect(result.pack.sealedFiles.some((file) => file.path === 'implementation-pack.lock.json')).toBe(false);
        expect(result.pack.claimPaths).toEqual([{repository: 'nirvana', path: 'src/**', writable: true}]);
    });
});

describe('consumePack — document, schema, and I/O failures', function () {
    it('fails closed on a missing required document', async function () {
        const fixture = buildPackFixture();
        fixture.entries.splice(fixture.entries.findIndex((entry) => entry.path === 'implementation-roadmap.md'), 1);
        fixture.files.delete(`${PACK_ROOT}/implementation-roadmap.md`);
        expect(reject(await consumePack(fixture.context, deps(fixture)))).toBe('PACK_FILE_MISSING');
    });

    it('maps malformed JSON, duplicate keys, and non-UTF-8 to document-invalid', async function () {
        const malformed = buildPackFixture();
        malformed.files.set(`${PACK_ROOT}/implementation-pack.json`, encoder.encode('{not json'));
        expect(reject(await consumePack(malformed.context, deps(malformed)))).toBe('PACK_DOCUMENT_INVALID');
        const duplicate = buildPackFixture();
        duplicate.files.set(`${PACK_ROOT}/implementation-pack.json`, encoder.encode('{"packId":"a","packId":"b"}'));
        expect(reject(await consumePack(duplicate.context, deps(duplicate)))).toBe('PACK_DOCUMENT_INVALID');
        const nonUtf8 = buildPackFixture();
        nonUtf8.files.set(`${PACK_ROOT}/implementation-pack.json`, new Uint8Array([0xff, 0xfe, 0x00]));
        expect(reject(await consumePack(nonUtf8.context, deps(nonUtf8)))).toBe('PACK_DOCUMENT_INVALID');
    });

    it('maps read and enumeration failures to a typed I/O reason', async function () {
        const unreadable = buildPackFixture();
        const base = deps(unreadable);
        const failingRead = {...base.fs,
            readFile: () => {throw Object.assign(new Error('EACCES'), {code: 'EACCES'});}};
        expect(reject(await consumePack(unreadable.context, {...base, fs: failingRead}))).toBe('PACK_IO_FAILED');
        const noList = buildPackFixture();
        const noListDeps = deps(noList);
        const listFails = {...noListDeps.fs, listEntries: () => {throw new Error('EIO');}};
        expect(reject(await consumePack(noList.context, {...noListDeps, fs: listFails}))).toBe('PACK_IO_FAILED');
    });

    it('rejects schema-invalid manifests including uuid and date-time formats', async function () {
        const badStatus = buildPackFixture({manifest: {status: 'candidate'}});
        expect(reject(await consumePack(badStatus.context, deps(badStatus)))).toBe('PACK_SCHEMA_INVALID');
        const badUuid = buildPackFixture({manifest: {authoredByLaneId: 'not-a-uuid'}});
        expect(reject(await consumePack(badUuid.context, deps(badUuid)))).toBe('PACK_SCHEMA_INVALID');
        const badDate = buildPackFixture({acceptance: {acceptedAt: 'not-a-date'}});
        expect(reject(await consumePack(badDate.context, deps(badDate)))).toBe('PACK_SCHEMA_INVALID');
    });

    it('rejects a manifest without its required author lane identity', async function () {
        const fixture = buildPackFixture();
        const manifest = {...fixture.manifest};
        Reflect.deleteProperty(manifest, 'authoredByLaneId');
        serve(fixture, 'implementation-pack.json', manifest);
        expect(reject(await consumePack(fixture.context, deps(fixture)))).toBe('PACK_SCHEMA_INVALID');
    });
});

describe('consumePack — pack-root authorization before I/O', function () {
    it('authorizes the pack root before reading any document or enumerating', async function () {
        const fixture = buildPackFixture();
        const base = deps(fixture);
        const guardFs = {
            readFile: () => {throw new Error('read occurred before pack-root authorization');},
            listEntries: () => {throw new Error('list occurred before pack-root authorization');},
            authorizeContained: (root: string, path: string, kind: PathKind) =>
                (kind === 'directory' && path !== '.' ? 'unsafe' as const : base.fs.authorizeContained(root, path, kind))
        };
        expect(reject(await consumePack(fixture.context, {...base, fs: guardFs}))).toBe('PACK_PATH_INVALID');
    });

    it('rejects when the pack repository root is not a canonical directory', async function () {
        const fixture = buildPackFixture();
        const base = deps(fixture);
        const fs = {...base.fs,
            authorizeContained: (root: string, path: string, kind: PathKind) =>
                (path === '.' ? 'missing' as const : base.fs.authorizeContained(root, path, kind))};
        expect(reject(await consumePack(fixture.context, {...base, fs}))).toBe('PACK_PATH_INVALID');
    });
});

describe('consumePack — file-set, identity, and seal', function () {
    it('rejects unsafe paths, symlinks, untracked, and ignored sealed files', async function () {
        const traversal = buildPackFixture();
        traversal.entries.push({path: '../escape.md', kind: 'file'});
        traversal.files.set(`${PACK_ROOT}/../escape.md`, encoder.encode('x'));
        expect(reject(await consumePack(traversal.context, deps(traversal)))).toBe('PACK_PATH_INVALID');
        const symlink = buildPackFixture();
        symlink.entries.push({path: 'link.md', kind: 'symlink'});
        expect(reject(await consumePack(symlink.context, deps(symlink)))).toBe('PACK_FILESET_INVALID');
        const untracked = buildPackFixture();
        expect(reject(await consumePack(untracked.context, deps(untracked, fakeGit(untracked, {tracked: (p) => !p.endsWith('B1.md')})))))
            .toBe('PACK_FILESET_INVALID');
    });

    it('rejects packId mismatch, corrupted digests, tampered bytes, and unsorted locks', async function () {
        const identity = buildPackFixture();
        serve(identity, 'implementation-pack.lock.json', {...identity.lock, packId: 'other-pack'});
        expect(reject(await consumePack(identity.context, deps(identity)))).toBe('PACK_IDENTITY_MISMATCH');
        const corruptSeal = buildPackFixture();
        serve(corruptSeal, 'implementation-pack.lock.json', {...corruptSeal.lock, sealId: `sha256:${'0'.repeat(64)}`});
        expect(reject(await consumePack(corruptSeal.context, deps(corruptSeal)))).toBe('PACK_SEAL_MISMATCH');
        const tampered = buildPackFixture();
        tampered.files.set(`${PACK_ROOT}/implementation-tracker.md`, encoder.encode('# tampered\n'));
        expect(reject(await consumePack(tampered.context, deps(tampered)))).toBe('PACK_SEAL_MISMATCH');
        const unsorted = buildPackFixture();
        const reversed = [...(unsorted.lock.files as unknown[])].reverse();
        serve(unsorted, 'implementation-pack.lock.json', {...unsorted.lock, files: reversed});
        expect(reject(await consumePack(unsorted.context, deps(unsorted)))).toBe('PACK_SEAL_MISMATCH');
    });
});

describe('consumePack — repository identity is an exact set', function () {
    it('rejects duplicate manifest repository ids', async function () {
        const duplicate = buildPackFixture({manifest: {repositories: [
            {id: 'nirvana', role: 'primary', access: 'write'},
            {id: 'nirvana', role: 'secondary', access: 'read'}
        ]}});
        expect(reject(await consumePack(duplicate.context, deps(duplicate)))).toBe('PACK_IDENTITY_MISMATCH');
    });

    it('rejects duplicate context repository facts', async function () {
        const fixture = buildPackFixture();
        const ambiguous = {...fixture.context, sources: [fixture.context.sources[0], fixture.context.sources[0]]};
        expect(reject(await consumePack(ambiguous, deps(fixture)))).toBe('PACK_IDENTITY_MISMATCH');
    });

    it('rejects unknown, missing, or unbound repository facts', async function () {
        const fixture = buildPackFixture();
        const unknown = {...fixture.context, sources: [...fixture.context.sources,
            {repository: 'ghost', repositoryRoot: '/ghost', readOnly: false, proofOptional: false}]};
        expect(reject(await consumePack(unknown, deps(fixture)))).toBe('PACK_IDENTITY_MISMATCH');
        const missing = {...fixture.context, sources: []};
        expect(reject(await consumePack(missing, deps(fixture)))).toBe('PACK_IDENTITY_MISMATCH');
        const misbound = {...fixture.context,
            sources: [{repository: 'nirvana', repositoryRoot: '/elsewhere', readOnly: false, proofOptional: false}]};
        expect(reject(await consumePack(misbound, deps(fixture)))).toBe('PACK_IDENTITY_MISMATCH');
    });
});

describe('consumePack — stored references and accepted inputs', function () {
    it('rejects a reference that is not a sealed file', async function () {
        const artifacts = {...(buildPackFixture().manifest.artifacts as Record<string, unknown>), readme: 'missing/readme.md'};
        const rebuilt = buildPackFixture({manifest: {artifacts}});
        expect(reject(await consumePack(rebuilt.context, deps(rebuilt)))).toBe('PACK_PATH_INVALID');
    });

    it('resolves accepted inputs by repository and rejects escaping or unresolved ones', async function () {
        const escaping = buildPackFixture();
        const base = deps(escaping);
        const escapeFs = {...base.fs,
            authorizeContained: (_root: string, _path: string, kind: PathKind) =>
                (kind === 'directory' ? 'ok' as const : 'unsafe' as const)};
        expect(reject(await consumePack(escaping.context, {...base, fs: escapeFs}))).toBe('PACK_PATH_INVALID');
        const unresolved = buildPackFixture({manifest: {acceptedInputs: [{repository: 'external',
            path: 'docs/x.md', sha256: `sha256:${'0'.repeat(64)}`, acceptanceRef: 'docs/x.acceptance.json'}]}});
        expect(reject(await consumePack(unresolved.context, deps(unresolved)))).toBe('PACK_IDENTITY_MISMATCH');
    });
});

describe('consumePack — Git availability at the sealed-file boundary', function () {
    it('rejects unavailable Git tracking or ignore state, never reading it as a negative', async function () {
        const trackingDown = buildPackFixture();
        expect(reject(await consumePack(trackingDown.context, deps(trackingDown, fakeGit(trackingDown, {tracked: () => 'unavailable'})))))
            .toBe('PACK_IO_FAILED');
        const ignoreDown = buildPackFixture();
        expect(reject(await consumePack(ignoreDown.context, deps(ignoreDown, fakeGit(ignoreDown, {ignored: () => 'unavailable'})))))
            .toBe('PACK_IO_FAILED');
    });

    it('accepts a non-ignored (git exit 1) sealed file', async function () {
        const fixture = buildPackFixture();
        expect((await consumePack(fixture.context, deps(fixture, fakeGit(fixture, {ignored: () => false})))).ok).toBe(true);
    });
});
