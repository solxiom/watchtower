import {createHash} from 'node:crypto';
import {lstat, mkdir, open, readdir, readFile, realpath, rename, rm} from 'node:fs/promises';
import {dirname, isAbsolute, join, relative, sep} from 'node:path';
import {
    boundedLimit, CONVERSATION_LIMITS, utf8Bytes,
    type ComposerDraftIdentity, type ComposerDraftRecord, type ConversationReason, type DraftRecovery
} from '../../contracts/tuiConversation.js';

export interface OperatorDraftStoreOptions {
    readonly dataRoot: string; readonly recovery?: 'on' | 'off'; readonly clock?: () => Date;
    readonly maxDrafts?: number; readonly ttlMs?: number;
}
export interface DraftStorePrune { readonly expired: number; readonly remaining: number; readonly blocked: boolean; readonly temporaryRemoved: number; readonly expiredKeys: readonly string[]; }

const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u;
const DIRECTORY_MODE = 0o700;
const FILE_MODE = 0o600;

/**
 * The durable half of the operator-local composer cache
 * (`tui-operational-experience.md §5`): the owner-only
 * `ui-drafts/v1/<lane>/<session>.json` store and nothing else.
 *
 * Every write is serialized per store, refuses a symlinked lane directory or
 * draft file, writes a temporary in the same owner-only directory, flushes the
 * bytes, renames atomically, and then flushes the directory so the rename
 * survives an interruption. A failed write removes its partial temporary and
 * leaves the previous authoritative bytes untouched. The store is never session
 * authority and no draft byte reaches a journal, index, ledger, or model.
 */
export class OperatorDraftStore {
    private readonly dataRoot: string;
    private readonly root: string;
    private readonly clock: () => Date;
    private readonly maxDrafts: number;
    private readonly ttlMs: number;
    private writes: Promise<unknown> = Promise.resolve();

    constructor(private readonly options: OperatorDraftStoreOptions) {
        this.dataRoot = options.dataRoot;
        this.root = join(options.dataRoot, 'ui-drafts', 'v1');
        this.clock = options.clock ?? (() => new Date());
        this.maxDrafts = boundedLimit(options.maxDrafts, CONVERSATION_LIMITS.maxDrafts, 1);
        this.ttlMs = boundedLimit(options.ttlMs, CONVERSATION_LIMITS.draftTtlMs, 1);
    }

    /** A stored draft is offered for explicit keep/discard; corrupt, foreign, or symlinked state is quarantined. */
    async load(identity: ComposerDraftIdentity): Promise<DraftRecovery> {
        if (this.options.recovery === 'off') return recovery('disabled', null, 'DRAFT_DISABLED');
        const file = await this.safeFile(identity);
        if (file === null) return recovery('quarantined', null, 'DRAFT_IDENTITY_MISMATCH');
        const raw = await readFile(file, 'utf8').catch(() => null);
        if (raw === null) return recovery('none', null, null);
        const record = this.validate(raw, identity);
        if (typeof record !== 'string') return recovery('recovered', record, null);
        if (record !== 'DRAFT_EXPIRED') return recovery('quarantined', null, record);
        await rm(file, {force: true});
        return recovery('none', null, 'DRAFT_EXPIRED');
    }

    /** Serialized owner-only durable replacement; over-limit text and a saturated store keep the text in memory. */
    async save(identity: ComposerDraftIdentity, text: string): Promise<DraftRecovery> {
        if (this.options.recovery === 'off') return recovery('disabled', null, 'DRAFT_DISABLED');
        if (utf8Bytes(text) > CONVERSATION_LIMITS.maxComposerBytes) return recovery('none', null, 'COMPOSER_INPUT_TOO_LARGE');
        return this.serialize(async () => {
            const file = await this.safeFile(identity, true);
            if (file === null) return recovery('quarantined', null, 'DRAFT_IDENTITY_MISMATCH');
            const existing = await readFile(file, 'utf8').then(() => true, () => false);
            if (!existing && (await this.prune()).blocked) return recovery('none', null, 'DRAFT_LIMIT_REACHED');
            const record = this.record(identity, text);
            await this.writeDurably(file, JSON.stringify(record));
            return recovery('recovered', record, null);
        });
    }

    /** Serialized with `save` so a privacy deletion can never interleave with a durable write. */
    async discard(identity: ComposerDraftIdentity): Promise<void> {
        await this.serialize(async () => {
            const file = await this.safeFile(identity);
            if (file !== null) await rm(file, {force: true});
        });
    }

    /** Remove every recoverable draft for one lane; the caller couples the matching history purge. */
    /** Serialized with `save`; the whole lane subtree goes, including any owner file inside it. */
    async purgeLane(laneId: string): Promise<number> {
        if (!SEGMENT.test(laneId)) return 0;
        return this.serialize(async () => {
            const before = (await this.list()).filter((entry) => entry.key.startsWith(`${laneId}/`)).length;
            await rm(join(this.root, laneId), {recursive: true, force: true});
            return before;
        });
    }

    async removeAll(): Promise<readonly string[]> {
        return this.serialize(async () => {
            const entries = await this.list();
            for (const entry of entries) await rm(entry.file, {force: true});
            return Object.freeze(entries.map((entry) => entry.key));
        });
    }

    async count(): Promise<number> { return (await this.list()).filter((entry) => !entry.temporary).length; }

    /** Safe-startup maintenance: expired drafts plus abandoned atomic-write temporaries. */
    async prune(): Promise<DraftStorePrune> {
        const entries = await this.list();
        const temporaries = entries.filter((entry) => entry.temporary);
        for (const entry of temporaries) await rm(entry.file, {force: true});
        const drafts = entries.filter((entry) => !entry.temporary);
        const expired = drafts.filter((entry) => this.clock().getTime() - entry.updatedAt > this.ttlMs);
        for (const entry of expired) await rm(entry.file, {force: true});
        const remaining = drafts.length - expired.length;
        return Object.freeze({
            expired: expired.length, remaining, blocked: remaining >= this.maxDrafts,
            temporaryRemoved: temporaries.length, expiredKeys: Object.freeze(expired.map((entry) => entry.key))
        });
    }

    private serialize<T>(work: () => Promise<T>): Promise<T> {
        const next = this.writes.then(work, work);
        this.writes = next.then(() => undefined, () => undefined);
        return next;
    }

    /** Write, flush, rename, flush the directory; a failure removes the partial temporary. */
    private async writeDurably(file: string, contents: string): Promise<void> {
        const temporary = `${file}.tmp-${process.pid}-${this.clock().getTime()}`;
        try {
            const handle = await open(temporary, 'wx', FILE_MODE);
            try { await handle.writeFile(contents, 'utf8'); await handle.sync(); } finally { await handle.close(); }
            await rename(temporary, file);
        } catch (cause) {
            await rm(temporary, {force: true});
            throw cause;
        }
        const directory = await open(dirname(file), 'r');
        try { await directory.sync(); } finally { await directory.close(); }
    }

    private record(identity: ComposerDraftIdentity, text: string): ComposerDraftRecord {
        return Object.freeze({
            schemaVersion: 1, laneId: identity.laneId, operatorSessionId: identity.operatorSessionId,
            attachmentOwner: identity.attachmentOwner, text, updatedAt: this.clock().toISOString(),
            byteLength: utf8Bytes(text), checksum: checksum(text)
        });
    }

    /** Stored bytes are `unknown` until they validate; a mismatch is quarantined rather than presented. */
    private validate(raw: string, identity: ComposerDraftIdentity): ComposerDraftRecord | ConversationReason {
        let parsed: unknown;
        try { parsed = JSON.parse(raw); } catch { return 'DRAFT_CORRUPT'; }
        if (!isRecord(parsed) || parsed.schemaVersion !== 1 || typeof parsed.text !== 'string' || typeof parsed.updatedAt !== 'string'
            || parsed.byteLength !== utf8Bytes(parsed.text) || parsed.checksum !== checksum(parsed.text)
            || Object.keys(parsed).length !== 8) return 'DRAFT_CORRUPT';
        if (parsed.laneId !== identity.laneId || parsed.operatorSessionId !== identity.operatorSessionId
            || parsed.attachmentOwner !== identity.attachmentOwner) return 'DRAFT_IDENTITY_MISMATCH';
        const updatedAt = Date.parse(parsed.updatedAt);
        if (!Number.isFinite(updatedAt)) return 'DRAFT_CORRUPT';
        if (this.clock().getTime() - updatedAt > this.ttlMs) return 'DRAFT_EXPIRED';
        return Object.freeze(parsed as unknown as ComposerDraftRecord);
    }

    /**
     * The draft path is one validated segment per identity component —
     * `<lane>/<session>/<attachment owner>.json` — so one owner can never
     * overwrite another owner's draft for the same session.
     *
     * Containment starts at the **configured data root itself**: that root must
     * already exist as a real directory, never a symlink and never a file, so a
     * symlinked or relocated data root cannot redirect the whole store. Every
     * component below it — `ui-drafts`, `v1`, `<lane>`, `<session>`, and the
     * draft file — is `lstat`ed immediately before use, which keeps the check
     * race-resistant rather than a single up-front canonicalization. The
     * canonical deepest existing ancestor is then proved to be inside the
     * canonical data root, so a component swapped between checks still cannot
     * place a write outside the authorized tree.
     */
    private async safeFile(identity: ComposerDraftIdentity, create = false): Promise<string | null> {
        if (!SEGMENT.test(identity.laneId) || !SEGMENT.test(identity.operatorSessionId) || !SEGMENT.test(identity.attachmentOwner)) return null;
        const configuredRoot = await lstat(this.dataRoot).catch(() => null);
        if (!configuredRoot || !configuredRoot.isDirectory()) return null;
        const directories = [
            join(this.dataRoot, 'ui-drafts'), this.root,
            join(this.root, identity.laneId), join(this.root, identity.laneId, identity.operatorSessionId)
        ];
        const file = join(directories[directories.length - 1], `${identity.attachmentOwner}.json`);
        let deepest = this.dataRoot;
        for (const directory of directories) {
            const existing = await lstat(directory).catch(() => null);
            if (existing && !existing.isDirectory()) return null;
            if (!existing) {
                if (!create) return (await this.contained(deepest)) ? file : null;
                await mkdir(directory, {mode: DIRECTORY_MODE});
            }
            deepest = directory;
        }
        const existingFile = await lstat(file).catch(() => null);
        if (existingFile && !existingFile.isFile()) return null;
        return (await this.contained(deepest)) ? file : null;
    }

    /** The canonical ancestor must resolve inside the canonical configured data root. */
    private async contained(directory: string): Promise<boolean> {
        const root = await realpath(this.dataRoot).catch(() => null);
        const candidate = await realpath(directory).catch(() => null);
        if (root === null || candidate === null) return false;
        const difference = relative(root, candidate);
        return difference === '' || (!difference.startsWith(`..${sep}`) && difference !== '..' && !isAbsolute(difference));
    }

    private async list(): Promise<readonly {file: string; key: string; updatedAt: number; temporary: boolean}[]> {
        const lanes = await readdir(this.root, {withFileTypes: true}).catch(() => []);
        const entries: {file: string; key: string; updatedAt: number; temporary: boolean}[] = [];
        for (const lane of lanes.filter((entry) => entry.isDirectory() && SEGMENT.test(entry.name))) {
            const sessions = await readdir(join(this.root, lane.name), {withFileTypes: true}).catch(() => []);
            for (const session of sessions.filter((entry) => entry.isDirectory() && SEGMENT.test(entry.name))) {
                for (const name of await readdir(join(this.root, lane.name, session.name)).catch(() => [])) {
                    const file = join(this.root, lane.name, session.name, name);
                    const temporary = name.includes('.tmp-');
                    const raw = temporary ? null : await readFile(file, 'utf8').catch(() => null);
                    entries.push({file, temporary, updatedAt: updatedAtOf(raw), key: `${lane.name}/${session.name}/${name.replace(/\.json$/u, '')}`});
                }
            }
        }
        return Object.freeze(entries);
    }
}

function updatedAtOf(raw: string | null): number {
    if (raw === null) return 0;
    try {
        const parsed: unknown = JSON.parse(raw);
        return isRecord(parsed) && typeof parsed.updatedAt === 'string' ? Date.parse(parsed.updatedAt) || 0 : 0;
    } catch { return 0; }
}
function checksum(text: string): string { return `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype; }
function recovery(status: DraftRecovery['status'], record: ComposerDraftRecord | null, reason: ConversationReason | null): DraftRecovery {
    return Object.freeze({status, record, reason});
}
