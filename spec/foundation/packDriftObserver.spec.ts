import {fileDigest, gitUnavailable, gitValue, observePackDrift} from '../../src/foundation/index.js';
import type {
    PackConsumerContext,
    PackConsumerDeps,
    PackFileSystem,
    PackGitInspector,
    PathKind
} from '../../src/foundation/index.js';
import type {ConsumedPack, Sha256Digest} from '../../src/contracts/index.js';
import {fakeEvidence, realValidators} from './fixtures/packFixture.js';

const encoder = new TextEncoder();
const inputBytes = encoder.encode('# secondary input\n');
const inputDigest = fileDigest(inputBytes);

function pack(digest: Sha256Digest): ConsumedPack {
    return {
        packId: 'p', initiativeId: 'i', packRepository: 'first',
        manifestDigest: 'sha256:x' as Sha256Digest, acceptanceDigest: 'sha256:y' as Sha256Digest,
        sealId: 'sha256:z' as Sha256Digest, reviewedCommit: 'abc1234', repositories: ['first', 'second'],
        sealedFiles: [], acceptedInputs: [{repository: 'second', path: 'docs/x.md', sha256: digest, acceptanceRef: 'r.acceptance.json'}],
        sourceBaselines: [], claimPaths: []
    };
}

const context: PackConsumerContext = {
    packRoot: '/first/pack', packRepositoryRoot: '/first', headCommit: 'head',
    sources: [{repository: 'first', repositoryRoot: '/first', readOnly: false, proofOptional: false},
        {repository: 'second', repositoryRoot: '/second', readOnly: false, proofOptional: false}]
};

function authorize(root: string, path: string, kind: PathKind): 'ok' | 'unsafe' | 'missing' {
    if (kind === 'directory' && root === '/first' && (path === '.' || path === 'pack')) return 'ok';
    return root === '/second' && path === 'docs/x.md' ? 'ok' : 'unsafe';
}

const fs: PackFileSystem = {
    readFile: (absolutePath) => {
        if (absolutePath === '/second/docs/x.md') return inputBytes;
        throw Object.assign(new Error('ENOENT'), {code: 'ENOENT'});
    },
    listEntries: () => [],
    authorizeContained: authorize
};

const git: PackGitInspector = {
    isTracked: () => Promise.resolve(gitValue(true)), isIgnored: () => Promise.resolve(gitValue(false)),
    committedMatches: () => Promise.resolve(gitValue(true)), isAncestor: () => Promise.resolve(gitValue(true)),
    changedPathsSince: () => Promise.resolve([]), treeFiles: () => Promise.resolve([]), blobId: () => Promise.resolve('oid')
};

function deps(overrideFs: PackFileSystem = fs): PackConsumerDeps {
    return {fs: overrideFs, git, validators: realValidators(), evidence: fakeEvidence()};
}

describe('observePackDrift — multi-repository accepted inputs (F-02)', function () {
    it('resolves a clean secondary-repository input by its declared repository', async function () {
        const result = await observePackDrift(pack(inputDigest), context, deps());
        expect(result.findings.some((finding) => finding.code === 'ACCEPTED_INPUT_CHANGED')).toBe(false);
        expect(result.ok).toBe(true);
    });

    it('flags a changed secondary-repository input', async function () {
        const result = await observePackDrift(pack(fileDigest(encoder.encode('different'))), context, deps());
        expect(result.findings.some((finding) => finding.code === 'ACCEPTED_INPUT_CHANGED')).toBe(true);
    });
});

describe('observePackDrift — pack-root authorization before I/O', function () {
    it('fails closed with zero list/read when the pack root is unauthorized', async function () {
        let listed = 0;
        let read = 0;
        const guardFs: PackFileSystem = {
            readFile: () => {read += 1; throw new Error('read before authorization');},
            listEntries: () => {listed += 1; return [];},
            // Escaped/case/symlinked root: pack-root directory authorization fails.
            authorizeContained: (root, path, kind) => (kind === 'directory' && path !== '.' ? 'unsafe' : authorize(root, path, kind))
        };
        const result = await observePackDrift(pack(inputDigest), context, deps(guardFs));
        expect(result.ok).toBe(false);
        expect(result.findings[0].code).toBe('PACK_FILESET_CHANGED');
        expect(listed).toBe(0);
        expect(read).toBe(0);
    });

    it('fails closed when pack-root enumeration is denied after authorization', async function () {
        const enumFails: PackFileSystem = {...fs, listEntries: () => {throw new Error('EIO');}};
        const result = await observePackDrift(pack(inputDigest), context, deps(enumFails));
        expect(result.ok).toBe(false);
        expect(result.findings.some((finding) => finding.code === 'PACK_FILESET_CHANGED')).toBe(true);
    });
});

describe('observePackDrift — ambiguous or stale repository facts', function () {
    function trap(): {deps: PackConsumerDeps; calls: () => number} {
        let calls = 0;
        const trapFs: PackFileSystem = {
            readFile: () => {calls += 1; throw new Error('read');},
            listEntries: () => {calls += 1; return [];},
            authorizeContained: () => {calls += 1; return 'ok';}
        };
        return {deps: {fs: trapFs, git, validators: realValidators(), evidence: fakeEvidence()}, calls: () => calls};
    }

    it('rejects a duplicate fact whose first root is wrong, with zero I/O', async function () {
        const t = trap();
        const dup = {...context, sources: [
            {repository: 'first', repositoryRoot: '/wrong', readOnly: false, proofOptional: false},
            {repository: 'first', repositoryRoot: '/first', readOnly: false, proofOptional: false},
            {repository: 'second', repositoryRoot: '/second', readOnly: false, proofOptional: false}]};
        const result = await observePackDrift(pack(inputDigest), dup, t.deps);
        expect(result.ok).toBe(false);
        expect(result.findings[0].code).toBe('PACK_FILESET_CHANGED');
        expect(t.calls()).toBe(0);
    });

    it('rejects an unknown context fact, with zero I/O', async function () {
        const t = trap();
        const unknown = {...context, sources: [...context.sources,
            {repository: 'ghost', repositoryRoot: '/ghost', readOnly: false, proofOptional: false}]};
        const result = await observePackDrift(pack(inputDigest), unknown, t.deps);
        expect(result.ok).toBe(false);
        expect(t.calls()).toBe(0);
    });

    it('rejects a misbound pack-repository fact, with zero I/O', async function () {
        const t = trap();
        const misbound = {...context, sources: [
            {repository: 'first', repositoryRoot: '/elsewhere', readOnly: false, proofOptional: false},
            {repository: 'second', repositoryRoot: '/second', readOnly: false, proofOptional: false}]};
        const result = await observePackDrift(pack(inputDigest), misbound, t.deps);
        expect(result.ok).toBe(false);
        expect(t.calls()).toBe(0);
    });

    it('preserves the unavailable-baseline classification for a genuinely absent secondary fact', async function () {
        const unavailablePack: ConsumedPack = {...pack(inputDigest),
            sourceBaselines: [{repository: 'second', revision: 'b'.repeat(40), dirty: false}], acceptedInputs: []};
        const onlyFirst = {...context, sources: [context.sources[0]]};
        const result = await observePackDrift(unavailablePack, onlyFirst, deps());
        expect(result.findings.some((finding) => finding.code === 'SOURCE_BASELINE_UNAVAILABLE')).toBe(true);
    });

    it('fails closed (never clean) when a sealed-file Git query is unavailable', async function () {
        const sealedPack: ConsumedPack = {...pack(inputDigest), acceptedInputs: [],
            sealedFiles: [{path: 'a.md', sha256: fileDigest(encoder.encode('a')), bytes: 1}]};
        const unavailableGit: PackGitInspector = {...git, isIgnored: () => Promise.resolve(gitUnavailable())};
        const result = await observePackDrift(sealedPack, context,
            {fs, git: unavailableGit, validators: realValidators(), evidence: fakeEvidence()});
        expect(result.ok).toBe(false);
        expect(result.findings.some((finding) => finding.code === 'PACK_FILESET_CHANGED')).toBe(true);
    });
});
