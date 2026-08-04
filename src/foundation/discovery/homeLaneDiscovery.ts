import type {LaneManifestV1} from '../../contracts/index.js';
import {discoverHomeLanes as discover, type DiscoveredLane} from './laneDiscovery.js';
import {readLaneManifest as readManifest} from './laneManifestReader.js';
import {
    nodeLaneDiscoveryFileSystem, type LaneDiscoveryFileSystem
} from './LaneDiscoveryFileSystem.js';

export function discoverHomeLanes(
    cwd: string,
    fileSystem: LaneDiscoveryFileSystem = nodeLaneDiscoveryFileSystem
): DiscoveredLane[] {
    return discover(cwd, fileSystem);
}

export function readLaneManifest(
    markerPath: string,
    fileSystem: LaneDiscoveryFileSystem = nodeLaneDiscoveryFileSystem
): LaneManifestV1 {
    return readManifest(markerPath, fileSystem);
}
