import {
    ATTACHMENT_LIMITS, type AttachmentAttentionItem, AttachmentError, type DurableCheckpoint,
    type NotificationCheckpointPort, type NotificationPage, type NotificationUpdate, orderAttentionItems,
    type PresentationEventType, presentationEventPriority, PRESENTATION_EVENT_TYPES, validateDurableCheckpoint
} from '../../contracts/tuiAttachment.js';

export interface NotificationRefreshControllerOptions {
    readonly laneId: string; readonly operatorSessionId: string; readonly port: NotificationCheckpointPort;
    readonly maxQueue?: number;
}

/**
 * Derives lane notifications mechanically from durable journal/index
 * checkpoints. It invokes no model, never advances the watcher authority
 * cursor, and produces only badge/attention data — it cannot move focus, the
 * scroll anchor, composer content, or a selected confirmation.
 *
 * Refresh is coalesced, cancellable, and visibility-aware. Coalescing never
 * loses work: callers that arrive while a poll is in flight contribute their
 * checkpoint to a single retained newest checkpoint, which is either already
 * covered by the in-flight poll or drives exactly one bounded follow-up poll.
 * Queue pressure drops the low-priority tail so a P0–P2 condition survives.
 *
 * Coalescing here is in-flight sharing, not rate limiting: it is driven by
 * durable-read concurrency, so it needs no clock. Frame-rate coalescing
 * (`ATTACHMENT_LIMITS.minRefreshIntervalMs`, `cli-session.md §6`) belongs to
 * the CA-19 render scheduler, which is a different owner.
 */
export class NotificationRefreshController {
    private checkpoint: DurableCheckpoint | null = null;
    private queue: readonly AttachmentAttentionItem[] = Object.freeze([]);
    private inFlight: Promise<NotificationUpdate> | null = null;
    private joined: Promise<NotificationUpdate> | null = null;
    private pending: DurableCheckpoint | null = null;
    private coalesced = 0;
    private visible = true;
    private confirming = false;
    private readonly maxQueue: number;

    constructor(private readonly options: NotificationRefreshControllerOptions) {
        this.maxQueue = bounded(options.maxQueue, ATTACHMENT_LIMITS.maxNotificationQueue);
    }

    /** Hidden inspector views do not poll independently; the refresh becomes a no-op read. */
    setVisible(visible: boolean): void { this.visible = visible; }
    /** While the operator confirms an effect, intrusive callouts queue instead of interrupting. */
    setConfirming(confirming: boolean): void { this.confirming = confirming; }
    /** The newest checkpoint still owed a poll, or null when every request has been covered. */
    pendingCheckpoint(): DurableCheckpoint | null { return this.pending; }
    queued(): readonly AttachmentAttentionItem[] { return this.queue; }
    current(): DurableCheckpoint | null { return this.checkpoint; }

    /**
     * Refreshes from one durable checkpoint. A caller arriving during an
     * in-flight poll starts no second durable read: its checkpoint joins the
     * retained newest checkpoint, which is either already covered or drives
     * exactly one bounded follow-up poll. It is never silently discarded.
     */
    async refresh(checkpoint: unknown, signal: AbortSignal): Promise<NotificationUpdate> {
        const validated = validateDurableCheckpoint(checkpoint, this.checkpoint);
        if (validated.laneId !== this.options.laneId) throw new AttachmentError('ATTACHMENT_CHECKPOINT_INVALID', validated.laneId, 'The checkpoint belongs to another lane.');
        if (signal.aborted) throw new AttachmentError('ATTACHMENT_WAIT_CANCELLED', validated.laneId, 'The refresh was cancelled before it started.');
        if (!this.visible) return this.settle(validated, Object.freeze([]), 0, false);
        if (this.inFlight) return this.coalesce(validated, signal);
        return this.start(validated, signal);
    }

    /** Releases queued attention at the next safe boundary; it never opens a modal or selects a choice. */
    release(): readonly AttachmentAttentionItem[] {
        if (this.confirming) return Object.freeze([]);
        const released = this.queue;
        this.queue = Object.freeze([]);
        return released;
    }

    private start(checkpoint: DurableCheckpoint, signal: AbortSignal): Promise<NotificationUpdate> {
        this.inFlight = this.read(checkpoint, signal).finally(() => { this.inFlight = null; });
        return this.inFlight;
    }

    /**
     * Joins the in-flight poll and retains the newest checkpoint. Every joined
     * caller receives the *same* promise, so when a follow-up is required they
     * all observe the follow-up result — none is handed a stale update whose
     * checkpoint predates its own request.
     */
    private coalesce(checkpoint: DurableCheckpoint, signal: AbortSignal): Promise<NotificationUpdate> {
        this.pending = newerCheckpoint(this.pending, checkpoint);
        this.coalesced += 1;
        this.joined = this.joined ?? this.inFlight!.then((update) => this.drain(update, signal));
        return this.joined;
    }

    /**
     * Resolves the joined callers exactly once. If the completed poll already
     * covers the newest retained checkpoint every caller shares that result;
     * otherwise every caller shares one bounded follow-up poll for it.
     */
    private drain(update: NotificationUpdate, signal: AbortSignal): Promise<NotificationUpdate> | NotificationUpdate {
        const outstanding = this.pending;
        this.joined = null;
        this.pending = null;
        if (!outstanding || newerCheckpoint(update.checkpoint, outstanding) === update.checkpoint) return update;
        return this.start(outstanding, signal);
    }

    private async read(checkpoint: DurableCheckpoint, signal: AbortSignal): Promise<NotificationUpdate> {
        const raw = await this.options.port.poll(checkpoint, signal);
        if (signal.aborted) throw new AttachmentError('ATTACHMENT_WAIT_CANCELLED', checkpoint.laneId, 'The refresh was cancelled while it was in flight.');
        const page = this.parsePage(raw, checkpoint);
        const coalesced = this.coalesced;
        this.coalesced = 0;
        return this.settle(page.checkpoint, page.items, coalesced, this.pending !== null);
    }

    /**
     * Merges by stable identity, orders by P0–P5, and drops the low-priority
     * tail — which is what preserves the §4 rule that a new lower-priority
     * event never displaces a visible higher-priority condition.
     */
    private settle(checkpoint: DurableCheckpoint, items: readonly AttachmentAttentionItem[], coalesced: number, deferred: boolean): NotificationUpdate {
        this.checkpoint = checkpoint;
        const merged = new Map(this.queue.map((item) => [item.eventId, item]));
        for (const item of items) merged.set(item.eventId, item);
        const ordered = orderAttentionItems([...merged.values()]);
        const dropped = Math.max(0, ordered.length - this.maxQueue);
        this.queue = dropped === 0 ? ordered : Object.freeze(ordered.slice(0, this.maxQueue));
        return Object.freeze({
            checkpoint, items: this.queue, coalesced, dropped, deferred,
            advancedWatcherCursor: false, usedModel: false
        });
    }

    /** A polled page proves lane, operator session, and checkpoint continuity before the queue is touched. */
    private parsePage(value: unknown, requested: DurableCheckpoint): NotificationPage {
        const invalid = (detail: string): never => { throw new AttachmentError('ATTACHMENT_PAGE_INVALID', requested.laneId, detail); };
        if (!isRecord(value) || !onlyKeys(value, ['laneId', 'operatorSessionId', 'checkpoint', 'items'])) return invalid('The notification page is not a closed page envelope.');
        if (value.laneId !== this.options.laneId || value.operatorSessionId !== this.options.operatorSessionId) {
            throw new AttachmentError('ATTACHMENT_IDENTITY_MISMATCH', requested.laneId, 'The notification page belongs to another lane or operator session.');
        }
        if (!Array.isArray(value.items)) return invalid('The notification page does not carry an item array.');
        if (value.items.length > ATTACHMENT_LIMITS.maxCoalescedEvents) {
            throw new AttachmentError('ATTACHMENT_QUEUE_OVERFLOW', requested.laneId, `A refresh returns at most ${ATTACHMENT_LIMITS.maxCoalescedEvents} durable items.`);
        }
        const checkpoint = validateDurableCheckpoint(value.checkpoint, requested);
        if (checkpoint.laneId !== this.options.laneId) throw new AttachmentError('ATTACHMENT_IDENTITY_MISMATCH', checkpoint.laneId, 'The page checkpoint belongs to another lane.');
        return Object.freeze({
            laneId: value.laneId, operatorSessionId: value.operatorSessionId, checkpoint,
            items: Object.freeze(value.items.map((item) => this.parseItem(item, requested)))
        });
    }

    private parseItem(value: unknown, checkpoint: DurableCheckpoint): AttachmentAttentionItem {
        const invalid = (detail: string): never => { throw new AttachmentError('ATTACHMENT_PAGE_INVALID', checkpoint.laneId, detail); };
        if (!isRecord(value) || !onlyKeys(value, ['eventId', 'sequence', 'label', 'type'])) return invalid('The notification item is not a closed durable-item envelope.');
        if (!isText(value.eventId) || !isText(value.label)) return invalid('The notification item is missing a stable identity or label.');
        if (!isCount(value.sequence)) return invalid('The notification sequence is not a non-negative integer.');
        if (!isEventType(value.type)) return invalid('The notification type is outside the closed presentation vocabulary.');
        return Object.freeze({
            priority: presentationEventPriority(value.type), sequence: value.sequence,
            eventId: value.eventId, label: value.label, type: value.type, stealsFocus: false
        });
    }
}

/**
 * Orders two checkpoints by the complete contract tuple. Sequence alone is not
 * identity: a same-sequence checkpoint at a higher revision is newer durable
 * state, and comparing only sequence silently discards it.
 */
function newerCheckpoint(left: DurableCheckpoint | null, right: DurableCheckpoint): DurableCheckpoint {
    if (left === null) return right;
    if (right.sequence !== left.sequence) return right.sequence > left.sequence ? right : left;
    return right.revision > left.revision ? right : left;
}

function bounded(value: number | undefined, hardMaximum: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) return hardMaximum;
    return Math.min(Math.floor(value), hardMaximum);
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype; }
function onlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean { return Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key)); }
function isText(value: unknown): value is string { return typeof value === 'string' && value.length > 0; }
function isCount(value: unknown): value is number { return Number.isInteger(value) && (value as number) >= 0; }
function isEventType(value: unknown): value is PresentationEventType { return typeof value === 'string' && (PRESENTATION_EVENT_TYPES as readonly string[]).includes(value); }
