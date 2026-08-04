import type {LaneDiscoveryFileSystem} from './LaneDiscoveryFileSystem.js';
import {nodeLaneDiscoveryFileSystem} from './LaneDiscoveryFileSystem.js';
import {buildLaneFilePath, safePathTarget} from './paths/index.js';
import {createWatchtowerError} from '../contracts/index.js';

export interface LaneReadFileStore {
    readRequired(laneDir: string, relativePath: string, maxBytes: number): string;
    readOptional(laneDir: string, relativePath: string, maxBytes: number): string | undefined;
}

export class ContainedLaneReadFileStore implements LaneReadFileStore {
    constructor(private readonly fileSystem: LaneDiscoveryFileSystem = nodeLaneDiscoveryFileSystem) {}

    readRequired(laneDir: string, relativePath: string, maxBytes: number): string {
        const value = this.readOptional(laneDir, relativePath, maxBytes);
        if (value === undefined) throw invalidFile(laneDir, relativePath);
        return value;
    }

    readOptional(laneDir: string, relativePath: string, maxBytes: number): string | undefined {
        const path = buildLaneFilePath(laneDir, relativePath);
        try {
            const file = this.fileSystem.inspect(path);
            if (file === undefined) return undefined;
            if (file.kind !== 'file' || file.size > maxBytes) throw invalidFile(laneDir, relativePath);
            return this.fileSystem.readText(path);
        } catch (error) {
            if (isInvalidFile(error)) throw error;
            throw invalidFile(laneDir, relativePath);
        }
    }
}

function invalidFile(laneDir: string, relativePath: string) {
    return createWatchtowerError('ERR_INVALID_LANE_CONFIG', {
        operation: 'read lane configuration',
        target: safePathTarget(`${laneDir}/${relativePath}`),
        remediation: `Restore a readable, contained regular ${relativePath} file.`
    });
}

function isInvalidFile(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error &&
        (error.code === 'ERR_INVALID_LANE_CONFIG' || error.code === 'ERR_PATH_ESCAPE');
}
