import {existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {cmd} from '@nirvana/base/terminal';
import {
    authorizePath,
    buildLaneFilePath,
    buildLanePath,
    canonicalizePath,
    isPathSafe,
    resolveRepositoryRoot,
    resolveWatchtowerDataHome,
    resolveWorkspace,
    validateWatchtowerDataHome
} from '../../src/foundation/paths/index.js';

describe('Watchtower data-home resolution', function () {
    it('uses WATCHTOWER_DATA_HOME before XDG_DATA_HOME without creating either path', function () {
        const root = makeFixture();
        const watched = join(root, 'watched');
        try {
            expect(resolveWatchtowerDataHome({WATCHTOWER_DATA_HOME: watched, XDG_DATA_HOME: join(root, 'xdg')}, root)).toBe(watched);
            expect(existsSync(watched)).toBeFalse();
        } finally {
            removeFixture(root);
        }
    });

    it('uses the XDG location or the local-share fallback', function () {
        const root = makeFixture();
        try {
            expect(resolveWatchtowerDataHome({XDG_DATA_HOME: join(root, 'xdg')}, root)).toBe(join(root, 'xdg', 'watchtower'));
            expect(resolveWatchtowerDataHome({}, root)).toBe(join(root, '.local', 'share', 'watchtower'));
        } finally {
            removeFixture(root);
        }
    });

    it('validates only an existing, accessible data home', function () {
        const root = makeFixture();
        try {
            expect(validateWatchtowerDataHome(root)).toBe(canonicalizePath(root));
            expectCode(() => validateWatchtowerDataHome(join(root, 'missing')), 'ERR_WORKSPACE_NOT_FOUND');
        } finally {
            removeFixture(root);
        }
    });
});

describe('workspace resolution', function () {
    it('uses an explicit canonical workspace and rejects a missing one', function () {
        const root = makeFixture();
        const alias = join(root, 'alias');
        symlinkSync(root, alias);
        try {
            expect(resolveWorkspace(alias, join(root, 'unused'))).toBe(canonicalizePath(root));
            expectCode(() => resolveWorkspace(join(root, 'missing')), 'ERR_WORKSPACE_NOT_FOUND');
        } finally {
            removeFixture(root);
        }
    });

    it('prefers the Git toplevel over a Watchtower ancestor', function () {
        const root = makeFixture();
        const nested = join(root, 'nested', 'child');
        mkdirSync(nested, {recursive: true});
        cmd.execSync({command: 'git', args: ['init', '--quiet'], options: {cwd: root, stdio: 'ignore'}});
        mkdirSync(join(root, '.watchtower', 'lanes'), {recursive: true});
        try {
            expect(resolveRepositoryRoot(nested)).toBe(canonicalizePath(root));
            expect(resolveWorkspace(undefined, nested)).toBe(canonicalizePath(root));
        } finally {
            removeFixture(root);
        }
    });

    it('uses the nearest Watchtower ancestor, then the current directory', function () {
        const root = makeFixture();
        const watchedChild = join(root, 'watched', 'child');
        const plainChild = join(root, 'plain', 'child');
        mkdirSync(join(root, 'watched', '.watchtower', 'lanes'), {recursive: true});
        mkdirSync(watchedChild, {recursive: true});
        mkdirSync(plainChild, {recursive: true});
        try {
            expect(resolveWorkspace(undefined, watchedChild)).toBe(canonicalizePath(join(root, 'watched')));
            expect(resolveWorkspace(undefined, plainChild)).toBe(canonicalizePath(plainChild));
        } finally {
            removeFixture(root);
        }
    });

    it('ignores malformed lane markers and accepts only a contained directory', function () {
        const root = makeFixture();
        const child = join(root, 'child');
        const external = makeFixture();
        const marker = join(root, '.watchtower', 'lanes');
        mkdirSync(child);
        try {
            mkdirSync(join(root, '.watchtower'), {recursive: true});
            writeFileSync(marker, 'not-a-directory');
            expect(resolveWorkspace(undefined, child)).toBe(canonicalizePath(child));
            unlinkSync(marker);
            symlinkSync('missing', marker);
            expect(resolveWorkspace(undefined, child)).toBe(canonicalizePath(child));
            unlinkSync(marker);
            symlinkSync('lanes', marker);
            expect(resolveWorkspace(undefined, child)).toBe(canonicalizePath(child));
            unlinkSync(marker);
            symlinkSync(external, marker);
            expect(resolveWorkspace(undefined, child)).toBe(canonicalizePath(child));
            unlinkSync(marker);
            mkdirSync(marker);
            expect(resolveWorkspace(undefined, child)).toBe(canonicalizePath(root));
        } finally {
            removeFixture(root);
            removeFixture(external);
        }
    });
});

describe('canonical path boundaries', function () {
    it('canonicalizes symlinks and strips trailing separators', function () {
        const root = makeFixture();
        const target = join(root, 'target');
        const alias = join(root, 'alias');
        const loop = join(root, 'loop');
        mkdirSync(target);
        symlinkSync(target, alias);
        symlinkSync('loop', loop);
        try {
            expect(canonicalizePath(`${alias}/`)).toBe(canonicalizePath(target));
            expectCode(() => canonicalizePath(loop), 'ERR_PATH_ESCAPE');
        } finally {
            removeFixture(root);
        }
    });

    it('preserves exact case and rejects a wrong-case path on supported Linux filesystems', function () {
        const root = makeFixture();
        const exact = join(root, 'TargetCase');
        mkdirSync(exact);
        try {
            expect(canonicalizePath(exact)).toBe(exact);
            expectCode(() => canonicalizePath(join(root, 'targetcase')), 'ERR_PATH_ESCAPE');
        } finally {
            removeFixture(root);
        }
    });

    it('rejects parent segments, null bytes, control characters, and symlink escapes', function () {
        const root = makeFixture();
        const lane = join(root, 'lane');
        const outside = join(root, 'outside');
        mkdirSync(lane);
        mkdirSync(outside);
        symlinkSync(outside, join(lane, 'escape'));
        try {
            expect(isPathSafe('state/file.txt', lane)).toBeTrue();
            expect(authorizePath(lane, 'future/file.txt')).toBe(join(lane, 'future', 'file.txt'));
            for (const path of ['../outside', 'file\u0000name', 'file\u0007name']) {
                expect(isPathSafe(path, lane)).toBeFalse();
                expectCode(() => canonicalizePath(path), 'ERR_PATH_ESCAPE');
            }
            expect(isPathSafe('escape/future.txt', lane)).toBeFalse();
            expectCode(() => authorizePath(lane, 'escape/future.txt'), 'ERR_PATH_ESCAPE');
            expectCode(() => buildLaneFilePath(lane, '../outside'), 'ERR_PATH_ESCAPE');
            expectCode(() => buildLaneFilePath(lane, 'escape/file.txt'), 'ERR_PATH_ESCAPE');
        } finally {
            removeFixture(root);
        }
    });

    it('rejects a lane root whose managed-directory symlink escapes control home', function () {
        const root = makeFixture();
        const outside = makeFixture();
        symlinkSync(outside, join(root, '.watchtower'));
        try {
            expectCode(() => buildLanePath(root, 'safe-lane'), 'ERR_PATH_ESCAPE');
        } finally {
            removeFixture(root);
            removeFixture(outside);
        }
    });

    it('authorizes a contained symlink descendant through every root-aware API', function () {
        const lane = makeFixture();
        const target = join(lane, 'target');
        const input = 'inside/future.txt';
        mkdirSync(target);
        symlinkSync(target, join(lane, 'inside'));
        try {
            expect(isPathSafe(input, lane)).toBeTrue();
            expect(authorizePath(lane, input)).toBe(join(lane, input));
            expect(buildLaneFilePath(lane, input)).toBe(join(lane, input));
        } finally {
            removeFixture(lane);
        }
    });

    it('rejects broken and looping symlink components before authorizing a future path', function () {
        const lane = makeFixture();
        const outside = makeFixture();
        const broken = 'brokenOutside/future.txt';
        const loop = 'loop/future.txt';
        symlinkSync(join(outside, 'missing'), join(lane, 'brokenOutside'));
        symlinkSync('loop', join(lane, 'loop'));
        try {
            for (const input of [broken, loop]) {
                expect(isPathSafe(input, lane)).toBeFalse();
                expectCode(() => authorizePath(lane, input), 'ERR_PATH_ESCAPE');
                expectCode(() => buildLaneFilePath(lane, input), 'ERR_PATH_ESCAPE');
            }
        } finally {
            removeFixture(lane);
            removeFixture(outside);
        }
    });

    it('rejects broken and looping Watchtower directory components in lane construction', function () {
        const brokenHome = makeFixture();
        const loopHome = makeFixture();
        const brokenLanesHome = makeFixture();
        const loopLanesHome = makeFixture();
        const outside = makeFixture();
        symlinkSync(join(outside, 'missing'), join(brokenHome, '.watchtower'));
        symlinkSync('.watchtower', join(loopHome, '.watchtower'));
        mkdirSync(join(brokenLanesHome, '.watchtower'));
        mkdirSync(join(loopLanesHome, '.watchtower'));
        symlinkSync(join(outside, 'missing'), join(brokenLanesHome, '.watchtower', 'lanes'));
        symlinkSync('lanes', join(loopLanesHome, '.watchtower', 'lanes'));
        try {
            expectCode(() => buildLanePath(brokenHome, 'lane-a'), 'ERR_PATH_ESCAPE');
            expectCode(() => buildLanePath(loopHome, 'lane-a'), 'ERR_PATH_ESCAPE');
            expectCode(() => buildLanePath(brokenLanesHome, 'lane-a'), 'ERR_PATH_ESCAPE');
            expectCode(() => buildLanePath(loopLanesHome, 'lane-a'), 'ERR_PATH_ESCAPE');
        } finally {
            removeFixture(brokenHome);
            removeFixture(loopHome);
            removeFixture(brokenLanesHome);
            removeFixture(loopLanesHome);
            removeFixture(outside);
        }
    });
});

function makeFixture(): string {
    return mkdtempSync(join(tmpdir(), 'watchtower-rm03-'));
}

function removeFixture(path: string): void {
    rmSync(path, {recursive: true, force: true});
}

function expectCode(action: () => unknown, code: string): void {
    try {
        action();
        fail(`Expected ${code}.`);
    } catch (error) {
        expect((error as {code?: string}).code).toBe(code);
    }
}
