import {createHash} from 'node:crypto';
import {createWatchtowerError} from '../contracts/index.js';
import {hasDuplicateJsonObjectKey} from './schemaComposition/jsonDuplicateKeyDetector.js';

const DEFAULT_LIMIT = 50;
export const MAX_LIST_PAGE_SIZE = 200;
const MAX_CURSOR_LENGTH = 1024;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const ENCODING = /^[A-Za-z0-9_-]+$/u;

interface LaneListCursorValue {
    readonly version: 1;
    readonly offset: number;
    readonly queryDigest: string;
    readonly revision: string;
}

export function paginateLaneList<T>(input: {
    readonly items: readonly T[];
    readonly limit?: number;
    readonly cursor?: string;
    readonly queryDigest: string;
    readonly revision: string;
}): {readonly items: readonly T[]; readonly limit: number; readonly nextCursor: string | null} {
    const limit = input.limit ?? DEFAULT_LIMIT;
    validateLaneListPageInput(limit, input.cursor);
    const current = input.cursor === undefined ? undefined : decodeCursor(input.cursor);
    if (current !== undefined && (current.queryDigest !== input.queryDigest || current.revision !== input.revision ||
        current.offset >= input.items.length)) throw invalidCursor('list cursor');
    const offset = current?.offset ?? 0;
    const items = input.items.slice(offset, offset + limit);
    const nextOffset = offset + items.length;
    return {
        items,
        limit,
        nextCursor: nextOffset < input.items.length ? encodeCursor({
            version: 1, offset: nextOffset, queryDigest: input.queryDigest, revision: input.revision
        }) : null
    };
}

export function validateLaneListPageInput(limit?: number, cursor?: string): void {
    const resolvedLimit = limit ?? DEFAULT_LIMIT;
    if (!Number.isInteger(resolvedLimit) || resolvedLimit < 1 || resolvedLimit > MAX_LIST_PAGE_SIZE) {
        throw invalidCursor('page limit');
    }
    if (cursor !== undefined) decodeCursor(cursor);
}

export function digestLaneListQuery(value: {
    readonly workspace: string;
    readonly lane?: string;
    readonly initiative?: string;
    readonly verbose?: boolean;
}): string {
    return digest(JSON.stringify({
        workspace: value.workspace,
        lane: value.lane ?? null,
        initiative: value.initiative ?? null,
        verbose: value.verbose ?? false
    }));
}

function encodeCursor(value: LaneListCursorValue): string {
    return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeCursor(token: string): LaneListCursorValue {
    if (token.length === 0 || token.length > MAX_CURSOR_LENGTH || !ENCODING.test(token)) throw invalidCursor('list cursor');
    let value: unknown;
    try {
        const text = Buffer.from(token, 'base64url').toString('utf8');
        if (Buffer.from(text, 'utf8').toString('base64url') !== token || hasDuplicateJsonObjectKey(text)) {
            throw new Error('non-canonical cursor');
        }
        value = JSON.parse(text);
    } catch {
        throw invalidCursor('list cursor');
    }
    if (!isCursor(value)) throw invalidCursor('list cursor');
    return value;
}

function isCursor(value: unknown): value is LaneListCursorValue {
    return typeof value === 'object' && value !== null && !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).sort().join(',') ===
        'offset,queryDigest,revision,version' && 'version' in value && value.version === 1 &&
        'offset' in value && Number.isInteger(value.offset) && typeof value.offset === 'number' &&
        value.offset >= 1 && Number.isSafeInteger(value.offset) && 'queryDigest' in value &&
        typeof value.queryDigest === 'string' && DIGEST.test(value.queryDigest) && 'revision' in value &&
        typeof value.revision === 'string' && DIGEST.test(value.revision);
}

function digest(value: string): string {
    return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function invalidCursor(target: string) {
    return createWatchtowerError('ERR_CURSOR_INVALID', {
        operation: 'page lane list', target,
        remediation: 'Use a limit from 1 to 200 and restart listing without a stale or malformed cursor.'
    });
}
