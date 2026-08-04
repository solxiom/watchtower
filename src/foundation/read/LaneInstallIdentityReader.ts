import {createWatchtowerError} from '../../contracts/index.js';
import {hasDuplicateJsonObjectKey} from '../schemaComposition/jsonDuplicateKeyDetector.js';
import type {LaneReadFileStore} from './LaneReadFileStore.js';
import {ContainedLaneReadFileStore} from './LaneReadFileStore.js';

const MAX_INSTALL_BYTES = 256 * 1024;
const VERSION = /^[A-Za-z0-9][A-Za-z0-9.+-]{0,127}$/u;

export interface LaneInstallIdentity {
    readonly cliVersion: string;
    readonly runtimeVersion: string;
    readonly knowledgeVersion: string;
}

export class LaneInstallIdentityReader {
    constructor(private readonly files: LaneReadFileStore = new ContainedLaneReadFileStore()) {}

    read(laneDir: string): LaneInstallIdentity {
        const text = this.files.readRequired(laneDir, 'install.json', MAX_INSTALL_BYTES);
        let value: unknown;
        try {
            if (hasDuplicateJsonObjectKey(text)) throw new Error('duplicate member');
            value = JSON.parse(text);
        } catch {
            throw invalidInstall();
        }
        if (!isRecord(value) || !isSchemaVersion(value.schemaVersion)) throw invalidInstall();
        if (value.schemaVersion !== 1) throw unsupportedInstall();
        if (value.mode !== 'linked' ||
            !isVersion(value.cliVersion) || !isVersion(value.runtimeVersion) || !isVersion(value.knowledgeVersion)) {
            throw invalidInstall();
        }
        return {cliVersion: value.cliVersion, runtimeVersion: value.runtimeVersion,
            knowledgeVersion: value.knowledgeVersion};
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype;
}

function isVersion(value: unknown): value is string {
    return typeof value === 'string' && VERSION.test(value);
}

function isSchemaVersion(value: unknown): value is number {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
}

function invalidInstall() {
    return createWatchtowerError('ERR_INVALID_LANE_CONFIG', {
        operation: 'read install identity', target: 'install.json',
        remediation: 'Restore a schemaVersion 1 linked install manifest with valid version identities.'
    });
}

function unsupportedInstall() {
    return createWatchtowerError('ERR_UNSUPPORTED_VERSION', {
        operation: 'read install identity', target: 'install.json',
        remediation: 'Upgrade Watchtower or restore a supported schemaVersion 1 install manifest.'
    });
}
