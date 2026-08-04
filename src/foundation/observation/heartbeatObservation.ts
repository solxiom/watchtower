import {readFileSync} from 'node:fs';

export type HeartbeatStatus = 'fresh' | 'stale' | 'absent' | 'invalid';

export interface HeartbeatObservation {
    readonly status: HeartbeatStatus;
    readonly lastHeartbeatAt: string | null;
    readonly reason: string | null;
}

export interface HeartbeatFileReader {
    readUtf8(path: string): string | undefined;
}

export interface HeartbeatObservationOptions {
    readonly staleAfterMs: number;
    readonly now?: Date;
    readonly reader?: HeartbeatFileReader;
}

/** Read and classify a heartbeat timestamp; this operation never creates or repairs the file. */
export function observeHeartbeat(path: string, options: HeartbeatObservationOptions): HeartbeatObservation {
    const staleAfterMs = validateThreshold(options.staleAfterMs);
    const content = (options.reader ?? nodeHeartbeatFileReader).readUtf8(path);
    if (content === undefined) return {status: 'absent', lastHeartbeatAt: null, reason: null};

    const lastHeartbeatAt = content.trim();
    const timestamp = Date.parse(lastHeartbeatAt);
    if (!isIsoTimestamp(lastHeartbeatAt) || Number.isNaN(timestamp)) {
        return {status: 'invalid', lastHeartbeatAt: null, reason: 'Heartbeat timestamp is not a valid ISO date-time.'};
    }

    const ageMs = (options.now ?? new Date()).getTime() - timestamp;
    if (ageMs > staleAfterMs) {
        return {status: 'stale', lastHeartbeatAt, reason: `Last heartbeat at ${lastHeartbeatAt} exceeds the configured threshold.`};
    }
    return {status: 'fresh', lastHeartbeatAt, reason: null};
}

const nodeHeartbeatFileReader: HeartbeatFileReader = {
    readUtf8(path: string): string | undefined {
        try {
            return readFileSync(path, 'utf8');
        } catch (error: unknown) {
            if (isMissingFile(error)) return undefined;
            throw error;
        }
    }
};

function validateThreshold(value: number): number {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new TypeError('Heartbeat stale threshold must be a non-negative integer number of milliseconds.');
    }
    return value;
}

function isIsoTimestamp(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value);
}

function isMissingFile(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
