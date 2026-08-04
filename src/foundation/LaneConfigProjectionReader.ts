import type {LaneManifestV1} from '../contracts/index.js';
import {createWatchtowerError} from '../contracts/index.js';
import {canonicalizePath} from './paths/index.js';
import {parseEnvConfig, redactSensitiveKeys} from './parsing/index.js';
import type {LaneReadFileStore} from './LaneReadFileStore.js';
import {ContainedLaneReadFileStore} from './LaneReadFileStore.js';

const MAX_CONFIG_BYTES = 256 * 1024;
const TMUX_PREFIX = /^[a-z0-9][a-z0-9-]{0,15}$/u;

export interface RedactedLaneConfig {
    readonly config: Readonly<Record<string, string>>;
    readonly redactedKeys: readonly string[];
}

export class LaneConfigProjectionReader {
    constructor(private readonly files: LaneReadFileStore = new ContainedLaneReadFileStore()) {}

    read(laneDir: string, controlHome: string, manifest: LaneManifestV1): RedactedLaneConfig {
        const parsed = parseEnvConfig(this.files.readRequired(laneDir, 'lane.config.env', MAX_CONFIG_BYTES));
        if (!parsed.valid || !matchesIdentity(parsed.config, controlHome, manifest)) throw invalidConfig();
        const redacted = redactSensitiveKeys(parsed.config);
        return {
            config: Object.freeze({...redacted.redacted}),
            redactedKeys: Object.freeze([...redacted.redactedKeys].sort((left, right) => left.localeCompare(right)))
        };
    }
}

function matchesIdentity(config: Record<string, string>, controlHome: string, manifest: LaneManifestV1): boolean {
    const packPath = manifest.implementationPack?.path;
    if (config.LANE_ID !== manifest.laneId || config.LANE_SLUG !== manifest.slug ||
        config.INITIATIVE_ID !== manifest.initiativeId || config.HOME_REPOSITORY_ID !== manifest.controlHomeRepository ||
        config.IMPL_PACK_REL !== packPath || !TMUX_PREFIX.test(config.TMUX_PREFIX ?? '')) return false;
    try {
        return config.WORKSPACE === canonicalizePath(config.WORKSPACE) && config.WORKSPACE === controlHome;
    } catch {
        return false;
    }
}

function invalidConfig() {
    return createWatchtowerError('ERR_INVALID_LANE_CONFIG', {
        operation: 'resolve lane configuration', target: 'lane.config.env',
        remediation: 'Restore strict scalar config whose required identity values match lane.json.'
    });
}
