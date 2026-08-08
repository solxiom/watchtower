/**
 * Per-candidate disposition and report assembly for one watcher poll (CA-13).
 *
 * Split out of `WatcherPoller` so that owner sequences §14 steps 1–5 and 10 and
 * nothing else. Two things live here, both pure: what one candidate's outcome
 * *was*, and how a window of those outcomes becomes the closed
 * `WatcherPollReport`.
 *
 * `settled` is the load-bearing field. It answers one question — may the single
 * cursor position move past this event? — and it is deliberately not the same
 * as "nothing went wrong": an enqueued trigger is a perfectly good outcome that
 * still leaves outstanding work behind it.
 */
import type {
    TriggerCandidate, WatcherPollReport
} from '../../../../contracts/coordinatorReplay.js';

/** One candidate's outcome, and whether it leaves the cursor free to move past it. */
export interface Disposition {
    readonly settled: boolean;
    readonly enqueuedTriggerId?: string;
    readonly duplicateEventId?: string;
    readonly m0EventId?: string;
    readonly m0Unhandled?: boolean;
    readonly holdApplied?: string;
    readonly invalidatedTriggerIds?: readonly string[];
}

export interface PollReportInput {
    readonly fromSequence: number;
    readonly scanned: number;
    readonly highWaterSequence: number;
    readonly reason: 'WATCHER_NO_EVENTS' | null;
    readonly ok: boolean;
    readonly cursorAdvancedTo?: string | null;
    readonly dispositions?: readonly Disposition[];
}

/**
 * The longest leading run of settled candidates. A gap is fatal to the whole
 * remainder on purpose: the cursor is a single position, so checkpointing past
 * an unhandled event would declare it handled.
 */
export function settledPrefix(
    candidates: readonly TriggerCandidate[], dispositions: readonly Disposition[]
): readonly TriggerCandidate[] {
    const stop = dispositions.findIndex((disposition) => !disposition.settled);
    return stop === -1 ? candidates : candidates.slice(0, stop);
}

export function pollReport(input: PollReportInput): WatcherPollReport {
    const dispositions = input.dispositions ?? [];
    return Object.freeze({
        ok: input.ok, reason: input.reason, fromSequence: input.fromSequence, scanned: input.scanned,
        highWaterSequence: input.highWaterSequence, cursorAdvancedTo: input.cursorAdvancedTo ?? null,
        enqueuedTriggerIds: collect(dispositions, (item) => item.enqueuedTriggerId),
        m0EventIds: collect(dispositions, (item) => item.m0EventId),
        m0UnhandledEventIds: collect(dispositions, (item) => item.m0Unhandled === true ? item.m0EventId : undefined),
        duplicateEventIds: collect(dispositions, (item) => item.duplicateEventId),
        holdsApplied: collect(dispositions, (item) => item.holdApplied),
        invalidatedTriggerIds: Object.freeze(dispositions.flatMap((item) => [...item.invalidatedTriggerIds ?? []]))
    });
}

function collect(dispositions: readonly Disposition[], pick: (item: Disposition) => string | undefined): readonly string[] {
    return Object.freeze(dispositions.map(pick).filter((value): value is string => value !== undefined));
}
