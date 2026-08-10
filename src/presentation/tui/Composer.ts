import {
    boundedLimit, composerContinuation, composerDeleteRange, composerMotionTarget, composerPreflight, conversationGraphemes,
    CONVERSATION_LIMITS, ConversationError, utf8Bytes,
    type ComposerDraftCache, type ComposerDraftIdentity, type ComposerEffect, type ComposerIntent,
    type ComposerPreflight, type ComposerState, type ComposerTransition, type ConversationReason,
    type DraftRecovery, type EditorDelegationCapability, type SlashCommandDescriptor
} from '../../contracts/tuiConversation.js';
import {PasteCapsuleStore} from './PasteCapsuleStore.js';

export interface ComposerOptions {
    readonly identity: ComposerDraftIdentity; readonly commands: readonly SlashCommandDescriptor[];
    readonly cache: ComposerDraftCache; readonly editor?: EditorDelegationCapability; readonly maxBytes?: number;
}

/**
 * The secure multiline composer state machine: grapheme-safe cursor/selection
 * editing, word/line deletion, bounded paste capsules, deterministic
 * submit/newline bindings, the exact slash matrix, and the operator-local
 * draft/history coupling. It performs no filesystem, journal, or provider
 * work: durable draft bytes belong to the injected cache, text operations
 * belong to the closed contract vocabulary, and submission belongs to the
 * accepted turn owner that the returned effect names.
 */
export class Composer {
    private graphemes: readonly string[] = [];
    private cursor = 0;
    private selectionAnchor: number | null = null;
    private locked = false;
    private draftStatus: ComposerState['draftStatus'] = 'clean';
    private warning: ConversationReason | null = null;
    private readonly pastes = new PasteCapsuleStore();
    private readonly maxBytes: number;

    constructor(private readonly options: ComposerOptions) {
        this.maxBytes = boundedLimit(options.maxBytes, CONVERSATION_LIMITS.maxComposerBytes, 1);
    }

    state(): ComposerState {
        const text = this.graphemes.join('');
        return Object.freeze({
            text, cursor: this.cursor, selectionAnchor: this.selectionAnchor, lines: Object.freeze(text.split('\n')),
            byteLength: utf8Bytes(text), locked: this.locked, draftStatus: this.draftStatus,
            capsules: this.pastes.capsules(), warning: this.warning
        });
    }

    reduce(intent: ComposerIntent): ComposerTransition {
        this.warning = null;
        if (intent.type === 'lock') { this.locked = intent.locked; return this.done({type: 'none'}); }
        if (this.locked) return this.reject('COMPOSER_LOCKED');
        if (intent.type === 'move') { this.moveTo(composerMotionTarget(this.graphemes, this.cursor, intent.motion), intent.select === true); return this.done({type: 'none'}); }
        if (intent.type === 'delete') { this.spliceRange(composerDeleteRange(this.graphemes, this.cursor, this.selectionAnchor, intent.unit)); return this.dirty(); }
        if (intent.type === 'submit') return this.submit();
        if (intent.type === 'recover') return this.resolveRecovery(intent.choice);
        if (intent.type === 'history' || intent.type === 'history-search') return this.recallHistory(intent);
        if (intent.type === 'clear') { this.setText(''); this.pastes.clear(); return this.done({type: 'draft-save'}); }
        if (intent.type === 'paste') return this.paste(intent.text);
        if (intent.type === 'expand') return this.expand(intent.capsuleId);
        return this.insert(intent.type === 'newline' ? '\n' : intent.text);
    }

    /** One deterministic command intention, one bounded turn, or a refusal; the composer invokes neither. */
    preflight(): ComposerPreflight {
        return composerPreflight({
            text: this.graphemes.join(''), commands: this.options.commands, locked: this.locked,
            draftStatus: this.draftStatus, maxBytes: this.maxBytes, expand: (text) => this.pastes.expand(text)
        });
    }

    /** Called only after the durable turn append is acknowledged; that is the sole draft deletion point. */
    acknowledgeSubmission(): ComposerTransition {
        this.setText('');
        this.pastes.clear(); this.draftStatus = 'clean';
        return this.done({type: 'draft-delete'});
    }

    /** Offers a recovered or quarantined draft; recovery never submits and never silently pre-fills. */
    async recover(): Promise<DraftRecovery> {
        const recovery = await this.options.cache.load(this.options.identity);
        if (recovery.status === 'recovered' && recovery.record) { this.setText(recovery.record.text); this.draftStatus = 'recovered'; }
        if (recovery.status === 'quarantined') { this.setText(''); this.draftStatus = 'quarantined'; this.warning = recovery.reason; }
        return recovery;
    }

    /** Delegates to the accepted narrow editor capability; no shell string, argument, or environment is interpolated here. */
    async openInEditor(signal: AbortSignal): Promise<ComposerTransition> {
        if (this.locked) throw new ConversationError('COMPOSER_LOCKED', 'editor', 'A locked composer never delegates to an editor or changes its text.');
        if (!this.options.editor) throw new ConversationError('COMPOSER_EDITOR_UNAVAILABLE', 'editor', 'No accepted editor capability is configured.');
        const edited = await this.options.editor.edit(this.graphemes.join(''), signal);
        if (typeof edited !== 'string' || utf8Bytes(edited) > this.maxBytes) {
            throw new ConversationError('COMPOSER_INPUT_TOO_LARGE', 'editor', `The editor returned more than ${this.maxBytes} bytes.`);
        }
        this.setText(edited);
        return this.dirty();
    }

    private insert(text: string): ComposerTransition {
        const [from, to] = composerDeleteRange(this.graphemes, this.cursor, this.selectionAnchor, 'selection');
        const inserted = conversationGraphemes(text);
        const next = [...this.graphemes.slice(0, from), ...inserted, ...this.graphemes.slice(to)];
        if (utf8Bytes(next.join('')) > this.maxBytes) return this.reject('COMPOSER_INPUT_TOO_LARGE');
        this.graphemes = Object.freeze(next);
        this.cursor = from + inserted.length;
        this.selectionAnchor = null;
        return this.dirty();
    }

    /** A large paste becomes a reversible capsule owned by `PasteCapsuleStore`; the text carries counts only. */
    private paste(text: string): ComposerTransition {
        if (utf8Bytes(text) <= CONVERSATION_LIMITS.pasteCapsuleThreshold) return this.insert(text);
        const capsule = this.pastes.capture(text);
        const transition = this.insert(this.pastes.placeholder(capsule));
        if (transition.rejected !== null) { this.pastes.forget(capsule.capsuleId); return transition; }
        if (capsule.truncated) this.warning = 'COMPOSER_INPUT_TOO_LARGE';
        return this.dirty();
    }

    /** Expand one capsule inline with its exact bounded payload, or refuse without changing the text. */
    private expand(capsuleId: string): ComposerTransition {
        const capsule = this.pastes.capsules().find((candidate) => candidate.capsuleId === capsuleId);
        const payload = this.pastes.payload(capsuleId);
        if (!capsule || payload === null) return this.reject('COMPOSER_INPUT_TOO_LARGE');
        const expanded = this.graphemes.join('').split(this.pastes.placeholder(capsule)).join(payload);
        if (utf8Bytes(expanded) > this.maxBytes) return this.reject('COMPOSER_INPUT_TOO_LARGE');
        this.setText(expanded);
        this.pastes.forget(capsuleId);
        return this.dirty();
    }

    private submit(): ComposerTransition {
        if (composerContinuation(this.graphemes.join(''))) {
            this.spliceRange([this.graphemes.length - 1, this.graphemes.length]);
            this.cursor = this.graphemes.length;
            return this.insert('\n');
        }
        const preflight = this.preflight();
        if (preflight.kind === 'refusal') return this.reject(preflight.reason);
        this.options.cache.remember(this.options.identity, this.graphemes.join(''));
        this.options.cache.historyReset(this.options.identity);
        return this.done({type: 'submit', preflight});
    }

    private resolveRecovery(choice: 'keep' | 'discard'): ComposerTransition {
        if (choice === 'discard') { this.setText(''); this.draftStatus = 'clean'; return this.done({type: 'draft-delete'}); }
        this.draftStatus = 'dirty';
        return this.done({type: 'draft-save'});
    }

    private recallHistory(intent: ComposerIntent & {type: 'history' | 'history-search'}): ComposerTransition {
        const identity = this.options.identity;
        const entry = intent.type === 'history-search'
            ? this.options.cache.historySearch(identity, intent.query)[0] ?? null
            : intent.direction === 'previous' ? this.options.cache.historyPrevious(identity) : this.options.cache.historyNext(identity);
        if (entry === null) return this.reject('COMPOSER_EMPTY');
        this.setText(entry);
        return this.dirty();
    }

    private moveTo(target: number, select: boolean): void { this.selectionAnchor = select ? this.selectionAnchor ?? this.cursor : null; this.cursor = target; }

    private setText(text: string): void {
        this.graphemes = conversationGraphemes(text);
        this.cursor = this.graphemes.length;
        this.selectionAnchor = null;
    }

    private spliceRange([from, to]: readonly [number, number]): void {
        this.graphemes = Object.freeze([...this.graphemes.slice(0, from), ...this.graphemes.slice(to)]);
        this.cursor = from;
        this.selectionAnchor = null;
    }

    private dirty(): ComposerTransition { if (this.draftStatus !== 'quarantined') this.draftStatus = 'dirty'; return this.done({type: 'draft-save'}); }
    private done(effect: ComposerEffect): ComposerTransition { return Object.freeze({state: this.state(), effect, rejected: null}); }
    private reject(reason: ConversationReason): ComposerTransition { this.warning = reason; return Object.freeze({state: this.state(), effect: NO_EFFECT, rejected: reason}); }
}

const NO_EFFECT: ComposerEffect = Object.freeze({type: 'none'});
