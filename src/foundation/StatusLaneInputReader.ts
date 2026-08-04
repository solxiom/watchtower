import type {RepositoryBinding, StatusWarningCode, WatchtowerError, WorkerEventRecord} from '../contracts/index.js';
import {buildLaneFilePath} from './paths/index.js';
import {parseJsonlStream} from './parsing/index.js';
import {LaneConfigProjectionReader} from './LaneConfigProjectionReader.js';
import {LaneInstallIdentityReader} from './LaneInstallIdentityReader.js';
import {ContainedLaneReadFileStore, type LaneReadFileStore} from './LaneReadFileStore.js';
import type {StatusLane} from './statusLaneTypes.js';
import {readRepositoryBindings} from './bindings/index.js';

const MAX_EVENT_BYTES = 4 * 1024 * 1024;

export interface StatusEventJournal {
    readonly records: readonly WorkerEventRecord[];
    readonly warningCount: number;
}

export class StatusLaneInputReader {
    constructor(private readonly files: LaneReadFileStore = new ContainedLaneReadFileStore()) {}

    readBindings(lane: StatusLane, warnings: StatusWarningCode[]): readonly RepositoryBinding[] {
        try {
            return readRepositoryBindings(buildLaneFilePath(lane.laneDir, 'repositories.local.json'),
                lane.manifest.repositories);
        } catch (error) {
            if (!isWatchtowerError(error) || error.code === 'ERR_PATH_ESCAPE') throw error;
            warnings.push(error.code === 'ERR_PREFLIGHT_FAILED' ? 'REPOSITORY_UNAVAILABLE' :
                'INVALID_REPOSITORY_BINDINGS');
            return [];
        }
    }

    readTmuxPrefix(lane: StatusLane, warnings?: StatusWarningCode[]): string | null {
        try {
            return new LaneConfigProjectionReader(this.files)
                .read(lane.laneDir, lane.controlHome, lane.manifest).config.TMUX_PREFIX ?? null;
        } catch (error) {
            if (!isWatchtowerError(error) || error.code === 'ERR_PATH_ESCAPE') throw error;
            warnings?.push('INVALID_LANE_CONFIG');
            return null;
        }
    }

    readInstallVersion(laneDir: string, warnings: StatusWarningCode[]): string | null {
        try { return new LaneInstallIdentityReader(this.files).read(laneDir).runtimeVersion; }
        catch (error) {
            if (!isWatchtowerError(error) || error.code === 'ERR_PATH_ESCAPE' ||
                error.code === 'ERR_UNSUPPORTED_VERSION') throw error;
            warnings.push('INVALID_INSTALL');
            return null;
        }
    }

    readEvents(laneDir: string, warnings: StatusWarningCode[]): StatusEventJournal {
        const content = this.files.readOptional(laneDir, 'state/worker-events.jsonl', MAX_EVENT_BYTES) ?? '';
        const parsed = parseJsonlStream(content);
        if (parsed.warnings.length > 0) warnings.push('DURABLE_EVENT_CORRUPT');
        return {records: parsed.records, warningCount: parsed.warnings.length};
    }

    readPackReviewEvents(laneDir: string): readonly WorkerEventRecord[] {
        const content = this.files.readOptional(laneDir, 'state/pack-review-events.jsonl', MAX_EVENT_BYTES) ?? '';
        return parseJsonlStream(content).records;
    }
}

function isWatchtowerError(error: unknown): error is WatchtowerError {
    return typeof error === 'object' && error !== null && 'code' in error;
}
