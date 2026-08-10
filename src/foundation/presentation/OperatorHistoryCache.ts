import {
    boundedLimit, CONVERSATION_LIMITS, utf8Bytes,
    type ComposerDraftCache, type ComposerDraftIdentity, type DraftPruneResult, type DraftRecovery
} from '../../contracts/tuiConversation.js';
import {OperatorDraftStore, type OperatorDraftStoreOptions} from './OperatorDraftStore.js';

export interface OperatorHistoryCacheOptions extends OperatorDraftStoreOptions { readonly historyEntries?: number; }

interface HistoryEntry { readonly text: string; readonly at: number; }
interface HistoryState { readonly entries: readonly HistoryEntry[]; readonly cursor: number; }

/**
 * The optional operator-local line-editor cache of `cli-session.md §11`: bounded
 * identity-keyed command history in memory, plus the retention and privacy
 * coupling that ties that history to the durable drafts owned by
 * `OperatorDraftStore`. It is explicitly non-authoritative, has finite entry,
 * byte, and age limits, is purged whenever the matching session content is
 * pruned or purged, and never makes pruned content replayable.
 */
export class OperatorHistoryCache implements ComposerDraftCache {
    private readonly drafts: OperatorDraftStore;
    private readonly clock: () => Date;
    private readonly historyLimit: number;
    private readonly history = new Map<string, HistoryState>();

    constructor(options: OperatorHistoryCacheOptions) {
        this.drafts = new OperatorDraftStore(options);
        this.clock = options.clock ?? (() => new Date());
        this.historyLimit = boundedLimit(options.historyEntries, CONVERSATION_LIMITS.historyEntries, 1);
    }

    load(identity: ComposerDraftIdentity): Promise<DraftRecovery> { return this.drafts.load(identity); }
    save(identity: ComposerDraftIdentity, text: string): Promise<DraftRecovery> { return this.drafts.save(identity, text); }

    /** Discarding a draft also drops the matching history, so discarded text is never replayable. */
    async discard(identity: ComposerDraftIdentity): Promise<void> {
        await this.drafts.discard(identity);
        this.purge((key) => key === historyKey(identity));
    }

    /** Privacy purge or session pruning for one lane: drafts and their history go together. */
    async purgeLane(laneId: string): Promise<DraftPruneResult> {
        const removed = await this.drafts.purgeLane(laneId);
        const historyPurged = this.purge((key) => key.startsWith(`${laneId}/`));
        return Object.freeze({expired: removed, remaining: await this.drafts.count(), blocked: false, temporaryRemoved: 0, historyPurged});
    }

    /** `draftRecovery: off` removes recoverable drafts and their history only after explicit confirmation. */
    async disableRecovery(confirmed: boolean): Promise<DraftPruneResult> {
        if (!confirmed) return Object.freeze({expired: 0, remaining: await this.drafts.count(), blocked: true, temporaryRemoved: 0, historyPurged: 0});
        const removed = await this.drafts.removeAll();
        return Object.freeze({expired: removed.length, remaining: 0, blocked: false, temporaryRemoved: 0, historyPurged: this.purge(() => true)});
    }

    /** Startup maintenance: expired drafts, their history, abandoned temporaries, and aged history entries. */
    async prune(): Promise<DraftPruneResult> {
        const result = await this.drafts.prune();
        const purged = result.expiredKeys.reduce((total, key) => total + this.purge((candidate) => candidate === key), 0) + this.pruneAge();
        return Object.freeze({
            expired: result.expired, remaining: result.remaining, blocked: result.blocked,
            temporaryRemoved: result.temporaryRemoved, historyPurged: purged
        });
    }

    remember(identity: ComposerDraftIdentity, text: string): void {
        if (text.trim().length === 0 || utf8Bytes(text) > CONVERSATION_LIMITS.historyEntryBytes) return;
        const key = historyKey(identity);
        const kept = [{text, at: this.clock().getTime()}, ...this.entriesFor(key).filter((entry) => entry.text !== text)];
        this.history.set(key, {entries: this.bound(kept), cursor: 0});
    }

    historyPrevious(identity: ComposerDraftIdentity): string | null {
        const key = historyKey(identity);
        const entries = this.entriesFor(key);
        const cursor = this.history.get(key)?.cursor ?? 0;
        if (cursor >= entries.length) return null;
        this.history.set(key, {entries, cursor: cursor + 1});
        return entries[cursor].text;
    }

    historyNext(identity: ComposerDraftIdentity): string | null {
        const key = historyKey(identity);
        const entries = this.entriesFor(key);
        const cursor = this.history.get(key)?.cursor ?? 0;
        if (cursor <= 1) { this.history.set(key, {entries, cursor: 0}); return null; }
        this.history.set(key, {entries, cursor: cursor - 1});
        return entries[cursor - 2].text;
    }

    historyReset(identity: ComposerDraftIdentity): void {
        const key = historyKey(identity);
        this.history.set(key, {entries: this.entriesFor(key), cursor: 0});
    }

    /** Reverse search reads at most this identity's newest retained entries and never a durable journal. */
    historySearch(identity: ComposerDraftIdentity, query: string): readonly string[] {
        const needle = query.trim().toLowerCase();
        if (needle.length === 0 || needle.length > CONVERSATION_LIMITS.maxQueryCharacters) return Object.freeze([]);
        return Object.freeze(this.entriesFor(historyKey(identity)).filter((entry) => entry.text.toLowerCase().includes(needle)).map((entry) => entry.text));
    }

    retainedHistory(identity: ComposerDraftIdentity): readonly string[] {
        return Object.freeze(this.entriesFor(historyKey(identity)).map((entry) => entry.text));
    }

    /** Entry, byte, and age limits together; anything outside them is dropped rather than retained. */
    private bound(entries: readonly HistoryEntry[]): readonly HistoryEntry[] {
        const now = this.clock().getTime();
        const fresh = entries.filter((entry) => now - entry.at <= CONVERSATION_LIMITS.historyTtlMs).slice(0, this.historyLimit);
        const kept: HistoryEntry[] = [];
        let bytes = 0;
        for (const entry of fresh) {
            bytes += utf8Bytes(entry.text);
            if (bytes > CONVERSATION_LIMITS.historyTotalBytes) break;
            kept.push(entry);
        }
        return Object.freeze(kept);
    }

    private entriesFor(key: string): readonly HistoryEntry[] { return this.bound(this.history.get(key)?.entries ?? []); }

    private pruneAge(): number {
        let dropped = 0;
        for (const [key, state] of this.history) {
            const bounded = this.bound(state.entries);
            dropped += state.entries.length - bounded.length;
            this.history.set(key, {entries: bounded, cursor: 0});
        }
        return dropped;
    }

    private purge(matches: (key: string) => boolean): number {
        let purged = 0;
        for (const [key, state] of this.history) {
            if (!matches(key)) continue;
            purged += state.entries.length;
            this.history.delete(key);
        }
        return purged;
    }
}

/** One history stream per `{lane, session, attachment owner}`, matching the durable draft identity. */
function historyKey(identity: ComposerDraftIdentity): string {
    return `${identity.laneId}/${identity.operatorSessionId}/${identity.attachmentOwner}`;
}
