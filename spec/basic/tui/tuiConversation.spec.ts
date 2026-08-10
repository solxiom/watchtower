import {
    boundedExcerpt, boundedLimit, classifySlashInput, composerContinuation, composerDeleteRange, composerMotionTarget,
    composerPreflight, conversationGraphemes, CONVERSATION_LIMITS, CONVERSATION_REASONS, ConversationError,
    timelineRows, utf8Bytes, type ComposerPreflightInput, type SlashCommandDescriptor
} from '../../../src/contracts/tuiConversation.js';

const commands: readonly SlashCommandDescriptor[] = Object.freeze([
    {commandId: 'session.msg', name: 'msg', minArgs: 0, maxArgs: 64, options: []},
    {commandId: 'lane.status', name: 'status', minArgs: 0, maxArgs: 1, options: ['--json']}
]);

const preflight = (text: string, overrides: Partial<ComposerPreflightInput> = {}): ReturnType<typeof composerPreflight> =>
    composerPreflight({text, commands, locked: false, draftStatus: 'dirty', maxBytes: 32768, expand: (value) => value, ...overrides});

describe('CA-20 conversation contract vocabulary', () => {
    it('classifies the exact slash matrix and keeps commands and command errors model-free', () => {
        const known = classifySlashInput('/status --json', commands);
        expect(known).toEqual({kind: 'known-command', commandId: 'lane.status', argv: ['--json'], usesModel: false} as never);
        expect(classifySlashInput('/status --deep', commands).kind).toBe('invalid-command');
        expect(classifySlashInput('/status one two', commands).kind).toBe('invalid-command');
        expect(classifySlashInput('/deploy now', commands)).toEqual({kind: 'unknown-command', name: 'deploy', reason: 'COMPOSER_COMMAND_UNKNOWN', usesModel: false} as never);
        expect(classifySlashInput('//status is literal', commands)).toEqual({kind: 'escaped-text', text: '/status is literal', usesModel: true} as never);
        expect(classifySlashInput('see docs/spec /status later', commands)).toEqual({kind: 'plain-text', text: 'see docs/spec /status later', usesModel: true} as never);
        for (const text of ['/status --deep', '/deploy now', '/status one two', '/status']) {
            expect(classifySlashInput(text, commands).usesModel).withContext(text).toBeFalse();
        }
    });

    it('resolves exactly one command intention, one bounded turn, or one typed refusal', () => {
        expect(preflight('/status --json')).toEqual({kind: 'command', commandId: 'lane.status', argv: ['--json'], usesModel: false} as never);
        expect(preflight('/msg summarise please')).toEqual({kind: 'message', text: 'summarise please', bytes: 16, usesModel: true} as never);
        expect(preflight('//status literally').kind).toBe('message');
        expect(preflight('plain question').kind).toBe('message');
        const refusals: readonly [string, string, Partial<ComposerPreflightInput>][] = [
            ['/nope', 'COMPOSER_COMMAND_UNKNOWN', {}],
            ['/status --deep', 'COMPOSER_COMMAND_INVALID', {}],
            ['   ', 'COMPOSER_EMPTY', {}],
            ['/msg   ', 'COMPOSER_EMPTY', {}],
            ['anything', 'COMPOSER_LOCKED', {locked: true}],
            ['anything', 'COMPOSER_DRAFT_UNRESOLVED', {draftStatus: 'recovered'}],
            ['x'.repeat(40), 'COMPOSER_INPUT_TOO_LARGE', {maxBytes: 8}]
        ];
        for (const [text, reason, overrides] of refusals) {
            const result = preflight(text, overrides);
            expect(result.kind).withContext(text).toBe('refusal');
            expect((result as {reason: string}).reason).withContext(text).toBe(reason);
            expect(result.usesModel).withContext(text).toBeFalse();
        }
    });

    it('submits the exact bounded pasted content and refuses when expansion exceeds the limit', () => {
        const expanded = preflight('before ⟦paste-1⟧ after', {expand: (text) => text.replace('⟦paste-1⟧', 'EXACT PAYLOAD')});
        expect(expanded).toEqual({kind: 'message', text: 'before EXACT PAYLOAD after', bytes: 26, usesModel: true} as never);
        const overflow = preflight('⟦paste-1⟧', {maxBytes: 16, expand: () => 'z'.repeat(64)});
        expect((overflow as {reason: string}).reason).toBe('COMPOSER_INPUT_TOO_LARGE');
    });

    it('continues a line on an odd trailing backslash and submits otherwise', () => {
        expect(composerContinuation('keep typing \\')).toBeTrue();
        expect(composerContinuation('literal backslash \\\\')).toBeFalse();
        expect(composerContinuation('three \\\\\\')).toBeTrue();
        expect(composerContinuation('plain')).toBeFalse();
    });

    it('measures, segments, and truncates text on grapheme boundaries only', () => {
        expect(conversationGraphemes('éx').length).toBe(2);
        expect(conversationGraphemes('👩‍💻!').length).toBe(2);
        expect(utf8Bytes('界')).toBe(3);
        const bounded = boundedExcerpt('界'.repeat(400), CONVERSATION_LIMITS.maxExcerptBytes);
        expect(bounded.truncated).toBeTrue();
        expect(bounded.bytes).toBeLessThanOrEqual(CONVERSATION_LIMITS.maxExcerptBytes);
        expect(bounded.excerpt.endsWith('�')).toBeFalse();
        expect(utf8Bytes(bounded.excerpt)).toBe(bounded.bytes);
        expect(boundedExcerpt('short', 512)).toEqual({excerpt: 'short', bytes: 5, truncated: false} as never);
    });

    it('moves and deletes by grapheme, word, and line without splitting a cluster', () => {
        const graphemes = conversationGraphemes('alpha beta\ngamma');
        expect(composerMotionTarget(graphemes, 10, 'line-start')).toBe(0);
        expect(composerMotionTarget(graphemes, 0, 'line-end')).toBe(10);
        expect(composerMotionTarget(graphemes, 10, 'word-left')).toBe(6);
        expect(composerMotionTarget(graphemes, 0, 'word-right')).toBe(5);
        expect(composerMotionTarget(graphemes, 12, 'up')).toBe(1);
        expect(composerMotionTarget(graphemes, 1, 'down')).toBe(12);
        expect(composerMotionTarget(graphemes, 0, 'left')).toBe(0);
        expect(composerMotionTarget(graphemes, graphemes.length, 'right')).toBe(graphemes.length);
        expect(composerDeleteRange(graphemes, 10, null, 'word')).toEqual([6, 10]);
        expect(composerDeleteRange(graphemes, 10, null, 'line')).toEqual([0, 10]);
        expect(composerDeleteRange(graphemes, 3, null, 'grapheme')).toEqual([2, 3]);
        expect(composerDeleteRange(graphemes, 3, 8, 'grapheme')).toEqual([3, 8]);
        expect(composerDeleteRange(graphemes, 0, null, 'grapheme')).toEqual([0, 0]);
    });

    it('normalizes a lowered limit and never lets a malformed one disable the bound', () => {
        expect(boundedLimit(10, 100)).toBe(10);
        expect(boundedLimit(100, 100)).toBe(100);
        expect(boundedLimit(250, 100)).toBe(100);
        expect(boundedLimit(10.9, 100)).toBe(10);
        for (const malformed of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, undefined, null, '50', {}]) {
            expect(boundedLimit(malformed, 100)).withContext(String(malformed)).toBe(100);
        }
        expect(boundedLimit(0, 100, 1)).toBe(100);
        expect(boundedLimit(1, 100, 1)).toBe(1);
    });

    it('publishes the exact section 9 and section 11 maxima and a closed refusal vocabulary', () => {
        expect(CONVERSATION_LIMITS.maxQueryCharacters).toBe(256);
        expect(CONVERSATION_LIMITS.maxSearchResults).toBe(25);
        expect(CONVERSATION_LIMITS.maxSearchCandidates).toBe(100);
        expect(CONVERSATION_LIMITS.maxExcerptBytes).toBe(512);
        expect(CONVERSATION_LIMITS.searchBudgetMs).toBe(250);
        expect(CONVERSATION_LIMITS.maxComposerBytes).toBe(32768);
        expect(CONVERSATION_LIMITS.maxDrafts).toBe(20);
        expect(CONVERSATION_LIMITS.draftTtlMs).toBe(7 * 24 * 60 * 60 * 1000);
        expect(CONVERSATION_LIMITS.historyEntries).toBe(200);
        expect(CONVERSATION_LIMITS.historyEntryBytes).toBe(4096);
        expect(CONVERSATION_LIMITS.historyTotalBytes).toBe(262144);
        expect(CONVERSATION_LIMITS.historyTtlMs).toBe(7 * 24 * 60 * 60 * 1000);
        expect(Object.isFrozen(CONVERSATION_LIMITS)).toBeTrue();
        expect(new Set(CONVERSATION_REASONS).size).toBe(CONVERSATION_REASONS.length);
        expect(new ConversationError('SEARCH_CANCELLED', 'x', 'y').name).toBe('ConversationError');
        expect(timelineRows({columns: 80, rows: 24}, 3)).toBe(19);
        expect(timelineRows({columns: 80, rows: 2}, 3)).toBe(0);
    });
});
