/**
 * REL-03 traversal/permission fixture builders.
 *
 * These place `.watchtower/lanes/**` markers by hand (the same accepted
 * pattern `copiedTemplateFixture.ts` already uses for out-of-band marker
 * probing) rather than through `wt init`, because the property under proof —
 * `discoverAtControlHome`'s per-entry containment check in
 * `src/foundation/discovery/laneDiscovery.ts` — is a pure filesystem-shape
 * boundary that does not depend on a lane actually being accepted or
 * installed. No product source module participates in fixture construction.
 */
import {chmodSync, mkdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync} from 'node:fs';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

export interface TraversalFixture {
    readonly root: string;
    readonly controlHome: string;
    /** Outside any `.watchtower/lanes` root; discovery must never read or alter this. */
    readonly secretFile: string;
    readonly secretBeforeBytes: string;
    remove(): void;
}

function baseFixture(root: string): TraversalFixture {
    const controlHome = join(root, 'control');
    const secretFile = join(root, 'secret', 'do-not-read.txt');
    mkdirSync(join(controlHome, '.watchtower', 'lanes'), {recursive: true});
    mkdirSync(join(root, 'secret'), {recursive: true});
    writeFileSync(secretFile, 'this byte range must never be read or altered by lane discovery\n');
    return {
        root, controlHome, secretFile, secretBeforeBytes: readFileSync(secretFile, 'utf8'),
        remove: () => { chmodSync(join(controlHome, '.watchtower', 'lanes'), 0o755); rmSync(root, {recursive: true, force: true}); }
    };
}

/** A `.watchtower/lanes/evil` entry that is itself a symlink escaping the lanes root. */
export function makeEscapedLaneDirectoryFixture(): TraversalFixture {
    const root = mkdtempSync(join(tmpdir(), 'wt-rel03-traversal-dir-'));
    const fixture = baseFixture(root);
    const outsideLaneDir = join(root, 'secret', 'outside-lane');
    mkdirSync(outsideLaneDir, {recursive: true});
    writeFileSync(join(outsideLaneDir, 'lane.json'), JSON.stringify({
        schemaVersion: 1, laneId: 'escaped-lane', slug: 'evil', initiativeId: 'x', kind: 'implementation'
    }));
    symlinkSync(outsideLaneDir, join(fixture.controlHome, '.watchtower', 'lanes', 'evil'));
    return fixture;
}

/** A real `.watchtower/lanes/evil` directory whose `lane.json` marker is a symlink escaping that directory. */
export function makeEscapedLaneMarkerFixture(): TraversalFixture {
    const root = mkdtempSync(join(tmpdir(), 'wt-rel03-traversal-marker-'));
    const fixture = baseFixture(root);
    const laneDir = join(fixture.controlHome, '.watchtower', 'lanes', 'evil');
    mkdirSync(laneDir, {recursive: true});
    const outsideMarker = join(root, 'secret', 'lane.json');
    writeFileSync(outsideMarker, JSON.stringify({
        schemaVersion: 1, laneId: 'escaped-marker', slug: 'evil', initiativeId: 'x', kind: 'implementation'
    }));
    symlinkSync(outsideMarker, join(laneDir, 'lane.json'));
    return fixture;
}

/** `.watchtower/lanes` itself denied read+execute, so `readdir` fails closed rather than silently reporting empty. */
export function makePermissionDeniedLanesFixture(): TraversalFixture {
    const root = mkdtempSync(join(tmpdir(), 'wt-rel03-permission-'));
    const fixture = baseFixture(root);
    chmodSync(join(fixture.controlHome, '.watchtower', 'lanes'), 0o000);
    return fixture;
}

export function currentMode(path: string): number {
    return statSync(path).mode & 0o777;
}
