import {mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {cmd} from '@nirvana/base/terminal';
import {
    consumePack,
    createNodePackFileSystem,
    nodePackFileSystem,
    nodePackGitInspector,
    observePackDrift
} from '../../src/foundation/pack/index.js';
import type {PackConsumerContext, PackConsumerDeps, PackEvidenceInspector, PackStorage} from '../../src/foundation/pack/index.js';
import type {ConsumedPack} from '../../src/contracts/index.js';
import {
    ACCEPTED_INPUT_ACCEPTANCE_REF,
    ACCEPTED_INPUT_PATH,
    ACCEPTED_INPUT_REPOSITORY,
    ACCEPTED_INPUT_SHA256,
    REVIEW_SESSION_ID,
    buildPackFixture,
    fakeEvidence,
    realValidators
} from './fixtures/packFixture.js';

const GIT_IDENTITY = ['-c', 'user.name=watchtower', '-c', 'user.email=watchtower@example.test'];

function git(cwd: string, args: readonly string[]): string {
    return String(cmd.execSync({command: 'git', args: [...args], options: {cwd, stdio: ['ignore', 'pipe', 'ignore']}}));
}

/** Real host evidence: durable sessions plus accepted-review evidence bound to the input. */
const hostEvidence: PackEvidenceInspector = fakeEvidence(undefined, (_root, relativePath) =>
    (relativePath === ACCEPTED_INPUT_ACCEPTANCE_REF
        ? {verdict: 'accept', repository: ACCEPTED_INPUT_REPOSITORY, inputPath: ACCEPTED_INPUT_PATH,
            inputSha256: ACCEPTED_INPUT_SHA256, reviewSessionId: REVIEW_SESSION_ID} : null));

function stubStorage(readSync: PackStorage['readSync']): PackStorage {
    return {readSync, pathExistsSync: () => true, isSymbolicLinkSync: () => false,
        lStatSync: () => ({isDirectory: () => false, isFile: () => true})};
}

function deps(): PackConsumerDeps {
    return {fs: nodePackFileSystem, git: nodePackGitInspector, validators: realValidators(), evidence: hostEvidence};
}

interface RealPack {
    readonly repositoryRoot: string;
    readonly packRoot: string;
    readonly context: PackConsumerContext;
    readonly consumed: ConsumedPack;
}

function write(root: string, absolute: string, prefix: string, bytes: Uint8Array): void {
    const target = absolute.startsWith(`${prefix}/`) ? join(root, absolute.slice(prefix.length + 1)) : null;
    if (target === null) return;
    mkdirSync(dirname(target), {recursive: true});
    writeFileSync(target, bytes);
}

async function stage(): Promise<RealPack> {
    const repositoryRoot = mkdtempSync(join(tmpdir(), 'wt-pack-'));
    git(repositoryRoot, ['init', '--quiet', '--initial-branch=main']);
    git(repositoryRoot, [...GIT_IDENTITY, 'commit', '--allow-empty', '--quiet', '--message=base']);
    const baseline = git(repositoryRoot, ['rev-parse', 'HEAD']).trim();
    const draft = buildPackFixture({manifest: {sourceBaselines: {nirvana: {revision: baseline, dirty: false}}}});
    writeCandidateFiles(repositoryRoot, draft);
    git(repositoryRoot, ['add', '--all']);
    git(repositoryRoot, [...GIT_IDENTITY, 'commit', '--quiet', '--message=candidate']);
    const reviewedCommit = git(repositoryRoot, ['rev-parse', 'HEAD']).trim();
    const fixture = buildPackFixture({manifest: {sourceBaselines: {nirvana: {revision: baseline, dirty: false}}},
        acceptance: {reviewedCommit}});
    writePublication(repositoryRoot, fixture);
    git(repositoryRoot, ['add', '--all']);
    git(repositoryRoot, [...GIT_IDENTITY, 'commit', '--quiet', '--message=publication']);
    const headCommit = git(repositoryRoot, ['rev-parse', 'HEAD']).trim();
    const context = {packRoot: join(repositoryRoot, 'pack'), packRepositoryRoot: repositoryRoot, headCommit,
        sources: [{repository: 'nirvana', repositoryRoot, readOnly: false, proofOptional: false}]};
    const result = await consumePack(context, deps());
    if (!result.ok) throw new Error(`fixture pack unexpectedly rejected: ${result.reason}`);
    return {repositoryRoot, packRoot: context.packRoot, context, consumed: result.pack};
}

function writeCandidateFiles(root: string, fixture: ReturnType<typeof buildPackFixture>): void {
    for (const [absolute, bytes] of fixture.files) {
        if (absolute.endsWith('/pack-acceptance.json') || absolute.endsWith('/implementation-pack.lock.json')) continue;
        write(root, absolute, '/repo', bytes);
    }
}

function writePublication(root: string, fixture: ReturnType<typeof buildPackFixture>): void {
    for (const name of ['pack-acceptance.json', 'implementation-pack.lock.json']) {
        write(root, `/repo/pack/${name}`, '/repo', fixture.files.get(`/repo/pack/${name}`) as Uint8Array);
    }
}

describe('pack consumer host — real Git and filesystem', function () {
    it('consumes a committed pack and reproduces its seal from disk bytes', async function () {
        const pack = await stage();
        try {
            expect(pack.consumed.sealId.startsWith('sha256:')).toBe(true);
            const again = await consumePack(pack.context, deps());
            expect(again.ok && again.pack.sealId).toBe(pack.consumed.sealId);
        } finally {
            rmSync(pack.repositoryRoot, {recursive: true, force: true});
        }
    });

    it('rejects a symlink inside the sealed file set', async function () {
        const pack = await stage();
        try {
            symlinkSync('implementation-map.md', join(pack.packRoot, 'link.md'));
            const result = await consumePack(pack.context, deps());
            expect(result.ok === false && result.reason).toBe('PACK_FILESET_INVALID');
        } finally {
            rmSync(pack.repositoryRoot, {recursive: true, force: true});
        }
    });

    it('classifies real bytes, file-set, accepted-input, and unavailable-baseline drift', async function () {
        const pack = await stage();
        try {
            expect((await observePackDrift(pack.consumed, pack.context, deps())).ok).toBe(true);

            writeFileSync(join(pack.packRoot, 'implementation-tracker.md'), '# edited\n');
            expect((await driftCodes(pack)).includes('PACK_BYTES_CHANGED')).toBe(true);

            writeFileSync(join(pack.packRoot, 'stray.md'), '# stray\n');
            expect((await driftCodes(pack)).includes('PACK_FILESET_CHANGED')).toBe(true);

            writeFileSync(join(pack.repositoryRoot, 'docs/spec/source-input.md'), '# rebased\n');
            expect((await driftCodes(pack)).includes('ACCEPTED_INPUT_CHANGED')).toBe(true);

            // Removing the pack-repository fact is a misbound context: fail closed with zero further I/O.
            const orphan = {...pack.context, sources: []};
            const orphanResult = await observePackDrift(pack.consumed, orphan, deps());
            expect(orphanResult.ok).toBe(false);
            expect(orphanResult.findings.some((finding) => finding.code === 'PACK_FILESET_CHANGED')).toBe(true);
        } finally {
            rmSync(pack.repositoryRoot, {recursive: true, force: true});
        }
    });

    it('distinguishes a real non-ignored result from a genuine Git failure', async function () {
        const repositoryRoot = mkdtempSync(join(tmpdir(), 'wt-git-'));
        git(repositoryRoot, ['init', '--quiet', '--initial-branch=main']);
        writeFileSync(join(repositoryRoot, 'tracked.txt'), 'x');
        git(repositoryRoot, ['add', '--all']);
        git(repositoryRoot, [...GIT_IDENTITY, 'commit', '--quiet', '--message=add']);
        try {
            // Healthy repository: tracked and not ignored (git check-ignore exit 1).
            expect(await nodePackGitInspector.isTracked(repositoryRoot, 'tracked.txt')).toEqual({ok: true, value: true});
            expect(await nodePackGitInspector.isIgnored(repositoryRoot, 'tracked.txt')).toEqual({ok: true, value: false});
            // Corrupt the repository so Git can no longer answer the queries.
            writeFileSync(join(repositoryRoot, '.git', 'config'), 'not a valid git config\n[');
            expect((await nodePackGitInspector.isIgnored(repositoryRoot, 'tracked.txt')).ok).toBe(false);
            expect((await nodePackGitInspector.isTracked(repositoryRoot, 'tracked.txt')).ok).toBe(false);
        } finally {
            rmSync(repositoryRoot, {recursive: true, force: true});
        }
    });
});

async function driftCodes(pack: RealPack): Promise<string[]> {
    return (await observePackDrift(pack.consumed, pack.context, deps())).findings.map((finding) => finding.code);
}

describe('pack consumer host — storage adapter boundary', function () {
    it('fails closed when a storage read returns a non-binary value', function () {
        const fs = createNodePackFileSystem(() => stubStorage(() => 'not-bytes'));
        expect(() => fs.readFile('/repo/implementation-pack.json')).toThrowError(/non-binary/u);
    });

    it('returns validated bytes for a well-typed storage read', function () {
        const fs = createNodePackFileSystem(() => stubStorage(() => new Uint8Array([1, 2, 3])));
        expect([...fs.readFile('/repo/x.json')]).toEqual([1, 2, 3]);
    });

    it('constructs an independent root-scoped storage per operation, with no shared registry', function () {
        const roots: string[] = [];
        const fs = createNodePackFileSystem((root) => {
            roots.push(root);
            return stubStorage(() => new Uint8Array([0]));
        });
        fs.readFile('/a/one.json');
        fs.readFile('/b/two.json');
        expect(roots).toEqual(['/a', '/b']);
    });

    it('fails closed (unsafe) on storage factory, stat, or malformed-output failures', function () {
        const root = mkdtempSync(join(tmpdir(), 'wt-auth-'));
        writeFileSync(join(root, 'f.txt'), 'x');
        try {
            const throwingExists = createNodePackFileSystem(() => ({
                ...stubStorage(() => new Uint8Array()), pathExistsSync: () => {throw new Error('EACCES');}}));
            expect(throwingExists.authorizeContained(root, 'f.txt', 'file')).toBe('unsafe');

            const malformedStat = createNodePackFileSystem(() => ({...stubStorage(() => new Uint8Array()), lStatSync: () => ({})}));
            expect(malformedStat.authorizeContained(root, 'f.txt', 'file')).toBe('unsafe');

            const factoryThrows = createNodePackFileSystem(() => {throw new Error('factory down');});
            expect(factoryThrows.authorizeContained(root, 'f.txt', 'file')).toBe('unsafe');
        } finally {
            rmSync(root, {recursive: true, force: true});
        }
    });

    it('fails closed when any storage predicate returns a non-boolean, for both path kinds', function () {
        const root = mkdtempSync(join(tmpdir(), 'wt-bool-'));
        writeFileSync(join(root, 'f.txt'), 'x');
        mkdirSync(join(root, 'd'));
        const base = stubStorage(() => new Uint8Array());
        try {
            // No assertion casts: PackStorage predicate results are `unknown`, so a
            // malformed adapter may return a non-boolean value directly.
            const nonBoolExists = createNodePackFileSystem(() => ({...base, pathExistsSync: () => 'yes'}));
            expect(nonBoolExists.authorizeContained(root, 'f.txt', 'file')).toBe('unsafe');
            expect(nonBoolExists.authorizeContained(root, 'd', 'directory')).toBe('unsafe');

            const nonBoolSymlink = createNodePackFileSystem(() => ({...base, isSymbolicLinkSync: () => 1}));
            expect(nonBoolSymlink.authorizeContained(root, 'f.txt', 'file')).toBe('unsafe');
            expect(nonBoolSymlink.authorizeContained(root, 'd', 'directory')).toBe('unsafe');

            const nonBoolKind = createNodePackFileSystem(() => ({...base,
                lStatSync: () => ({isDirectory: () => 'nope', isFile: () => 'nope'})}));
            expect(nonBoolKind.authorizeContained(root, 'f.txt', 'file')).toBe('unsafe');
            expect(nonBoolKind.authorizeContained(root, 'd', 'directory')).toBe('unsafe');

            // Valid boolean stat still authorizes each kind.
            const validDir = createNodePackFileSystem(() => ({...base, lStatSync: () => ({isDirectory: () => true, isFile: () => false})}));
            expect(validDir.authorizeContained(root, 'd', 'directory')).toBe('ok');
            expect(nodePackFileSystem.authorizeContained(root, 'f.txt', 'file')).toBe('ok');
        } finally {
            rmSync(root, {recursive: true, force: true});
        }
    });

    it('fails closed when a symlink, lStat, or stat predicate throws, for both path kinds', function () {
        const root = mkdtempSync(join(tmpdir(), 'wt-throw-'));
        writeFileSync(join(root, 'f.txt'), 'x');
        mkdirSync(join(root, 'd'));
        const base = stubStorage(() => new Uint8Array());
        try {
            const throwSymlink = createNodePackFileSystem(() => ({...base, isSymbolicLinkSync: () => {throw new Error('io');}}));
            expect(throwSymlink.authorizeContained(root, 'f.txt', 'file')).toBe('unsafe');
            expect(throwSymlink.authorizeContained(root, 'd', 'directory')).toBe('unsafe');

            const throwLStat = createNodePackFileSystem(() => ({...base, lStatSync: () => {throw new Error('io');}}));
            expect(throwLStat.authorizeContained(root, 'f.txt', 'file')).toBe('unsafe');
            expect(throwLStat.authorizeContained(root, 'd', 'directory')).toBe('unsafe');

            const throwStatPredicate = createNodePackFileSystem(() => ({...base,
                lStatSync: () => ({isDirectory: () => {throw new Error('io');}, isFile: () => {throw new Error('io');}})}));
            expect(throwStatPredicate.authorizeContained(root, 'f.txt', 'file')).toBe('unsafe');
            expect(throwStatPredicate.authorizeContained(root, 'd', 'directory')).toBe('unsafe');
        } finally {
            rmSync(root, {recursive: true, force: true});
        }
    });
});
