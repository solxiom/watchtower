/**
 * Shared real-disk fixture composition for `WatchPreflight` specs: a real
 * lane directory (via the already-shared `readCommandFixtures` builder), a
 * real staged runtime (via `RuntimeCatalog.stageRuntime`, RT-04-accepted),
 * and a real activated pack-index generation on disk (via the accepted
 * `InitialPackIndexActivation`, LC-09). Nothing here re-implements pack-index
 * compilation, runtime staging, or lane discovery — it only assembles already-
 * accepted builders so `WatchPreflight` specs exercise the real boundary.
 */
import {join} from 'node:path';
import {consumePack, InitialPackIndexActivation} from '../../../src/foundation/pack/index.js';
import {RuntimeCatalog} from '../../../src/foundation/runtime/index.js';
import {
    AUTHOR_LANE_ID, PACK_ROOT, buildPackFixture, deps, fakeFileSystem, realValidators
} from '../fixtures/packFixture.js';
import {cleanupFixture, makeRuntimeCatalogFixture, runtimeManifest} from './runtimeCatalogFixtures.js';
import {
    createLane, createReadCommandFixture, type LaneFixtureOptions, type ReadCommandFixture
} from '../../basic/readCommandFixtures.js';

export const WATCH_LANE_ID = AUTHOR_LANE_ID;
export const WATCH_RUNTIME_VERSION = '1.0.0';
export const WATCH_INDEX_PACK_PATH = 'docs/spec/implementation/watchtower-v1';

export interface WatchLaneFixture {
    readonly fixture: ReadCommandFixture;
    readonly laneDir: string;
    readonly runtimeCatalog: RuntimeCatalog;
    remove(): void;
}

/**
 * A real lane directory with a real staged runtime; the pack index is not yet
 * activated. `RuntimeCatalog.stageRuntime` leaves the immutable runtime root
 * read-only (`0555`), so teardown must restore write permission recursively
 * before removal — `cleanupFixture` (already shared by the runtime-catalog
 * specs) does exactly that.
 */
export function createWatchLaneFixture(options: LaneFixtureOptions = {}): WatchLaneFixture {
    const {runtimeAvailable, ...rest} = options;
    const fixture = createReadCommandFixture();
    const laneDir = createLane(fixture, {
        laneId: WATCH_LANE_ID, runtimeVersion: WATCH_RUNTIME_VERSION, ...rest, runtimeAvailable: false
    });
    const runtimeCatalog = new RuntimeCatalog({dataRoot: () => fixture.dataHome});
    const runtimeSource = runtimeAvailable === false ? undefined : makeRuntimeCatalogFixture();
    if (runtimeSource !== undefined) {
        runtimeCatalog.stageRuntime(WATCH_RUNTIME_VERSION, runtimeManifest(WATCH_RUNTIME_VERSION), runtimeSource.source);
    }
    return {
        fixture, laneDir, runtimeCatalog,
        remove(): void {
            if (runtimeSource !== undefined) cleanupFixture(runtimeSource.root);
            cleanupFixture(fixture.root);
        }
    };
}

/** Activates a real on-disk pack-index generation at `laneDir/coordinator/index/pack/` through LC-09's accepted adapter. */
export async function activateWatchIndex(laneDir: string, laneId = WATCH_LANE_ID): Promise<void> {
    const packFixture = buildPackFixture();
    const pack = await consumePack(packFixture.context, deps(packFixture));
    if (!pack.ok) throw new Error(`fixture pack was rejected: ${pack.reason}`);
    const activation = new InitialPackIndexActivation({fs: fakeFileSystem(packFixture), validators: realValidators()});
    const result = await activation.activate({
        pack: pack.pack, packRoot: PACK_ROOT, packPath: WATCH_INDEX_PACK_PATH, laneId, laneDir
    });
    if (!result.ok) throw new Error(`fixture index activation was rejected: ${result.reason}`);
}

export function currentPointerPath(laneDir: string): string {
    return join(laneDir, 'coordinator', 'index', 'pack', 'current.json');
}
