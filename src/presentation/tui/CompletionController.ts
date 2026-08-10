import {
    boundedLimit, CONVERSATION_LIMITS, ConversationError,
    type CompletionItem, type CompletionKind, type CompletionPage, type CompletionPort
} from '../../contracts/tuiConversation.js';

/**
 * Bounded, cancellable completion for commands, options, session IDs, and
 * authorized references. Every request carries a monotonic revision: an
 * in-flight request is aborted when a newer keystroke arrives, and a result
 * tagged with a superseded revision is refused rather than allowed to replace
 * newer input. The controller owns no candidate source of its own.
 */
export class CompletionController {
    private revision = 0;
    private inFlight: AbortController | null = null;
    private page: CompletionPage | null = null;

    private readonly limit: number;

    constructor(private readonly port: CompletionPort, limit: number = CONVERSATION_LIMITS.maxCompletionItems) {
        this.limit = boundedLimit(limit, CONVERSATION_LIMITS.maxCompletionItems, 1);
    }

    /** The newest accepted page, or null when nothing has completed since the last cancellation. */
    current(): CompletionPage | null { return this.page; }
    currentRevision(): number { return this.revision; }

    /** Aborts any in-flight request and clears the presented page; the next request starts from a newer revision. */
    cancel(): void {
        this.inFlight?.abort();
        this.inFlight = null;
        this.page = null;
        this.revision += 1;
    }

    async request(kind: CompletionKind, query: string, signal?: AbortSignal): Promise<CompletionPage> {
        if ([...query].length > CONVERSATION_LIMITS.maxQueryCharacters) {
            throw new ConversationError('COMPLETION_QUERY_INVALID', kind, `Use at most ${CONVERSATION_LIMITS.maxQueryCharacters} characters.`);
        }
        if (signal?.aborted) throw new ConversationError('COMPLETION_CANCELLED', kind, 'The completion request was cancelled before it started.');
        this.inFlight?.abort();
        const controller = new AbortController();
        this.inFlight = controller;
        const revision = ++this.revision;
        const abort = (): void => controller.abort();
        signal?.addEventListener('abort', abort, {once: true});
        try {
            const page: unknown = await this.port.complete({kind, query, revision, limit: this.limit}, controller.signal);
            return this.accept(page, kind, revision, controller.signal);
        } finally {
            signal?.removeEventListener('abort', abort);
            if (this.inFlight === controller) this.inFlight = null;
        }
    }

    /**
     * A page becomes visible only when every field validates, the kind matches,
     * the limit holds, and the revision is still the newest. Nothing is
     * dereferenced before its shape is proved, so a malformed result raises the
     * stable typed reason rather than a `TypeError`, and leaves `current()` alone.
     */
    private accept(value: unknown, kind: CompletionKind, revision: number, signal: AbortSignal): CompletionPage {
        if (signal.aborted) throw new ConversationError('COMPLETION_CANCELLED', kind, 'The completion request was cancelled.');
        const invalid = (detail: string): never => { throw new ConversationError('CONVERSATION_PAGE_INVALID', kind, detail); };
        if (!isRecord(value) || !Array.isArray(value.items)) return invalid('The completion result is not a structured page with an item array.');
        if (value.kind !== kind || typeof value.truncated !== 'boolean' || !Number.isInteger(value.revision)) return invalid('The completion page violates its kind or metadata contract.');
        const items = value.items as readonly unknown[];
        if (items.length > this.limit || !items.every(isCompletionItem)) return invalid('The completion page violates its limit or item contract.');
        const typed = items as readonly CompletionItem[];
        if (new Set(typed.map((item) => item.value)).size !== typed.length) return invalid('The completion page repeats a candidate value.');
        if (value.revision !== revision || revision !== this.revision) {
            throw new ConversationError('COMPLETION_STALE', kind, 'A superseded completion result cannot replace newer input.');
        }
        this.page = Object.freeze({items: Object.freeze([...typed]), kind, revision, truncated: value.truncated});
        return this.page;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
function isCompletionItem(value: unknown): value is CompletionItem {
    return isRecord(value) && typeof value.value === 'string' && value.value.length > 0
        && typeof value.label === 'string' && (value.detail === null || typeof value.detail === 'string');
}
