import {ConversationViewport} from '../../../src/presentation/tui/ConversationViewport.js';
import {ConversationError} from '../../../src/contracts/tuiConversation.js';
import type {
    ConversationItem, ConversationPage, ConversationPagePort, ConversationPageRequest, TerminalTextSanitizer
} from '../../../src/contracts/tuiConversation.js';

const sanitizer: TerminalTextSanitizer = {sanitize: (text) => text.replace(/[\u0000-\u001f]/gu, '\u00b7')};

function turn(sequence: number, excerpt = `body ${sequence}`): ConversationItem {
    return {
        kind: 'turn', itemId: `t${sequence}`, sequence, turnId: `turn-${sequence}`, operatorSessionId: 'opsess-1',
        role: 'operator', state: 'complete', decisionClass: 'D1', routingRuleId: 'rule-7', endpointId: 'endpoint-a',
        snapshotRevision: 9, stale: sequence === 3, completedAt: '2026-08-10T00:00:00.000Z',
        excerpt, excerptBytes: excerpt.length, originalBytes: excerpt.length, incomplete: false,
        inputTokens: 10, outputTokens: 20, telemetryQuality: 'reported'
    };
}

class FakePort implements ConversationPagePort {
    readonly calls: ConversationPageRequest[] = [];
    constructor(private readonly items: readonly ConversationItem[], public revision = 1, private readonly mutate?: (page: ConversationPage) => ConversationPage) {}
    async page(request: ConversationPageRequest, _signal: AbortSignal): Promise<ConversationPage> {
        this.calls.push(request);
        const cursor = request.cursor === null ? null : Number(request.cursor);
        const pool = request.direction === 'older'
            ? this.items.filter((item) => cursor === null || item.sequence < cursor)
            : this.items.filter((item) => cursor === null || item.sequence > cursor);
        const items = request.direction === 'older' ? pool.slice(-request.pageSize) : pool.slice(0, request.pageSize);
        const remaining = pool.length > items.length;
        const oldest = this.items[0]?.sequence ?? 0;
        const newest = this.items[this.items.length - 1]?.sequence ?? 0;
        const page: ConversationPage = {
            items, direction: request.direction, pageSize: request.pageSize, revision: this.revision, truncated: remaining,
            olderCursor: items.length > 0 && items[0].sequence > oldest ? String(items[0].sequence) : null,
            newerCursor: items.length > 0 && items[items.length - 1].sequence < newest ? String(items[items.length - 1].sequence) : null,
            atOldestEdge: items.length > 0 && items[0].sequence <= oldest,
            atLiveEdge: items.length === 0 || items[items.length - 1].sequence >= newest
        };
        return this.mutate ? this.mutate(page) : page;
    }
}

const signal = (): AbortSignal => new AbortController().signal;
const timeline = (count: number): readonly ConversationItem[] => Array.from({length: count}, (_unused, index) => turn(index + 1));

describe('CA-20 conversation viewport', () => {
    it('pages in both directions through the single bounded port and never asks for more than the maximum page', async () => {
        const port = new FakePort(timeline(300));
        const viewport = new ConversationViewport({operatorSessionId: 'opsess-1', port, sanitizer, rows: 10, pageSize: 25});
        await viewport.loadInitial(signal());
        expect(viewport.state().retained).toBe(25);
        await viewport.pageOlder(signal());
        await viewport.pageOlder(signal());
        expect(viewport.state().retained).toBeLessThanOrEqual(viewport.state().retainedCap);
        expect(port.calls.every((call) => call.pageSize <= 50 && call.operatorSessionId === 'opsess-1')).toBeTrue();
        expect(port.calls.filter((call) => call.direction === 'older').length).toBe(3);
        await viewport.pageNewer(signal());
        expect(port.calls.some((call) => call.direction === 'newer')).toBeTrue();
    });

    it('presents turn, proposal, tombstone, and provisional blocks through the shared sanitizer', async () => {
        const hostile = 'rm -rf\u001b]0;pwned\u0007 done';
        const items: readonly ConversationItem[] = [
            turn(1, hostile),
            {kind: 'proposal', itemId: 'p2', sequence: 2, proposalId: 'prop-1', proposalType: 'hold-place', state: 'proposed', sourceTurnId: 'turn-1', createdAt: 'a', expiresAt: 'b', terminal: false},
            {kind: 'proposal', itemId: 'p3', sequence: 3, proposalId: 'prop-2', proposalType: 'hold-release', state: 'expired', sourceTurnId: 'turn-1', createdAt: 'a', expiresAt: 'b', terminal: false},
            {kind: 'tombstone', itemId: 'x4', sequence: 4, removedTurns: 5, reason: 'compaction'},
            {kind: 'provisional', itemId: 'v5', sequence: 5, label: 'streaming', validated: false}
        ];
        const viewport = new ConversationViewport({operatorSessionId: 'opsess-1', port: new FakePort(items), sanitizer, rows: 10});
        await viewport.loadInitial(signal());
        const models = viewport.visible();
        expect(models.map((model) => model.kind)).toEqual(['turn', 'proposal', 'proposal', 'tombstone', 'provisional']);
        expect(models[0].lines.join(' ')).not.toContain('\u001b');
        expect(models[0].badges).toContain('endpoint endpoint-a');
        expect(models[0].accessibleLabel).toContain('operator turn turn-1');
        expect(models[1].actionable).toBeTrue();
        expect(models[2].actionable).toBeFalse();
        expect(models[2].badges).toContain('terminal');
        expect(models[3].lines[0]).toContain('5 earlier turns removed');
        expect(models[4].badges).toEqual(['provisional', 'unvalidated']);
        expect(models[4].lines.join('')).not.toContain('\u001b');
    });

    it('raises a stable typed reason for every malformed runtime page and changes no retained state', async () => {
        const cases: readonly [string, (page: ConversationPage) => ConversationPage][] = [
            ['null page', () => null as unknown as ConversationPage],
            ['non-object page', () => 'page' as unknown as ConversationPage],
            ['missing items array', (page) => ({...page, items: undefined as unknown as ConversationPage['items']})],
            ['string items', (page) => ({...page, items: 'items' as unknown as ConversationPage['items']})],
            ['oversized page', (page) => ({...page, items: [...page.items, ...page.items]})],
            ['duplicate identity', (page) => ({...page, items: [page.items[0], page.items[0]]})],
            ['wrong direction', (page) => ({...page, direction: 'newer'})],
            ['undeclared page size', (page) => ({...page, pageSize: 99})],
            ['negative revision', (page) => ({...page, revision: -1})],
            ['fractional revision', (page) => ({...page, revision: 1.5})],
            ['missing revision', (page) => ({...page, revision: undefined as unknown as number})],
            ['missing edge flag', (page) => ({...page, atLiveEdge: undefined as unknown as boolean})],
            ['non-boolean truncated', (page) => ({...page, truncated: 'yes' as unknown as boolean})],
            ['item without identity', (page) => ({...page, items: [{...page.items[0], itemId: undefined} as unknown as ConversationItem]})],
            ['item with unknown kind', (page) => ({...page, items: [{kind: 'mystery', itemId: 'x', sequence: 1} as unknown as ConversationItem]})],
            ['turn missing telemetry', (page) => ({...page, items: [{...(page.items[0] as object), telemetryQuality: 'guessed'} as unknown as ConversationItem]})],
            ['turn with wrong role', (page) => ({...page, items: [{...(page.items[0] as object), role: 'stranger'} as unknown as ConversationItem]})],
            ['null item', (page) => ({...page, items: [null as unknown as ConversationItem]})],
            ['negative sequence', (page) => ({...page, items: [{...(page.items[0] as object), sequence: -1} as unknown as ConversationItem]})],
            ['fractional sequence', (page) => ({...page, items: [{...(page.items[0] as object), sequence: 1.5} as unknown as ConversationItem]})],
            ['negative snapshot revision', (page) => ({...page, items: [{...(page.items[0] as object), snapshotRevision: -3} as unknown as ConversationItem]})],
            ['negative token count', (page) => ({...page, items: [{...(page.items[0] as object), inputTokens: -5} as unknown as ConversationItem]})],
            ['negative excerpt bytes', (page) => ({...page, items: [{...(page.items[0] as object), excerptBytes: -1} as unknown as ConversationItem]})],
            ['negative removed turns', (page) => ({...page, items: [{kind: 'tombstone', itemId: 'x', sequence: 1, removedTurns: -2, reason: 'compaction'} as unknown as ConversationItem]})]
        ];
        for (const [label, mutate] of cases) {
            const viewport = new ConversationViewport({operatorSessionId: 'opsess-1', port: new FakePort(timeline(4), 1, mutate), sanitizer, rows: 4, pageSize: 3});
            const failure = (await viewport.loadInitial(signal()).catch((cause: unknown) => cause)) as ConversationError;
            expect(failure).withContext(label).toBeInstanceOf(ConversationError);
            expect(failure.reason).withContext(label).toBe('CONVERSATION_PAGE_INVALID');
            expect(viewport.state().retained).withContext(label).toBe(0);
            expect(viewport.visible()).withContext(label).toEqual([]);
        }
        for (const cursor of ['', 42 as unknown as string]) {
            const viewport = new ConversationViewport({operatorSessionId: 'opsess-1', port: new FakePort(timeline(4), 1, (page) => ({...page, olderCursor: cursor})), sanitizer, rows: 4, pageSize: 3});
            const failure = (await viewport.loadInitial(signal()).catch((cause: unknown) => cause)) as ConversationError;
            expect(failure.reason).toBe('CONVERSATION_CURSOR_INVALID');
            expect(viewport.state().retained).toBe(0);
        }

        const port = new FakePort(timeline(60), 5);
        const viewport = new ConversationViewport({operatorSessionId: 'opsess-1', port, sanitizer, rows: 4, pageSize: 3});
        await viewport.loadInitial(signal());
        expect(viewport.state().revision).toBe(5);
        const retained = viewport.state().retained;
        port.revision = 4;
        await expectAsync(viewport.pageOlder(signal())).toBeRejectedWithError(ConversationError, /older than the retained/);
        expect(viewport.state().retained).toBe(retained);
        expect(viewport.state().revision).toBe(5);
    });

    it('treats a malformed lowered page size as the declared maximum', async () => {
        const port = new FakePort(timeline(300));
        const viewport = new ConversationViewport({operatorSessionId: 'opsess-1', port, sanitizer, rows: 10, pageSize: Number.NaN});
        await viewport.loadInitial(signal());
        expect(port.calls[0].pageSize).toBe(50);
        expect(viewport.state().retained).toBeLessThanOrEqual(viewport.state().retainedCap);
    });

    it('keeps an initially live page live and performs no second read at the live edge', async () => {
        const port = new FakePort(timeline(4));
        const viewport = new ConversationViewport({operatorSessionId: 'opsess-1', port, sanitizer, rows: 10, pageSize: 25});
        await viewport.loadInitial(signal());
        expect(viewport.state().atLiveEdge).toBeTrue();
        expect(viewport.state().atOldestEdge).toBeTrue();
        expect(port.calls.length).toBe(1);

        await viewport.pageNewer(signal());
        await viewport.pageOlder(signal());
        expect(port.calls.length).toBe(1);

        const deep = new FakePort(timeline(300));
        const paging = new ConversationViewport({operatorSessionId: 'opsess-1', port: deep, sanitizer, rows: 10, pageSize: 25});
        await paging.loadInitial(signal());
        expect(paging.state().atLiveEdge).toBeTrue();
        expect(paging.state().atOldestEdge).toBeFalse();
        await paging.pageOlder(signal());
        expect(deep.calls.map((call) => call.cursor)).toEqual([null, '276']);
    });

    it('searches only the paged index with finite query, candidate, result, excerpt, and time budgets', async () => {
        const port = new FakePort(timeline(400));
        const viewport = new ConversationViewport({operatorSessionId: 'opsess-1', port, sanitizer, rows: 10, pageSize: 25});
        await viewport.loadInitial(signal());
        const found = await viewport.search('body 39', signal());
        expect(found.scope).toBe('session-timeline-index');
        expect(found.usedModel).toBeFalse();
        expect(found.hits.length).toBeGreaterThan(0);
        expect(found.hits.every((hit) => hit.excerptBytes <= 512)).toBeTrue();
        expect(found.examined).toBeLessThanOrEqual(100);

        const broad = await viewport.search('body', signal());
        expect(broad.hits.length).toBe(25);
        expect(broad.examined).toBeLessThanOrEqual(100);
        expect(broad.truncated).toBeTrue();
        expect(broad.nextCursor).not.toBeNull();

        await expectAsync(viewport.search('   ', signal())).toBeRejectedWithError(ConversationError, /characters/);
        await expectAsync(viewport.search('x'.repeat(257), signal())).toBeRejectedWithError(ConversationError, /characters/);
        const aborted = new AbortController();
        aborted.abort();
        await expectAsync(viewport.search('body', aborted.signal)).toBeRejectedWithError(ConversationError, /cancelled/);
    });

    it('returns a continuation cursor when the local time budget expires instead of scanning further', async () => {
        const port = new FakePort(timeline(400));
        let now = 0;
        const viewport = new ConversationViewport({operatorSessionId: 'opsess-1', port, sanitizer, rows: 10, pageSize: 25, clock: () => (now += 300)});
        const page = await viewport.search('body 3', signal());
        expect(page.truncated).toBeTrue();
        expect(page.nextCursor).not.toBeNull();
        expect(page.examined).toBe(25);
        expect(port.calls.length).toBe(1);
        expect(page.stale).toBeTrue();
    });
});
