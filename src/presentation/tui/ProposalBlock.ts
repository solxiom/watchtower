import type {ConversationItemViewModel, ConversationProposalItem, TerminalTextSanitizer} from '../../contracts/tuiConversation.js';

/**
 * Typed presentation of one session proposal inside the timeline. A proposal
 * block presents identity, type, state, and expiry only: it confirms nothing,
 * revalidates nothing, and grants no authority. Terminal states (applied,
 * rejected, expired, superseded) are rendered as results and are never
 * actionable, per `tui-operational-experience.md §6`.
 */
const TERMINAL_STATES: readonly string[] = Object.freeze([
    'rejected-stale-or-illegal', 'operator-rejected', 'expired', 'effect-verified', 'superseded'
]);

export function presentProposalBlock(item: ConversationProposalItem, sanitizer: TerminalTextSanitizer): ConversationItemViewModel {
    const terminal = item.terminal || TERMINAL_STATES.includes(item.state);
    const type = sanitizer.sanitize(item.proposalType);
    const state = sanitizer.sanitize(item.state);
    const lines = Object.freeze([
        `proposal ${item.proposalId} · ${type}`,
        `state ${state}${terminal ? ' (terminal result)' : ''} · from turn ${item.sourceTurnId}`,
        `created ${item.createdAt} · expires ${item.expiresAt}`
    ]);
    return Object.freeze({
        itemId: item.itemId, kind: 'proposal', role: 'watchtower', lines,
        badges: Object.freeze([type, state, terminal ? 'terminal' : 'pending-confirmation']),
        accessibleLabel: `proposal ${item.proposalId}, type ${type}, state ${state}, ${terminal ? 'terminal result' : 'awaiting explicit confirmation'}`,
        stale: false, actionable: !terminal
    });
}

/** True when a visible proposal may still offer a confirmation affordance to the shared action owner. */
export function proposalIsActionable(item: ConversationProposalItem): boolean {
    return !item.terminal && !TERMINAL_STATES.includes(item.state);
}
