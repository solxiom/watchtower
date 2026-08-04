/**
 * The CA-02 page-cursor contract: a query digest, an offset position, and the
 * open generation's semantic root as the "index revision" — the exact
 * "encodes query digest + last returned row PK + index revision" shape the
 * batch brief specifies, with a stable offset standing in for "last returned
 * row PK" (row order is already deterministic: every list this batch pages
 * is sorted by declared primary key before slicing). Mirrors the accepted
 * `LaneListCursor.ts` shape; not shared code because that module's reason
 * vocabulary (`ERR_CURSOR_INVALID`) is a different closed contract than
 * CA-02's own `INDEX_CURSOR_INVALID`/`INDEX_LIMIT_EXCEEDED`.
 */
import {createHash} from 'node:crypto';
import {IndexQueryError} from '../../../contracts/index.js';

export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 200;
const MAX_CURSOR_LENGTH = 2048;
const CURSOR_ENCODING = /^[A-Za-z0-9_-]+$/u;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;

interface Cursor {
    readonly version: 1;
    readonly offset: number;
    readonly queryDigest: string;
    readonly revision: string;
}

export interface QueryPageResult<T> {
    readonly items: readonly T[];
    readonly nextCursor: string | null;
    readonly truncated: boolean;
    readonly totalCount: number;
}

export function digest(value: string): string {
    return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function isCursor(value: unknown): value is Cursor {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const keys = Object.keys(value).sort();
    if (keys.join(',') !== 'offset,queryDigest,revision,version') return false;
    const {version, offset, queryDigest, revision} = value as Record<string, unknown>;
    return version === 1 && typeof offset === 'number' && Number.isInteger(offset) && offset >= 0
        && typeof queryDigest === 'string' && DIGEST_PATTERN.test(queryDigest)
        && typeof revision === 'string' && DIGEST_PATTERN.test(revision);
}

function encodeCursor(value: Cursor): string {
    return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

/** Every failure here is `INDEX_CURSOR_INVALID` — a malformed, foreign, or stale-revision cursor is refused the same way. */
function decodeCursor(token: string, subject: string): Cursor {
    if (token.length === 0 || token.length > MAX_CURSOR_LENGTH || !CURSOR_ENCODING.test(token)) {
        throw new IndexQueryError('INDEX_CURSOR_INVALID', subject, 'the cursor is not a recognized encoding');
    }
    let parsed: unknown;
    try {
        const text = Buffer.from(token, 'base64url').toString('utf8');
        if (Buffer.from(text, 'utf8').toString('base64url') !== token) throw new Error('non-canonical');
        parsed = JSON.parse(text);
    } catch {
        throw new IndexQueryError('INDEX_CURSOR_INVALID', subject, 'the cursor could not be decoded');
    }
    if (!isCursor(parsed)) throw new IndexQueryError('INDEX_CURSOR_INVALID', subject, 'the cursor is not a recognized shape');
    return parsed;
}

export function validateLimit(limit: number | undefined, subject: string): number {
    const resolved = limit ?? DEFAULT_PAGE_LIMIT;
    if (!Number.isInteger(resolved) || resolved < 1 || resolved > MAX_PAGE_LIMIT) {
        throw new IndexQueryError('INDEX_LIMIT_EXCEEDED', subject, `requested page size ${String(limit)} exceeds the maximum of ${MAX_PAGE_LIMIT}`);
    }
    return resolved;
}

/** Slices an already-filtered, deterministically ordered ID list by cursor/limit; the caller resolves IDs to entries. */
export function paginateIds(input: {
    readonly ids: readonly string[];
    readonly limit?: number;
    readonly cursor?: string;
    readonly queryDigest: string;
    readonly revision: string;
    readonly subject: string;
}): {readonly pageIds: readonly string[]; readonly nextCursor: string | null; readonly truncated: boolean; readonly totalCount: number} {
    const limit = validateLimit(input.limit, input.subject);
    const current = input.cursor === undefined ? undefined : decodeCursor(input.cursor, input.subject);
    if (current !== undefined) {
        if (current.queryDigest !== input.queryDigest || current.revision !== input.revision || current.offset > input.ids.length) {
            throw new IndexQueryError('INDEX_CURSOR_INVALID', input.subject, 'the cursor does not match this query or the index has since changed');
        }
    }
    const offset = current?.offset ?? 0;
    const pageIds = input.ids.slice(offset, offset + limit);
    const nextOffset = offset + pageIds.length;
    const truncated = nextOffset < input.ids.length;
    return {
        pageIds,
        nextCursor: truncated ? encodeCursor({version: 1, offset: nextOffset, queryDigest: input.queryDigest, revision: input.revision}) : null,
        truncated,
        totalCount: input.ids.length
    };
}
