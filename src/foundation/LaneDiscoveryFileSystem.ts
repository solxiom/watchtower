import {lstatSync, readFileSync, readdirSync} from 'node:fs';

export type LaneDiscoveryPathKind = 'directory' | 'file' | 'other';

export interface LaneDiscoveryPathInfo {
    readonly kind: LaneDiscoveryPathKind;
    readonly size: number;
}

export interface LaneDiscoveryEntry {
    readonly name: string;
    readonly kind: LaneDiscoveryPathKind;
}

export interface LaneDiscoveryFileSystem {
    inspect(path: string): LaneDiscoveryPathInfo | undefined;
    list(path: string): readonly LaneDiscoveryEntry[];
    readText(path: string): string;
}

/**
 * Raw adapter for NIRVANA_API_GAP:ROOT_SCOPED_LANE_DISCOVERY.
 * Pinned BasicStorage is rooted and cached through global storage configuration;
 * it does not expose this capability's arbitrary-root Dirent and containment semantics.
 */
export class NodeLaneDiscoveryFileSystem implements LaneDiscoveryFileSystem {
    inspect(path: string): LaneDiscoveryPathInfo | undefined {
        try {
            const stat = lstatSync(path);
            return {kind: kind(stat.isDirectory(), stat.isFile()), size: stat.size};
        } catch (error) {
            if (isMissing(error)) return undefined;
            throw error;
        }
    }

    list(path: string): readonly LaneDiscoveryEntry[] {
        return readdirSync(path, {withFileTypes: true}).map(entry => ({
            name: entry.name,
            kind: kind(entry.isDirectory(), entry.isFile())
        }));
    }

    readText(path: string): string {
        return readFileSync(path, 'utf8');
    }
}

export const nodeLaneDiscoveryFileSystem: LaneDiscoveryFileSystem =
    Object.freeze(new NodeLaneDiscoveryFileSystem());

function kind(directory: boolean, file: boolean): LaneDiscoveryPathKind {
    if (directory) return 'directory';
    if (file) return 'file';
    return 'other';
}

function isMissing(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
