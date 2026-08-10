import {boundedExcerpt, boundedLimit, CONVERSATION_LIMITS, utf8Bytes, type PasteCapsule} from '../../contracts/tuiConversation.js';

/**
 * The bounded attachment-local owner of paste payloads (`cli-session.md §10`).
 * A large paste becomes a reversible capsule: the composer text carries only a
 * counts-only placeholder while this store holds the exact bounded payload so
 * expansion and submission use the exact pasted content.
 *
 * Byte lifetime and privacy are owned here and nowhere else: retained payloads
 * never exceed `maxPasteBytes` in total, an over-limit paste is never retained
 * at all, the oldest payload is surrendered before the budget is exceeded, and
 * `clear()` drops every payload. No payload is ever written to a draft file, a
 * journal, an index, or a model request — only the placeholder is.
 */
export class PasteCapsuleStore {
    private entries: readonly {readonly capsule: PasteCapsule; readonly payload: string | null}[] = [];
    private issued = 0;

    private readonly budgetBytes: number;

    constructor(budgetBytes: number = CONVERSATION_LIMITS.maxPasteBytes) {
        this.budgetBytes = boundedLimit(budgetBytes, CONVERSATION_LIMITS.maxPasteBytes);
    }

    /** Capture one paste. The returned capsule states whether its exact content is reversible. */
    capture(text: string): PasteCapsule {
        const bytes = utf8Bytes(text);
        const preview = boundedExcerpt(text, CONVERSATION_LIMITS.maxExcerptBytes);
        const overLimit = bytes > this.budgetBytes;
        this.issued += 1;
        const capsule = Object.freeze({
            capsuleId: `paste-${this.issued}`, bytes, lines: text.split('\n').length,
            truncated: overLimit, preview: preview.excerpt, reversible: !overLimit
        });
        this.entries = Object.freeze([...this.surrenderFor(overLimit ? 0 : bytes), {capsule, payload: overLimit ? null : text}]);
        return capsule;
    }

    capsules(): readonly PasteCapsule[] { return Object.freeze(this.entries.map((entry) => entry.capsule)); }
    retainedBytes(): number { return this.entries.reduce((total, entry) => total + utf8Bytes(entry.payload ?? ''), 0); }
    payload(capsuleId: string): string | null { return this.entries.find((entry) => entry.capsule.capsuleId === capsuleId)?.payload ?? null; }

    /** The counts-only inline placeholder; it never carries pasted content. */
    placeholder(capsule: PasteCapsule): string {
        return `⟦${capsule.capsuleId}: ${capsule.lines} lines, ${capsule.bytes} bytes⟧`;
    }

    /** Replace every retained capsule placeholder in `text` with its exact payload. */
    expand(text: string): string {
        return this.entries.reduce((carry, entry) => (entry.payload === null ? carry : carry.split(this.placeholder(entry.capsule)).join(entry.payload)), text);
    }

    /** Drop one payload while keeping its counts visible; the capsule stops being reversible. */
    forget(capsuleId: string): void {
        this.entries = Object.freeze(this.entries.map((entry) => entry.capsule.capsuleId === capsuleId
            ? {capsule: Object.freeze({...entry.capsule, reversible: false}), payload: null}
            : entry));
    }

    /** Privacy boundary: every retained payload is dropped together with its capsule. */
    clear(): void { this.entries = Object.freeze([]); }

    /** Surrender the oldest payloads until `incoming` bytes fit inside the declared budget. */
    private surrenderFor(incoming: number): readonly {readonly capsule: PasteCapsule; readonly payload: string | null}[] {
        let entries = [...this.entries];
        let retained = this.retainedBytes();
        for (let index = 0; index < entries.length && retained + incoming > this.budgetBytes; index += 1) {
            const entry = entries[index];
            if (entry.payload === null) continue;
            retained -= utf8Bytes(entry.payload);
            entries = entries.map((candidate, position) => position === index
                ? {capsule: Object.freeze({...candidate.capsule, reversible: false}), payload: null}
                : candidate);
        }
        return entries;
    }
}
