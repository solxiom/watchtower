import {existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {resolveWatchtowerDataHome} from '../../src/foundation/dataHomeResolver.js';

describe('resolveWatchtowerDataHome', () => {
    let root: string;

    beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'watchtower-data-root-')); });
    afterEach(() => { rmSync(root, {recursive: true, force: true}); });

    it('uses WATCHTOWER_DATA_HOME before XDG_DATA_HOME', () => {
        const watched = join(root, 'watched');
        mkdirSync(watched, {recursive: true});
        expect(resolveWatchtowerDataHome({WATCHTOWER_DATA_HOME: watched, XDG_DATA_HOME: join(root, 'xdg')}, home(root))).toBe(realpathSync(watched));
    });

    it('uses XDG_DATA_HOME before the OS-user local-share directory', () => {
        const xdg = join(root, 'xdg');
        mkdirSync(join(xdg, 'watchtower'), {recursive: true});
        expect(resolveWatchtowerDataHome({XDG_DATA_HOME: xdg}, home(join(root, 'ignored')))).toBe(realpathSync(join(xdg, 'watchtower')));
    });

    it('uses the OS-user home rather than HOME', () => {
        const osHome = join(root, 'os-home');
        mkdirSync(join(osHome, '.local', 'share', 'watchtower'), {recursive: true});
        expect(resolveWatchtowerDataHome({HOME: join(root, 'wrong-home')}, home(osHome))).toBe(realpathSync(join(osHome, '.local', 'share', 'watchtower')));
    });

    it('does not create a missing data root while resolving it', () => {
        const missing = join(root, 'missing');
        expect(resolveWatchtowerDataHome({WATCHTOWER_DATA_HOME: missing}, home(root))).toBe(missing);
        expect(existsSync(missing)).toBeFalse();
    });
});

function home(homedir: string): string {
    return homedir;
}
