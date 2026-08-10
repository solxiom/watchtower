import {CompletionController} from '../../../src/presentation/tui/CompletionController.js';
import {ConversationError} from '../../../src/contracts/tuiConversation.js';
import type {CompletionPage, CompletionPort, CompletionRequest} from '../../../src/contracts/tuiConversation.js';

class ScriptedPort implements CompletionPort {
    readonly seen: CompletionRequest[] = [];
    readonly aborted: string[] = [];
    private readonly gates = new Map<string, () => void>();
    constructor(private readonly page: (request: CompletionRequest) => CompletionPage, private readonly hold = false) {}
    async complete(request: CompletionRequest, signal: AbortSignal): Promise<CompletionPage> {
        this.seen.push(request);
        signal.addEventListener('abort', () => this.aborted.push(request.query), {once: true});
        if (this.hold) await new Promise<void>((resolve) => this.gates.set(request.query, resolve));
        return this.page(request);
    }
    release(query: string): void { this.gates.get(query)?.(); }
}

const items = (count: number, prefix = 'value'): CompletionPage['items'] =>
    Array.from({length: count}, (_unused, index) => ({value: `${prefix}-${index}`, label: `${prefix} ${index}`, detail: null}));

describe('CA-20 completion controller', () => {
    it('returns a bounded in-kind page and remembers only the newest accepted result', async () => {
        const port = new ScriptedPort((request) => ({items: items(5), kind: request.kind, revision: request.revision, truncated: true}));
        const controller = new CompletionController(port);
        const page = await controller.request('command', 'sta');
        expect(page.items.length).toBe(5);
        expect(controller.current()).toBe(page);
        expect(port.seen[0].limit).toBe(25);
        const second = await controller.request('session', 'opsess');
        expect(controller.current()).toBe(second);
        expect(controller.currentRevision()).toBe(2);
    });

    it('refuses a superseded revision so a slow result cannot replace newer input', async () => {
        const port = new ScriptedPort((request) => ({items: items(2), kind: request.kind, revision: request.revision, truncated: false}), true);
        const controller = new CompletionController(port);
        const slow = controller.request('command', 'first');
        const fast = controller.request('command', 'second');
        port.release('second');
        const winner = await fast;
        port.release('first');
        await expectAsync(slow).toBeRejectedWithError(ConversationError, /superseded|cancelled/);
        expect(port.aborted).toEqual(['first']);
        expect(controller.current()).toBe(winner);
        expect(winner.items[0].value).toBe('value-0');
    });

    it('cancels in flight work on demand and through an external signal', async () => {
        const port = new ScriptedPort((request) => ({items: items(1), kind: request.kind, revision: request.revision, truncated: false}), true);
        const controller = new CompletionController(port);
        const pending = controller.request('reference', 'batch:');
        controller.cancel();
        port.release('batch:');
        await expectAsync(pending).toBeRejectedWithError(ConversationError, /cancelled|superseded/);
        expect(controller.current()).toBeNull();

        const external = new AbortController();
        const withSignal = controller.request('reference', 'file:docs', external.signal);
        external.abort();
        port.release('file:docs');
        await expectAsync(withSignal).toBeRejectedWithError(ConversationError, /cancelled/);

        const preAborted = new AbortController();
        preAborted.abort();
        await expectAsync(controller.request('reference', 'file:', preAborted.signal)).toBeRejectedWithError(ConversationError, /cancelled before it started/);
        expect(port.seen.map((request) => request.query)).toEqual(['batch:', 'file:docs']);
    });

    it('fails closed on an over-long query, a malformed page, a foreign kind, an over-limit page, and duplicates', async () => {
        const page = (request: {kind: string; revision: number}): unknown => ({items: items(1), kind: request.kind, revision: request.revision, truncated: false});
        const controller = new CompletionController(new ScriptedPort(page as never));
        await expectAsync(controller.request('command', 'x'.repeat(257))).toBeRejectedWithError(ConversationError, /at most 256/);

        const malformed: readonly unknown[] = [
            null, 'page', 42, {}, {items: 'many', kind: 'command', revision: 1, truncated: false},
            {items: items(1), kind: 'session', revision: 1, truncated: false},
            {items: items(1), kind: 'command', revision: 1, truncated: 'no'},
            {items: items(1), kind: 'command', revision: 'one', truncated: false},
            {items: items(26), kind: 'command', revision: 1, truncated: false},
            {items: [...items(1), ...items(1)], kind: 'command', revision: 1, truncated: false},
            {items: [{value: 5, label: 'x', detail: null}], kind: 'command', revision: 1, truncated: false},
            {items: [{value: 'v', label: 'x', detail: 7}], kind: 'command', revision: 1, truncated: false}
        ];
        for (const result of malformed) {
            const port = new ScriptedPort((request) => (isRevisioned(result) ? {...result, revision: request.revision} : result) as never);
            const failing = new CompletionController(port);
            const failure = (await failing.request('command', 'sta').catch((cause: unknown) => cause)) as ConversationError;
            expect(failure).withContext(JSON.stringify(result)).toBeInstanceOf(ConversationError);
            expect(failure.reason).withContext(JSON.stringify(result)).toBe('CONVERSATION_PAGE_INVALID');
            expect(failing.current()).toBeNull();
        }

        const forged = new CompletionController(new ScriptedPort((request) => ({items: items(1), kind: request.kind, revision: request.revision + 5, truncated: false})));
        await expectAsync(forged.request('command', 'sta')).toBeRejectedWithError(ConversationError, /superseded/);
    });

    it('treats a malformed lowered limit as the declared maximum', async () => {
        const port = new ScriptedPort((request) => ({items: items(25), kind: request.kind, revision: request.revision, truncated: false}));
        const controller = new CompletionController(port, Number.NaN);
        const page = await controller.request('command', 'sta');
        expect(port.seen[0].limit).toBe(25);
        expect(page.items.length).toBe(25);

        const oversize = new CompletionController(new ScriptedPort((request) => ({items: items(26), kind: request.kind, revision: request.revision, truncated: false})), Number.NaN);
        await expectAsync(oversize.request('command', 'sta')).toBeRejectedWithError(ConversationError, /limit or item contract/);
    });

    it('keeps a validated page frozen and in-kind', async () => {
        const controller = new CompletionController(new ScriptedPort((request) => ({items: items(2), kind: request.kind, revision: request.revision, truncated: false})));
        const page = await controller.request('option', '--js');
        expect(Object.isFrozen(page)).toBeTrue();
        expect(page.kind).toBe('option');
        expect(page.items.length).toBe(2);
    });
});

function isRevisioned(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && 'revision' in value && typeof (value as {revision: unknown}).revision === 'number';
}
