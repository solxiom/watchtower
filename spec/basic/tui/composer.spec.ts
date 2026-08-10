import {Composer} from '../../../src/presentation/tui/Composer.js';
import {ConversationError} from '../../../src/contracts/tuiConversation.js';
import type {
    ComposerDraftCache, ComposerDraftIdentity, ComposerDraftRecord, DraftRecovery, SlashCommandDescriptor
} from '../../../src/contracts/tuiConversation.js';

const identity: ComposerDraftIdentity = {laneId: 'lane-1', operatorSessionId: 'opsess-1', attachmentOwner: 'kavan'};
const commands: readonly SlashCommandDescriptor[] = Object.freeze([
    {commandId: 'session.msg', name: 'msg', minArgs: 0, maxArgs: 512, options: []},
    {commandId: 'lane.status', name: 'status', minArgs: 0, maxArgs: 1, options: ['--json']}
]);

class FakeCache implements ComposerDraftCache {
    remembered: string[] = [];
    saved: string[] = [];
    discarded = 0;
    recovery: DraftRecovery = {status: 'none', record: null, reason: null};
    private cursor = 0;
    constructor(private readonly history: readonly string[] = []) {}
    async load(_identity: ComposerDraftIdentity): Promise<DraftRecovery> { return this.recovery; }
    async save(_identity: ComposerDraftIdentity, text: string): Promise<DraftRecovery> { this.saved.push(text); return {status: 'recovered', record: null, reason: null}; }
    async discard(_identity: ComposerDraftIdentity): Promise<void> { this.discarded += 1; }
    historyPrevious(_identity: ComposerDraftIdentity): string | null { const entry = this.history[this.cursor] ?? null; if (entry !== null) this.cursor += 1; return entry; }
    historyNext(_identity: ComposerDraftIdentity): string | null { if (this.cursor <= 1) { this.cursor = 0; return null; } this.cursor -= 1; return this.history[this.cursor - 1]; }
    historyReset(_identity: ComposerDraftIdentity): void { this.cursor = 0; }
    historySearch(_identity: ComposerDraftIdentity, query: string): readonly string[] { return this.history.filter((entry) => entry.includes(query)); }
    remember(_identity: ComposerDraftIdentity, text: string): void { this.remembered.push(text); }
}

const record = (text: string): ComposerDraftRecord => ({
    schemaVersion: 1, laneId: identity.laneId, operatorSessionId: identity.operatorSessionId,
    attachmentOwner: identity.attachmentOwner, text, updatedAt: '2026-08-10T00:00:00.000Z', byteLength: text.length, checksum: 'sha256:x'
});

const composer = (cache: ComposerDraftCache = new FakeCache(), extra: {editor?: {edit: (text: string, signal: AbortSignal) => Promise<string>}} = {}): Composer =>
    new Composer({identity, commands, cache, ...extra});

describe('CA-20 composer editing', () => {
    it('edits multiline text by grapheme, word, line, and selection without splitting clusters', () => {
        const editor = composer();
        editor.reduce({type: 'insert', text: 'alpha beta'});
        editor.reduce({type: 'newline'});
        editor.reduce({type: 'insert', text: 'gamma'});
        expect(editor.state().lines).toEqual(['alpha beta', 'gamma']);

        editor.reduce({type: 'delete', unit: 'word'});
        expect(editor.state().text).toBe('alpha beta\n');
        editor.reduce({type: 'insert', text: 'éx'});
        editor.reduce({type: 'delete', unit: 'grapheme'});
        editor.reduce({type: 'delete', unit: 'grapheme'});
        expect(editor.state().text).toBe('alpha beta\n');

        editor.reduce({type: 'move', motion: 'up'});
        editor.reduce({type: 'move', motion: 'line-end'});
        editor.reduce({type: 'move', motion: 'line-start', select: true});
        editor.reduce({type: 'insert', text: 'replaced'});
        expect(editor.state().text).toBe('replaced\n');
        expect(editor.state().selectionAnchor).toBeNull();

        editor.reduce({type: 'delete', unit: 'line'});
        expect(editor.state().text).toBe('\n');
        editor.reduce({type: 'clear'});
        expect(editor.state()).toEqual(jasmine.objectContaining({text: '', cursor: 0, byteLength: 0}));
    });

    it('keeps a large paste reversible behind a counts-only placeholder', () => {
        const editor = composer();
        editor.reduce({type: 'paste', text: 'small paste'});
        expect(editor.state().text).toBe('small paste');
        expect(editor.state().capsules).toEqual([]);

        editor.reduce({type: 'clear'});
        const large = 'x'.repeat(2000);
        editor.reduce({type: 'paste', text: large});
        const capsule = editor.state().capsules[0];
        expect(capsule.reversible).toBeTrue();
        expect(capsule.bytes).toBe(2000);
        expect(editor.state().text).toContain('paste-1');
        expect(editor.state().text).not.toContain(large);
        expect(editor.state().byteLength).toBeLessThan(100);

        expect(editor.preflight()).toEqual(jasmine.objectContaining({kind: 'message', text: large}));
        const expanded = editor.reduce({type: 'expand', capsuleId: 'paste-1'});
        expect(expanded.state.text).toBe(large);
        expect(editor.reduce({type: 'expand', capsuleId: 'paste-1'}).rejected).toBe('COMPOSER_INPUT_TOO_LARGE');
    });

    it('never retains or submits an over-limit paste and warns before truncation', () => {
        const editor = composer();
        const huge = 'y'.repeat(40000);
        editor.reduce({type: 'paste', text: huge});
        const capsule = editor.state().capsules[0];
        expect(capsule.truncated).toBeTrue();
        expect(capsule.reversible).toBeFalse();
        expect(editor.state().warning).toBe('COMPOSER_INPUT_TOO_LARGE');
        expect(editor.state().text).not.toContain(huge);
        expect(editor.reduce({type: 'expand', capsuleId: capsule.capsuleId}).rejected).toBe('COMPOSER_INPUT_TOO_LARGE');
        expect((editor.preflight() as {text?: string}).text ?? '').not.toContain(huge);

        editor.reduce({type: 'clear'});
        expect(editor.state().capsules).toEqual([]);

        const overflow = composer();
        const rejected = overflow.reduce({type: 'insert', text: 'z'.repeat(32769)});
        expect(rejected.rejected).toBe('COMPOSER_INPUT_TOO_LARGE');
        expect(overflow.state().text).toBe('');
    });

    it('treats a malformed lowered byte limit as the hard maximum', () => {
        const editor = new Composer({identity, commands, cache: new FakeCache(), maxBytes: Number.NaN});
        expect(editor.reduce({type: 'insert', text: 'z'.repeat(32768)}).rejected).toBeNull();
        expect(editor.reduce({type: 'insert', text: 'z'}).rejected).toBe('COMPOSER_INPUT_TOO_LARGE');
        expect(editor.state().byteLength).toBe(32768);
    });

    it('continues the line on a trailing backslash instead of submitting', () => {
        const editor = composer();
        editor.reduce({type: 'insert', text: 'first line \\'});
        const continued = editor.reduce({type: 'submit'});
        expect(continued.effect.type).toBe('draft-save');
        expect(continued.state.text).toBe('first line \n');
        editor.reduce({type: 'insert', text: 'second line'});
        expect(editor.reduce({type: 'submit'}).effect.type).toBe('submit');
    });

    it('classifies every submit form and keeps commands and command errors model-free', () => {
        const matrix: readonly [string, string, boolean][] = [
            ['/status --json', 'command', false],
            ['/status --deep', 'refusal', false],
            ['/nope', 'refusal', false],
            ['//status literally', 'message', true],
            ['ask about /status', 'message', true],
            ['/msg please summarise', 'message', true]
        ];
        for (const [text, kind, usesModel] of matrix) {
            const editor = composer();
            editor.reduce({type: 'insert', text});
            const preflight = editor.preflight();
            expect(preflight.kind).withContext(text).toBe(kind as never);
            expect(preflight.usesModel).withContext(text).toBe(usesModel as never);
        }
        const unknown = composer();
        unknown.reduce({type: 'insert', text: '/nope'});
        expect(unknown.reduce({type: 'submit'}).rejected).toBe('COMPOSER_COMMAND_UNKNOWN');
        expect((unknown.preflight() as {reason: string}).reason).toBe('COMPOSER_COMMAND_UNKNOWN');

        const empty = composer();
        expect(empty.reduce({type: 'submit'}).rejected).toBe('COMPOSER_EMPTY');
        const bareMsg = composer();
        bareMsg.reduce({type: 'insert', text: '/msg   '});
        expect(bareMsg.reduce({type: 'submit'}).rejected).toBe('COMPOSER_EMPTY');
    });

    it('emits one submit effect, records history, and deletes the draft only after the durable append', () => {
        const cache = new FakeCache();
        const editor = composer(cache);
        editor.reduce({type: 'insert', text: 'hello lane'});
        const submitted = editor.reduce({type: 'submit'});
        expect(submitted.effect.type).toBe('submit');
        expect(cache.remembered).toEqual(['hello lane']);
        expect(editor.state().text).toBe('hello lane');

        const acknowledged = editor.acknowledgeSubmission();
        expect(acknowledged.effect.type).toBe('draft-delete');
        expect(editor.state().text).toBe('');
        expect(editor.state().draftStatus).toBe('clean');
    });

    it('locks the composer without losing state and refuses every mutating intent', () => {
        const editor = composer();
        editor.reduce({type: 'insert', text: 'draft text'});
        editor.reduce({type: 'lock', locked: true});
        for (const intent of [{type: 'insert' as const, text: 'more'}, {type: 'delete' as const, unit: 'line' as const}, {type: 'submit' as const}]) {
            expect(editor.reduce(intent).rejected).toBe('COMPOSER_LOCKED');
        }
        expect(editor.state().text).toBe('draft text');
        expect((editor.preflight() as {reason: string}).reason).toBe('COMPOSER_LOCKED');
        editor.reduce({type: 'lock', locked: false});
        expect(editor.reduce({type: 'insert', text: '!'}).rejected).toBeNull();
    });

    it('refuses to delegate to the editor while locked, without calling it or changing the text', async () => {
        const calls: string[] = [];
        const editor = composer(new FakeCache(), {editor: {edit: async (text) => { calls.push(text); return `${text} edited`; }}});
        editor.reduce({type: 'insert', text: 'locked body'});
        editor.reduce({type: 'lock', locked: true});
        const before = editor.state();
        await expectAsync(editor.openInEditor(new AbortController().signal)).toBeRejectedWithError(ConversationError, /locked composer/);
        expect(calls).toEqual([]);
        expect(editor.state()).toEqual(before);
        expect(editor.state().text).toBe('locked body');
    });

    it('recalls bounded local history and refuses when nothing matches', () => {
        const cache = new FakeCache(['second entry', 'first entry']);
        const editor = composer(cache);
        expect(editor.reduce({type: 'history', direction: 'previous'}).state.text).toBe('second entry');
        expect(editor.reduce({type: 'history', direction: 'previous'}).state.text).toBe('first entry');
        expect(editor.reduce({type: 'history', direction: 'next'}).state.text).toBe('second entry');
        expect(editor.reduce({type: 'history-search', query: 'first'}).state.text).toBe('first entry');
        expect(editor.reduce({type: 'history-search', query: 'absent'}).rejected).toBe('COMPOSER_EMPTY');
    });

    it('requires an explicit keep or discard for a recovered draft and quarantines a foreign one', async () => {
        const cache = new FakeCache();
        cache.recovery = {status: 'recovered', record: record('unsent words'), reason: null};
        const editor = composer(cache);
        expect((await editor.recover()).status).toBe('recovered');
        expect(editor.state().text).toBe('unsent words');
        expect(editor.state().draftStatus).toBe('recovered');
        expect((editor.preflight() as {reason: string}).reason).toBe('COMPOSER_DRAFT_UNRESOLVED');
        expect(editor.reduce({type: 'submit'}).rejected).toBe('COMPOSER_DRAFT_UNRESOLVED');
        expect(editor.reduce({type: 'recover', choice: 'keep'}).effect.type).toBe('draft-save');
        expect(editor.reduce({type: 'submit'}).effect.type).toBe('submit');

        const discarding = composer(cache);
        await discarding.recover();
        const discarded = discarding.reduce({type: 'recover', choice: 'discard'});
        expect(discarded.effect.type).toBe('draft-delete');
        expect(discarding.state().text).toBe('');

        const foreign = new FakeCache();
        foreign.recovery = {status: 'quarantined', record: null, reason: 'DRAFT_IDENTITY_MISMATCH'};
        const quarantined = composer(foreign);
        expect((await quarantined.recover()).reason).toBe('DRAFT_IDENTITY_MISMATCH');
        expect(quarantined.state().text).toBe('');
        expect(quarantined.state().draftStatus).toBe('quarantined');
    });

    it('delegates to the accepted editor capability only, with no shell string and a bounded result', async () => {
        const seen: string[] = [];
        const editor = composer(new FakeCache(), {editor: {edit: async (text) => { seen.push(text); return `${text} edited`; }}});
        editor.reduce({type: 'insert', text: 'body'});
        const transition = await editor.openInEditor(new AbortController().signal);
        expect(seen).toEqual(['body']);
        expect(transition.state.text).toBe('body edited');
        expect(transition.effect.type).toBe('draft-save');

        const oversize = composer(new FakeCache(), {editor: {edit: async () => 'z'.repeat(32769)}});
        await expectAsync(oversize.openInEditor(new AbortController().signal)).toBeRejectedWithError(ConversationError, /more than/);
        await expectAsync(composer().openInEditor(new AbortController().signal)).toBeRejectedWithError(ConversationError, /editor capability/);
    });
});
