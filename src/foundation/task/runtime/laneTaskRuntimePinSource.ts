/**
 * Projects one member out of a lane's `install.json`: the `taskRuntime` pin, as
 * untrusted bytes. Version identity is read by its own accepted owner
 * (`LaneInstallIdentityReader`); this module deliberately validates nothing
 * beyond "the document parses and has a `taskRuntime` member", because the pin
 * contract belongs to `taskRuntimePin.ts`.
 */
import {createWatchtowerError} from '../../../contracts/index.js';
import {hasDuplicateJsonObjectKey} from '../../schemaComposition/jsonDuplicateKeyDetector.js';
import {ContainedLaneReadFileStore, type LaneReadFileStore} from '../../read/index.js';
import type {TaskRuntimePinSource} from './LaneTaskRunner.js';

const INSTALL_FILE = 'install.json';
const MAX_INSTALL_BYTES = 256 * 1024;

export class LaneInstallTaskRuntimePinSource implements TaskRuntimePinSource {
    constructor(private readonly files: LaneReadFileStore = new ContainedLaneReadFileStore()) {}

    readTaskRuntime(laneDir: string): unknown {
        const text = this.files.readRequired(laneDir, INSTALL_FILE, MAX_INSTALL_BYTES);
        let value: unknown;
        try {
            if (hasDuplicateJsonObjectKey(text)) throw new Error('duplicate member');
            value = JSON.parse(text);
        } catch {
            throw invalidInstall();
        }
        if (typeof value !== 'object' || value === null || Array.isArray(value)
            || !Object.hasOwn(value, 'taskRuntime')) {
            throw invalidInstall();
        }
        return (value as {taskRuntime: unknown}).taskRuntime;
    }
}

function invalidInstall() {
    return createWatchtowerError('ERR_INVALID_LANE_CONFIG', {
        operation: 'read pinned task runtime',
        target: INSTALL_FILE,
        remediation: 'Restore an install manifest that declares a taskRuntime pin.'
    });
}
