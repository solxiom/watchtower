import {dirname, isAbsolute, join, relative, sep} from 'node:path';
import type {LaneManifestV1, LaneRef, ReadModelLaneLifecycle} from '../contracts/index.js';
import {createWatchtowerError} from '../contracts/errors.js';
import {canonicalizePath, safePathTarget} from './paths/index.js';
import {parseLaneState} from './stateParser.js';
import {readLaneManifest} from './laneManifestReader.js';
import type {LaneDiscoveryFileSystem} from './LaneDiscoveryFileSystem.js';

export interface DiscoveredLane extends LaneRef {
    readonly laneDir: string;
    readonly manifest: LaneManifestV1;
    readonly lifecycle: ReadModelLaneLifecycle;
}

export function discoverHomeLanes(cwd: string, fileSystem: LaneDiscoveryFileSystem): DiscoveredLane[] {
    const start = canonicalizePath(cwd);
    const lanes: DiscoveredLane[] = [];
    let current = start;
    while (true) {
        lanes.push(...discoverAtControlHome(current, fileSystem));
        const parent = dirname(current);
        if (parent === current) break;
        current = parent;
    }
    rejectDuplicateLaneIds(lanes);
    return lanes.sort(compareLanes);
}

function discoverAtControlHome(controlHome: string, fileSystem: LaneDiscoveryFileSystem): DiscoveredLane[] {
    const lanesRoot = join(controlHome, '.watchtower', 'lanes');
    if (!isOrdinaryDirectory(lanesRoot, fileSystem)) return [];
    const canonicalRoot = containedCanonicalPath(controlHome, lanesRoot);
    if (canonicalRoot === undefined) return [];
    let entries;
    try {
        entries = fileSystem.list(canonicalRoot);
    } catch {
        throw invalidDiscovery(lanesRoot, 'Restore read access to the Watchtower lane directory.');
    }
    const lanes: DiscoveredLane[] = [];
    for (const entry of [...entries].sort((left, right) => left.name.localeCompare(right.name))) {
        if (entry.kind !== 'directory') continue;
        const laneDir = containedCanonicalPath(canonicalRoot, join(canonicalRoot, entry.name));
        if (laneDir === undefined) continue;
        const markerPath = join(laneDir, 'lane.json');
        if (!pathExists(markerPath, fileSystem)) continue;
        const canonicalMarker = containedCanonicalPath(laneDir, markerPath);
        if (canonicalMarker === undefined) {
            throw invalidDiscovery(markerPath, 'Restore a contained regular lane marker.');
        }
        const manifest = readLaneManifest(canonicalMarker, fileSystem);
        lanes.push(toDiscoveredLane(controlHome, laneDir, manifest, fileSystem));
    }
    return lanes;
}

function toDiscoveredLane(
    controlHome: string, laneDir: string, manifest: LaneManifestV1, fileSystem: LaneDiscoveryFileSystem
): DiscoveredLane {
    return {
        laneId: manifest.laneId,
        slug: manifest.slug,
        initiativeId: manifest.initiativeId,
        kind: manifest.kind,
        controlHome,
        laneDir: canonicalizePath(laneDir),
        manifest,
        lifecycle: readLifecycle(laneDir, fileSystem)
    };
}

function readLifecycle(laneDir: string, fileSystem: LaneDiscoveryFileSystem): ReadModelLaneLifecycle {
    const statePath = join(laneDir, 'state', 'coordinator-lane-state.txt');
    try {
        const state = fileSystem.inspect(statePath);
        if (state === undefined) return 'unknown';
        if (state.kind !== 'file') {
            throw invalidDiscovery(statePath, 'Restore a regular lane-state projection.');
        }
        const canonicalState = containedCanonicalPath(laneDir, statePath);
        if (canonicalState === undefined) {
            throw invalidDiscovery(statePath, 'Restore a contained lane-state projection.');
        }
        const parsed = parseLaneState(fileSystem.readText(canonicalState));
        return parsed.valid ? parsed.lifecycle : 'unknown';
    } catch (error) {
        if (isWatchtowerError(error)) throw error;
        throw invalidDiscovery(statePath, 'Restore a readable lane-state projection.');
    }
}

function containedCanonicalPath(root: string, candidate: string): string | undefined {
    try {
        const canonical = canonicalizePath(candidate);
        const difference = relative(root, canonical);
        return difference !== '..' && !difference.startsWith(`..${sep}`) && !isAbsolute(difference)
            ? canonical : undefined;
    } catch {
        throw invalidDiscovery(candidate, 'Restore an accessible path without broken or looping symlinks.');
    }
}

function isOrdinaryDirectory(path: string, fileSystem: LaneDiscoveryFileSystem): boolean {
    try { return fileSystem.inspect(path)?.kind === 'directory'; } catch {
        throw invalidDiscovery(path, 'Restore access to the Watchtower lane directory.');
    }
}

function pathExists(path: string, fileSystem: LaneDiscoveryFileSystem): boolean {
    try { return fileSystem.inspect(path) !== undefined; } catch {
        throw invalidDiscovery(path, 'Restore access to the lane marker.');
    }
}

function rejectDuplicateLaneIds(lanes: readonly DiscoveredLane[]): void {
    const seen = new Set<string>();
    for (const lane of lanes) {
        if (seen.has(lane.laneId)) {
            throw invalidDiscovery(lane.laneDir, 'Assign every lane a globally unique laneId.');
        }
        seen.add(lane.laneId);
    }
}

function compareLanes(left: DiscoveredLane, right: DiscoveredLane): number {
    return left.controlHome.localeCompare(right.controlHome) || left.slug.localeCompare(right.slug) ||
        left.laneId.localeCompare(right.laneId);
}

function invalidDiscovery(target: string, remediation: string) {
    return createWatchtowerError('ERR_INVALID_LANE_CONFIG', {
        operation: 'discover home lanes', target: safePathTarget(target), remediation
    });
}

function isWatchtowerError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error &&
        error.code === 'ERR_INVALID_LANE_CONFIG';
}
