import {join} from 'node:path';
import {SessionIndexError} from '../../../contracts/index.js';
import type {ErrorCode} from '../../../contracts/index.js';
import {SessionIndex} from '../../index/index.js';
import {buildLaneFilePath} from '../../paths/index.js';
import type {DoctorCheckProvider, DoctorLaneContext} from '../DoctorCheckProvider.js';
import {fail, pass, skip, warn} from '../DoctorCheckResult.js';

const ID = 'session-index' as const;
const INDEX_RELATIVE_PATH = join('coordinator', 'index', 'sessions');
const SESSIONS_RELATIVE_PATH = join('coordinator', 'operator-sessions');
const MANIFEST_RELATIVE_PATH = join(INDEX_RELATIVE_PATH, 'index-manifest.json');

export interface SessionIndexCheckOptions {
    readonly openIndex?: (indexRoot: string, sessionsRoot: string) => Promise<{close(): Promise<void>}>;
}

/**
 * Verifies the derived session index (`coordinator/index/sessions`) still
 * admits against the operator-session journals it was built from.
 *
 * Admission is CA-16R's own `SessionIndex.open` gate — schema version, store
 * availability, semantic root, and per-session journal checkpoint drift — and
 * this provider reuses it verbatim rather than re-deriving checkpoint or
 * digest comparison, which would give the product a second answer to the same
 * question. The store is opened read-only and always closed, including on the
 * failure path. A lane with no published manifest has never built a session
 * index, which is an optional step and therefore `skip`; a manifest that
 * exists and fails admission is `fail`, except for a busy store, which is a
 * concurrent writer rather than corruption and is `warn`.
 */
export function createSessionIndexCheck(options: SessionIndexCheckOptions = {}): DoctorCheckProvider {
    const openIndex = options.openIndex
        ?? ((indexRoot: string, sessionsRoot: string) => SessionIndex.open(indexRoot, sessionsRoot));
    return {
        id: ID,
        async run(context: DoctorLaneContext) {
            const laneDir = context.lane.laneDir;
            if (context.fileSystem.inspect(buildLaneFilePath(laneDir, MANIFEST_RELATIVE_PATH)) === undefined) {
                return skip(ID, 'No session index manifest (coordinator/index/sessions/index-manifest.json) exists; this lane has never built a session index.');
            }
            let index: {close(): Promise<void>};
            try {
                index = await openIndex(buildLaneFilePath(laneDir, INDEX_RELATIVE_PATH), buildLaneFilePath(laneDir, SESSIONS_RELATIVE_PATH));
            } catch (error) {
                return reportRefusal(error);
            }
            try {
                return pass(ID, 'The session index admits cleanly against the operator-session journals it was built from.');
            } finally {
                await index.close();
            }
        }
    };
}

export const sessionIndexCheck: DoctorCheckProvider = createSessionIndexCheck();

function reportRefusal(error: unknown) {
    if (!(error instanceof SessionIndexError)) {
        return fail(ID, 'The session index could not be admitted: an unexpected error occurred.', 'ERR_INTEGRITY_FAILURE');
    }
    if (error.reason === 'SESSION_INDEX_STORE_BUSY') {
        return warn(ID, `The session index is locked by a concurrent writer and could not be admitted right now: ${error.message}.`,
            'ERR_LOCK_CONFLICT');
    }
    return fail(ID, `The session index failed admission (${error.reason}): ${error.message}.`, refusalReason(error.reason));
}

function refusalReason(reason: SessionIndexError['reason']): ErrorCode {
    switch (reason) {
        case 'SESSION_INDEX_MISSING':
        case 'SESSION_INDEX_STORE_UNAVAILABLE':
            return 'ERR_INDEX_UNAVAILABLE';
        case 'SESSION_INDEX_SCHEMA_MISMATCH':
            return 'ERR_UNSUPPORTED_VERSION';
        default:
            return 'ERR_INTEGRITY_FAILURE';
    }
}
