import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {cmd} from '@nirvana/base/terminal';
import {readRepositoryBindings} from '../../src/foundation/index.js';
import type {RepositoryBindingInspector} from '../../src/foundation/index.js';

const repository = {id: 'main', role: 'primary', access: 'write'} as const;

describe('repository bindings', function () {
    it('canonicalizes and validates branch, dedicated default, and write access', function () {
        const root = fixture();
        const source = join(root, 'source');
        mkdirSync(source);
        const path = writeBindings(root, [{...binding(source), worktreeMode: undefined}]);
        const result = readRepositoryBindings(path, [repository], inspector(source, 'feature/main'));
        expect(result).toEqual([{...repository, path: source, branch: 'feature/main', worktreeMode: 'dedicated'}]);
        const readRepository = {id: 'main', role: 'primary', access: 'read'} as const;
        expect(readRepositoryBindings(writeBindings(root, [{...binding(source), access: 'read'}]), [readRepository],
            inspector(source, 'feature/main', true, false))[0].worktreeMode).toBe('shared');
        remove(root);
    });

    it('rejects mismatched and detached Git HEAD values', function () {
        const root = fixture();
        const source = join(root, 'source');
        mkdirSync(source);
        const path = writeBindings(root, [binding(source)]);
        try {
            expectCode(() => readRepositoryBindings(path, [repository], inspector(source, 'other')), 'ERR_PREFLIGHT_FAILED');
            expectCode(() => readRepositoryBindings(path, [repository], inspector(source, undefined)), 'ERR_PREFLIGHT_FAILED');
        } finally { remove(root); }
    });

    it('uses the real Git adapter and requires the canonical checkout root', function () {
        const root = fixture();
        const repositoryRoot = join(root, 'repository');
        const subdirectory = join(repositoryRoot, 'src');
        const nonGit = join(root, 'ordinary');
        mkdirSync(subdirectory, {recursive: true});
        mkdirSync(nonGit);
        cmd.execSync({command: 'git', args: ['init', '--quiet', '--initial-branch=feature/main'], options: {cwd: repositoryRoot, stdio: 'ignore'}});
        cmd.execSync({command: 'git', args: ['-c', 'user.name=watchtower', '-c', 'user.email=watchtower@example.test',
            'commit', '--allow-empty', '--quiet', '--message=initial'], options: {cwd: repositoryRoot, stdio: 'ignore'}});
        try {
            const expected = [{id: 'main', role: 'primary', access: 'write'}] as const;
            expect(readRepositoryBindings(writeBindings(root, [binding(repositoryRoot)]), expected)).toEqual([jasmine.objectContaining({path: repositoryRoot})]);
            expectCode(() => readRepositoryBindings(writeBindings(root, [binding(subdirectory)]), expected), 'ERR_PREFLIGHT_FAILED');
            expectCode(() => readRepositoryBindings(writeBindings(root, [binding(nonGit)]), expected), 'ERR_PREFLIGHT_FAILED');
            expectCode(() => readRepositoryBindings(writeBindings(root, [{...binding(repositoryRoot), branch: 'other'}]), expected), 'ERR_PREFLIGHT_FAILED');
            cmd.execSync({command: 'git', args: ['checkout', '--detach'], options: {cwd: repositoryRoot, stdio: 'ignore'}});
            expectCode(() => readRepositoryBindings(writeBindings(root, [binding(repositoryRoot)]), expected), 'ERR_PREFLIGHT_FAILED');
        } finally { remove(root); }
    });

    it('fails closed for malformed, duplicate, extra, and noncanonical bindings without writes', function () {
        const root = fixture();
        const source = join(root, 'source');
        mkdirSync(source);
        const path = writeBindings(root, [binding(source)]);
        try {
            for (const text of ['{', '{"schemaVersion":1,"repositories":[],"extra":true}',
                '{"schemaVersion":1,"repositories":[],"repositories":[]}']) {
                writeFileSync(path, text);
                const before = readFileSync(path, 'hex');
                expectCode(() => readRepositoryBindings(path, [repository], inspector(source, 'feature/main')), 'ERR_INVALID_LANE_CONFIG');
                expect(readFileSync(path, 'hex')).toBe(before);
            }
            writeFileSync(path, JSON.stringify({schemaVersion: 1, repositories: [{...binding(source), path: `${source}/`}]}));
            expectCode(() => readRepositoryBindings(path, [repository], {...inspector(source, 'feature/main'),
                canonicalize: value => value.endsWith('/') ? value.slice(0, -1) : value}), 'ERR_INVALID_LANE_CONFIG');
        } finally { remove(root); }
    });

    it('rejects missing, unsupported, duplicate-ID, and duplicate-path binding values', function () {
        const root = fixture();
        const source = join(root, 'source');
        const second = join(root, 'second');
        mkdirSync(source); mkdirSync(second);
        try {
            const invalid = [
                {schemaVersion: 2, repositories: [binding(source)]},
                {schemaVersion: 1, repositories: [{...binding(source), branch: undefined}]},
                {schemaVersion: 1, repositories: [{...binding(source), worktreeMode: 'unknown'}]},
                {schemaVersion: 1, repositories: [binding(source), {...binding(second), id: 'main'}]},
                {schemaVersion: 1, repositories: [binding(source), {...binding(source), id: 'other', role: 'other'}]}
            ];
            for (const value of invalid) {
                const path = writeBindings(root, value.repositories);
                if (value.schemaVersion !== 1) writeFileSync(path, JSON.stringify(value));
                expectCode(() => readRepositoryBindings(path, [repository], inspector(source, 'feature/main')), 'ERR_INVALID_LANE_CONFIG');
            }
        } finally { remove(root); }
    });

    it('reports missing or inaccessible repositories as preflight errors instead of null bindings', function () {
        const root = fixture();
        const source = join(root, 'source');
        mkdirSync(source);
        const path = writeBindings(root, [binding(source)]);
        try {
            expectCode(() => readRepositoryBindings(path, [repository], inspector(source, 'feature/main', false)), 'ERR_PREFLIGHT_FAILED');
            expectCode(() => readRepositoryBindings(path, [repository], inspector(source, 'feature/main', true, false)), 'ERR_PREFLIGHT_FAILED');
        } finally { remove(root); }
    });

    it('accepts a canonical binding path longer than 200 characters without repair', function () {
        const root = fixture();
        const source = join(root, ...Array.from({length: 12}, () => 'long-path-segment-123'));
        mkdirSync(source, {recursive: true});
        const path = writeBindings(root, [binding(source)]);
        try {
            expect(source.length).toBeGreaterThan(200);
            const before = readFileSync(path, 'hex');
            expect(readRepositoryBindings(path, [repository], inspector(source, 'feature/main'))[0].path).toBe(source);
            expect(readFileSync(path, 'hex')).toBe(before);
        } finally { remove(root); }
    });
});

function binding(path: string) {
    return {id: 'main', path, branch: 'feature/main', worktreeMode: 'shared', role: 'primary', access: 'write'};
}

function inspector(path: string, branch: string | undefined, directory: boolean = true, write: boolean = true): RepositoryBindingInspector {
    return {readText: source => readFileSync(source, 'utf8'), canonicalize: value => value,
        isDirectory: value => directory && value === path, hasAccess: (_value, access) => access === 'read' || write,
        worktreeRoot: () => path,
        branch: () => branch};
}

function writeBindings(root: string, repositories: unknown[]): string {
    const path = join(root, 'repositories.local.json');
    writeFileSync(path, JSON.stringify({schemaVersion: 1, repositories}));
    return path;
}

function fixture(): string { return mkdtempSync(join(tmpdir(), 'watchtower-rm08-bindings-')); }
function remove(path: string): void { rmSync(path, {recursive: true, force: true}); }
function expectCode(action: () => unknown, code: string): void {
    try { action(); fail(`Expected ${code}.`); } catch (error) { expect((error as {code?: string}).code).toBe(code); }
}
