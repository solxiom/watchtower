import {chmodSync, mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {InitPreflightHost} from '../../src/foundation/init/index.js';
import type {WatchtowerError} from '../../src/contracts/errors.js';

let root: string;

describe('InitPreflightHost scope and path boundaries', function () {
    let host: InitPreflightHost;
    beforeEach(function () {
        root = mkdtempSync(join(tmpdir(), 'wt-init-host-'));
        git(root);
        mkdirSync(join(root, 'pack'));
        host = new InitPreflightHost();
    });
    afterEach(function () { chmodSafe(join(root, 'scope.json')); rmSync(root, {recursive: true, force: true}); });

    it('accepts unknown scope and binding fields with deterministic warnings', function () {
        scope({schemaVersion: 1, future: true, repositories: [{...binding(root), futureBinding: 1}]});
        const result = host.readScope('scope.json', root);
        expect(result.bindings.length).toBe(1);
        expect(result.warnings.map(item => item.message)).toEqual([
            'Ignored unknown scope.future.', 'Ignored unknown repositories[0].futureBinding.'
        ]);
    });

    it('rejects duplicate IDs and paths, branch mismatch, shared writes, and control characters', function () {
        const second = mkdtempSync(join(tmpdir(), 'wt-init-host-second-'));
        try {
            git(second);
            for (const repositories of [
                [binding(root), {...binding(second), id: 'control-home'}],
                [binding(root), {...binding(root), id: 'second'}],
                [{...binding(root), branch: 'other'}],
                [{...binding(root), worktreeMode: 'shared'}],
                [{...binding(root), role: 'bad\u0000role'}]
            ]) {
                scope({schemaVersion: 1, repositories});
                expectCode(() => host.readScope('scope.json', root));
            }
        } finally { rmSync(second, {recursive: true, force: true}); }
    });

    it('rejects symlinked, unreadable, malformed, missing, and wrong-kind scope files without repair', function () {
        const outside = join(root, 'outside.json');
        writeFileSync(outside, JSON.stringify({schemaVersion: 1, repositories: [binding(root)]}));
        symlinkSync(outside, join(root, 'scope-link.json'));
        expectCode(() => host.readScope('scope-link.json', root));
        writeFileSync(join(root, 'scope.json'), '{');
        expectCode(() => host.readScope('scope.json', root));
        chmodSync(join(root, 'scope.json'), 0o000);
        expectCode(() => host.readScope('scope.json', root));
        chmodSync(join(root, 'scope.json'), 0o600);
        expectCode(() => host.readScope('missing.json', root));
        expectCode(() => host.readScope('pack', root));
    });

    it('rejects symlinked pack directories and accepts one canonical directory', function () {
        symlinkSync(join(root, 'pack'), join(root, 'pack-link'));
        expectCode(() => host.resolvePack('pack-link', root));
        expect(host.resolvePack('pack', root)).toBe(join(root, 'pack'));
    });
});

function scope(value: object): void { writeFileSync(join(root, 'scope.json'), JSON.stringify(value)); }

function binding(path: string) { return {id: 'control-home', path, branch: 'main', worktreeMode: 'dedicated', role: 'primary', access: 'write'}; }
function git(path: string): void { execFileSync('git', ['init', '--quiet', '--initial-branch=main'], {cwd: path}); }
function chmodSafe(path: string): void { try { chmodSync(path, 0o600); } catch {} }
function expectCode(action: () => unknown): void { try { action(); } catch (error) { expect(['ERR_INVALID_ARGUMENT', 'ERR_PREFLIGHT_FAILED']).toContain((error as WatchtowerError).code); return; } fail('Expected a typed rejection.'); }
