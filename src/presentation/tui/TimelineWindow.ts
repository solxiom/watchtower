import {CONVERSATION_LIMITS, type ConversationItem, type ConversationPage, type ConversationWindow, type ConversationWindowEvent, type ConversationWindowState} from '../../contracts/tuiConversation.js';

/**
 * The virtualization reducer for the retained conversation timeline: it owns
 * the finite retained set, the anchor that survives prepend, live append,
 * resize/reflow, and compaction tombstones, and nothing else. It performs no
 * I/O, holds no port, and never grows past `rows + 2 * overscan` items, so
 * memory stays proportional to the viewport plus its declared overscan.
 */
export class TimelineWindow implements ConversationWindow {
    private items: ConversationItem[] = [];
    private rows: number;
    private anchorItemId: string | null = null;
    private anchorOffset = 0;
    private revision = 0;
    private followLive = true;
    private atOldestEdge = false;
    private atLiveEdge = false;

    constructor(rows: number, private readonly overscanPages: number = CONVERSATION_LIMITS.overscanPages) {
        this.rows = Math.max(1, Math.trunc(rows));
    }

    reduce(event: ConversationWindowEvent): ConversationWindowState {
        if (event.type === 'viewport') this.resize(event.rows);
        else if (event.type === 'load') this.load(event.page);
        else if (event.type === 'scroll') this.scroll(event.delta);
        else if (event.type === 'anchor') this.anchorOn(event.itemId);
        else this.compact(event.removedItemIds, event.tombstone);
        return this.state();
    }

    /** The exact item slice a renderer draws; never longer than the viewport. */
    visible(): readonly ConversationItem[] {
        const start = this.visibleStart();
        return Object.freeze(this.items.slice(start, start + this.rows));
    }

    state(): ConversationWindowState {
        return Object.freeze({
            rows: this.rows, overscanRows: this.overscanRows(), anchorItemId: this.anchorItemId, anchorOffset: this.anchorOffset,
            retained: this.items.length, retainedCap: this.retainedCap(), revision: this.revision,
            followLive: this.followLive, atOldestEdge: this.atOldestEdge, atLiveEdge: this.atLiveEdge
        });
    }

    /** The oldest retained item, whose cursor the viewport needs to page further back. */
    oldest(): ConversationItem | null { return this.items[0] ?? null; }
    newest(): ConversationItem | null { return this.items[this.items.length - 1] ?? null; }

    private overscanRows(): number { return this.rows * Math.max(0, this.overscanPages); }
    private retainedCap(): number { return this.rows + 2 * this.overscanRows(); }
    private indexOf(itemId: string | null): number { return itemId === null ? -1 : this.items.findIndex((item) => item.itemId === itemId); }

    private visibleStart(): number {
        const anchorIndex = this.indexOf(this.anchorItemId);
        if (anchorIndex < 0) return Math.max(0, this.items.length - this.rows);
        return clamp(anchorIndex - this.anchorOffset, 0, Math.max(0, this.items.length - this.rows));
    }

    /** Resize keeps the anchored item; only the offset is clamped into the new viewport. */
    private resize(rows: number): void {
        this.rows = Math.max(1, Math.trunc(rows));
        this.anchorOffset = clamp(this.anchorOffset, 0, this.rows - 1);
        this.trim();
    }

    /** Both edge flags are declared on every page in both directions, so an initial live page stays live. */
    private load(page: ConversationPage): void {
        if (page.revision < this.revision) return;
        this.revision = page.revision;
        const known = new Set(this.items.map((item) => item.itemId));
        const fresh = page.items.filter((item) => !known.has(item.itemId));
        this.items = [...this.items, ...fresh].sort((left, right) => left.sequence - right.sequence);
        this.atOldestEdge = page.atOldestEdge;
        this.atLiveEdge = page.atLiveEdge;
        if (this.anchorItemId === null || (page.direction === 'newer' && this.followLive)) this.anchorToNewest();
        this.trim();
    }

    private anchorToNewest(): void {
        const newest = this.items[this.items.length - 1];
        if (!newest) return;
        this.anchorItemId = newest.itemId;
        this.anchorOffset = Math.min(this.rows - 1, this.items.length - 1);
        this.followLive = true;
    }

    private scroll(delta: number): void {
        const anchorIndex = this.indexOf(this.anchorItemId);
        if (anchorIndex < 0) return this.anchorToNewest();
        const next = clamp(anchorIndex + Math.trunc(delta), 0, this.items.length - 1);
        this.anchorItemId = this.items[next].itemId;
        this.followLive = next === this.items.length - 1;
    }

    /** Anchoring pins the named item to the top viewport row; an unknown item leaves the window untouched. */
    private anchorOn(itemId: string): void {
        if (this.indexOf(itemId) < 0) return;
        this.anchorItemId = itemId;
        this.anchorOffset = 0;
        this.followLive = itemId === this.items[this.items.length - 1]?.itemId;
    }

    /** Compaction replaces removed turns with one tombstone; an anchored removal re-anchors onto that tombstone. */
    private compact(removedItemIds: readonly string[], tombstone: ConversationItem): void {
        const removed = new Set(removedItemIds);
        const anchorRemoved = this.anchorItemId !== null && removed.has(this.anchorItemId);
        this.items = [...this.items.filter((item) => !removed.has(item.itemId)), tombstone]
            .sort((left, right) => left.sequence - right.sequence);
        if (anchorRemoved) this.anchorItemId = tombstone.itemId;
        this.trim();
    }

    /** Keep only the viewport plus its declared overscan, centred on the anchor. */
    private trim(): void {
        const cap = this.retainedCap();
        if (this.items.length <= cap) return;
        const anchorIndex = Math.max(0, this.indexOf(this.anchorItemId));
        const start = clamp(anchorIndex - this.anchorOffset - this.overscanRows(), 0, Math.max(0, this.items.length - cap));
        if (start > 0) this.atOldestEdge = false;
        if (start + cap < this.items.length) this.atLiveEdge = false;
        this.items = this.items.slice(start, start + cap);
    }
}

function clamp(value: number, low: number, high: number): number { return Math.min(Math.max(value, low), Math.max(low, high)); }
