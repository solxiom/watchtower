import {
    boundedExcerpt, CONVERSATION_LIMITS, type ConversationItemViewModel, type ConversationProvisionalItem,
    type ConversationTombstoneItem, type ConversationTurnItem, type TerminalTextSanitizer
} from '../../contracts/tuiConversation.js';

/**
 * Typed presentation of one retained turn and of the two timeline markers
 * (compaction tombstone, CA-22 provisional slot). These are pure projections:
 * every operator- or model-originated byte crosses the shared CA-23 sanitizer
 * boundary before it becomes a line, and no block reads a journal, index,
 * store, or file.
 */
export function presentTurnBlock(item: ConversationTurnItem, sanitizer: TerminalTextSanitizer): ConversationItemViewModel {
    const excerpt = boundedExcerpt(sanitizer.sanitize(item.excerpt), CONVERSATION_LIMITS.maxExcerptBytes);
    const truncated = excerpt.truncated || item.incomplete;
    const header = `${item.role === 'operator' ? 'operator' : 'watchtower'} · ${item.turnId} · ${item.state}`;
    const lines = [header, ...excerpt.excerpt.split('\n'), ...(truncated ? ['… excerpt truncated; exact text stays journal-owned'] : [])];
    return Object.freeze({
        itemId: item.itemId, kind: 'turn', role: item.role, lines: Object.freeze(lines),
        badges: turnBadges(item, truncated), accessibleLabel: turnLabel(item, truncated),
        stale: item.stale, actionable: item.state === 'running'
    });
}

export function presentTombstoneBlock(item: ConversationTombstoneItem): ConversationItemViewModel {
    const label = `${item.removedTurns} earlier turn${item.removedTurns === 1 ? '' : 's'} removed by ${item.reason}`;
    return Object.freeze({
        itemId: item.itemId, kind: 'tombstone', role: null, lines: Object.freeze([`── ${label} ──`]),
        badges: Object.freeze([item.reason]), accessibleLabel: label, stale: false, actionable: false
    });
}

/** The reserved live-edge slot. CA-20 renders it as explicitly unvalidated and never as a turn. */
export function presentProvisionalBlock(item: ConversationProvisionalItem, sanitizer: TerminalTextSanitizer): ConversationItemViewModel {
    const label = sanitizer.sanitize(item.label);
    return Object.freeze({
        itemId: item.itemId, kind: 'provisional', role: 'watchtower', lines: Object.freeze([`▌ ${label}`]),
        badges: Object.freeze(['provisional', 'unvalidated']), accessibleLabel: `provisional, not yet validated: ${label}`,
        stale: false, actionable: false
    });
}

function turnBadges(item: ConversationTurnItem, truncated: boolean): readonly string[] {
    const budget = item.inputTokens === null && item.outputTokens === null
        ? `budget ${item.telemetryQuality}`
        : `budget ${item.inputTokens ?? 0}/${item.outputTokens ?? 0} ${item.telemetryQuality}`;
    return Object.freeze([
        item.state, ...(item.decisionClass ? [item.decisionClass] : []),
        ...(item.routingRuleId ? [`rule ${item.routingRuleId}`] : []), ...(item.endpointId ? [`endpoint ${item.endpointId}`] : []),
        ...(item.snapshotRevision === null ? [] : [`revision ${item.snapshotRevision}`]),
        ...(item.stale ? ['stale'] : []), ...(truncated ? ['truncated'] : []), budget
    ]);
}

function turnLabel(item: ConversationTurnItem, truncated: boolean): string {
    const parts = [
        `${item.role} turn ${item.turnId}`, item.state, item.decisionClass ?? 'unclassified',
        item.stale ? 'stale' : 'current', truncated ? `excerpt truncated from ${item.originalBytes} bytes` : 'complete excerpt'
    ];
    return parts.join(', ');
}
