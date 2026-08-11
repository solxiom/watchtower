import {
    ATTACHMENT_LIMITS, type AttachmentAttentionItem, orderAttentionItems,
    presentationEventPriority, type ValidatedPresentationEvent
} from '../../contracts/tuiAttachment.js';

/**
 * The bounded P0–P5 attention ledger for one attachment. Each accepted event
 * becomes exactly one item at the priority its closed type fixes — a producer
 * can never promote its own notification class — and the retained list stays
 * ordered by priority, durable sequence, then stable event ID.
 *
 * Retention drops the low-priority tail, which is what preserves the
 * `tui-operational-experience.md §4` rule under pressure: a burst of P4/P5
 * traffic can never evict a visible P0–P2 condition. Nothing here steals
 * focus; every item is emitted with `stealsFocus: false`.
 */
export class AttachmentAttentionLedger {
    private readonly maxItems: number;

    constructor(maxItems?: number) {
        this.maxItems = typeof maxItems === 'number' && Number.isFinite(maxItems) && maxItems >= 1
            ? Math.min(Math.floor(maxItems), ATTACHMENT_LIMITS.maxAttentionItems)
            : ATTACHMENT_LIMITS.maxAttentionItems;
    }

    /** The ordered, bounded attention list after recording one event. */
    record(retained: readonly AttachmentAttentionItem[], event: ValidatedPresentationEvent): readonly AttachmentAttentionItem[] {
        return this.retain(orderAttentionItems([...retained, item(event)]));
    }

    /** The same for the lane-notification channel, which only `lane.notification` feeds. */
    recordNotification(retained: readonly AttachmentAttentionItem[], event: ValidatedPresentationEvent): readonly AttachmentAttentionItem[] {
        return event.type === 'lane.notification' ? this.record(retained, event) : retained;
    }

    private retain(items: readonly AttachmentAttentionItem[]): readonly AttachmentAttentionItem[] {
        return items.length <= this.maxItems ? items : Object.freeze(items.slice(0, this.maxItems));
    }
}

function item(event: ValidatedPresentationEvent): AttachmentAttentionItem {
    const label = typeof event.detail.label === 'string' && event.detail.label.length > 0 ? event.detail.label : event.type;
    return Object.freeze({
        priority: presentationEventPriority(event.type), sequence: event.sequence,
        eventId: event.eventId, label, type: event.type, stealsFocus: false
    });
}
