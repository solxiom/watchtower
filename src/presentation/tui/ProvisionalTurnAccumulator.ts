import {
    ATTACHMENT_LIMITS, AttachmentError, type InterruptedReplacement, type NormalizedTurnChunk,
    type ProvisionalUpdate, type ProvisionalView, type TurnStreamState, turnStreamTransitionAllowed,
    type ValidatedReplacement, type ValidatedTurnResult
} from '../../contracts/tuiAttachment.js';
import {validateBoundedUsage} from '../../contracts/attachmentDetailSchema.js';
import {boundedExcerpt, type TerminalTextSanitizer, utf8Bytes} from '../../contracts/tuiConversation.js';

export interface ProvisionalTurnAccumulatorOptions {
    readonly turnId: string; readonly sanitizer: TerminalTextSanitizer;
    readonly maxChunks?: number; readonly maxBytes?: number; readonly maxPreviewBytes?: number;
}

/**
 * The sole owner of one turn's provisional stream. It keeps chunks strictly
 * ordered by their normalized index inside finite chunk and byte budgets,
 * marks every provisional view non-authoritative, and replaces that view
 * exactly once with a validated answer, an interruption, or a failure.
 *
 * It creates no proposal or effect, never treats provisional prose as an
 * answer, and never reads a journal, provider, or filesystem. Rendering may
 * coalesce what it exposes; the order recorded here is the owning order of
 * `cli-session.md §6`.
 */
export class ProvisionalTurnAccumulator {
    private state: TurnStreamState = 'PREFLIGHT';
    private readonly chunks = new Map<number, string>();
    private bytes = 0;
    private dropped = 0;
    private truncated = false;
    private readonly maxChunks: number;
    private readonly maxBytes: number;
    private readonly maxPreviewBytes: number;

    constructor(private readonly options: ProvisionalTurnAccumulatorOptions) {
        this.maxChunks = bounded(options.maxChunks, ATTACHMENT_LIMITS.maxProvisionalChunks);
        this.maxBytes = bounded(options.maxBytes, ATTACHMENT_LIMITS.maxProvisionalBytes);
        this.maxPreviewBytes = bounded(options.maxPreviewBytes, ATTACHMENT_LIMITS.maxProvisionalPreviewBytes);
    }

    current(): TurnStreamState { return this.state; }
    /** The exact turn this accumulator owns; a caller never redirects it to another turn. */
    get turnId(): string { return this.options.turnId; }

    /**
     * Appends one normalized chunk. A replayed index is idempotent rather than
     * duplicated, an out-of-turn or malformed chunk is a typed refusal, and a
     * chunk beyond the chunk/byte budget is dropped with a visible truncation
     * flag instead of growing an unbounded buffer.
     */
    append(chunk: unknown): ProvisionalUpdate {
        const normalized = this.parseChunk(chunk);
        if (this.terminal()) throw new AttachmentError('TURN_STREAM_STATE_INVALID', this.options.turnId, `A ${this.state} turn accepts no further provisional chunks.`);
        if (!turnStreamTransitionAllowed(this.state, 'PROVISIONAL')) throw new AttachmentError('TURN_STREAM_STATE_INVALID', this.options.turnId, `A ${this.state} turn cannot return to provisional streaming.`);
        const existing = this.chunks.get(normalized.index);
        if (existing !== undefined) {
            if (existing !== normalized.text) throw new AttachmentError('TURN_STREAM_CHUNK_INVALID', this.options.turnId, `Chunk ${normalized.index} was replayed with different content.`);
            return this.update(true, true, 0);
        }
        if (this.chunks.size >= this.maxChunks || this.bytes + normalized.bytes > this.maxBytes) {
            this.truncated = true;
            this.dropped += normalized.bytes;
            this.state = 'PROVISIONAL';
            return this.update(false, false, normalized.bytes);
        }
        this.chunks.set(normalized.index, normalized.text);
        this.bytes += normalized.bytes;
        this.state = 'PROVISIONAL';
        return this.update(true, false, 0);
    }

    /**
     * Replaces provisional content with the one complete schema-valid
     * response. A stale result becomes `STALE_VALIDATED` and stays advice
     * about its recorded snapshot; provisional bytes are discarded either way
     * so no partial prose survives as an answer.
     */
    validate(result: unknown): ValidatedReplacement {
        const validated = this.parseResult(result);
        if (this.state !== 'VALIDATING' && !turnStreamTransitionAllowed(this.state, 'VALIDATING')) {
            throw new AttachmentError('TURN_STREAM_STATE_INVALID', this.options.turnId, `A ${this.state} turn cannot be validated.`);
        }
        const provisional = this.text();
        const text = this.options.sanitizer.sanitize(validated.text);
        this.state = validated.stale ? 'STALE_VALIDATED' : 'VALIDATED';
        this.chunks.clear();
        this.bytes = 0;
        return Object.freeze({
            state: this.state, turnId: validated.turnId, text,
            differsFromProvisional: this.truncated || text.trim() !== provisional.trim(),
            provisionalRetained: false, authoritative: true, revision: validated.revision
        });
    }

    /** Ends the turn as interrupted; provisional bytes survive only as bounded diagnostic evidence. */
    interrupt(reason: string): InterruptedReplacement { return this.terminate('INTERRUPTED', reason); }

    /**
     * Ends the turn as failed. `cli-session.md §8` requires that a validation
     * failure leave provisional content as diagnostic evidence only, so this
     * is the sole exit for a response that never validated.
     */
    fail(reason: string): InterruptedReplacement { return this.terminate('FAILED', reason); }

    private terminate(state: 'INTERRUPTED' | 'FAILED', reason: string): InterruptedReplacement {
        if (this.terminal()) throw new AttachmentError('TURN_STREAM_STATE_INVALID', this.options.turnId, `A ${this.state} turn has already terminated.`);
        if (!isText(reason)) throw new AttachmentError('TURN_STREAM_STATE_INVALID', this.options.turnId, 'A termination reason is a non-empty string.');
        const diagnostic = boundedExcerpt(this.text(), this.maxPreviewBytes);
        this.state = state;
        this.chunks.clear();
        this.bytes = 0;
        return Object.freeze({
            state, turnId: this.options.turnId, reason, diagnosticText: diagnostic.excerpt,
            diagnosticBytes: diagnostic.bytes, authoritative: false, appliedProposal: false
        });
    }

    /** Marks the stream as awaiting validation; only a `PREFLIGHT` or `PROVISIONAL` stream may do so. */
    beginValidation(): TurnStreamState {
        if (!turnStreamTransitionAllowed(this.state, 'VALIDATING')) throw new AttachmentError('TURN_STREAM_STATE_INVALID', this.options.turnId, `A ${this.state} turn cannot begin validation.`);
        this.state = 'VALIDATING';
        return this.state;
    }

    /** The ordered provisional text, sanitized for the terminal and never presented as authoritative. */
    view(): ProvisionalView {
        const preview = boundedExcerpt(this.text(), this.maxPreviewBytes);
        return Object.freeze({
            turnId: this.options.turnId, text: preview.excerpt, bytes: this.bytes,
            chunks: this.chunks.size, authoritative: false, truncated: this.truncated || preview.truncated
        });
    }

    private text(): string {
        const ordered = [...this.chunks.keys()].sort((a, b) => a - b).map((index) => this.chunks.get(index) ?? '');
        return this.options.sanitizer.sanitize(ordered.join(''));
    }

    private update(accepted: boolean, duplicate: boolean, droppedBytes: number): ProvisionalUpdate {
        return Object.freeze({state: this.state, view: this.view(), accepted, duplicate, droppedBytes});
    }

    private terminal(): boolean { return this.state === 'VALIDATED' || this.state === 'STALE_VALIDATED' || this.state === 'INTERRUPTED' || this.state === 'FAILED'; }

    private parseChunk(value: unknown): NormalizedTurnChunk {
        const invalid = (detail: string): never => { throw new AttachmentError('TURN_STREAM_CHUNK_INVALID', this.options.turnId, detail); };
        if (!isRecord(value) || !onlyKeys(value, ['turnId', 'index', 'text', 'bytes'])) return invalid('The chunk is not a closed normalized chunk envelope.');
        if (value.turnId !== this.options.turnId) return invalid('The chunk belongs to another turn.');
        if (!isCount(value.index)) return invalid('The chunk index is not a non-negative integer.');
        if (typeof value.text !== 'string') return invalid('The chunk text is not a string.');
        if (!isCount(value.bytes) || value.bytes !== utf8Bytes(value.text)) return invalid('The chunk byte count does not match its text.');
        return Object.freeze({turnId: value.turnId, index: value.index, text: value.text, bytes: value.bytes});
    }

    private parseResult(value: unknown): ValidatedTurnResult {
        const invalid = (detail: string): never => { throw new AttachmentError('OPERATOR_SESSION_RESPONSE_INVALID', this.options.turnId, detail); };
        if (!isRecord(value) || !onlyKeys(value, ['turnId', 'text', 'stale', 'revision', 'usage'])) return invalid('The result is not a closed validated-result envelope.');
        if (value.turnId !== this.options.turnId) return invalid('The result belongs to another turn.');
        if (typeof value.text !== 'string' || value.text.length === 0) return invalid('A validated answer carries non-empty text.');
        if (typeof value.stale !== 'boolean' || !isCount(value.revision)) return invalid('The result staleness or revision is not a closed value.');
        return Object.freeze({
            turnId: value.turnId, text: value.text, stale: value.stale, revision: value.revision,
            usage: validateBoundedUsage(value.usage, this.options.turnId)
        });
    }
}

function bounded(value: number | undefined, hardMaximum: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) return hardMaximum;
    return Math.min(Math.floor(value), hardMaximum);
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype; }
function onlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean { return Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key)); }
function isText(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function isCount(value: unknown): value is number { return Number.isInteger(value) && (value as number) >= 0; }
