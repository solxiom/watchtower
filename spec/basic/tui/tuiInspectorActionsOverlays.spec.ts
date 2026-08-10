import {FakeTuiSurface, TuiAgentProjectionError, TuiAgentProjectionPresenter, TuiActionDispatcher, TuiActionRegistry, TuiAttentionNavigator, TuiApplication, TuiBoundedSearch, TuiCommandPalette, TuiInspectorController, TuiInspectorError, TuiInspectorRegistry, TuiOverlayController, TuiOverlayError, TuiSearchError, TuiDispatchError, validateAgentProjection} from '../../../src/presentation/tui/index.js';
import {DEFAULT_TUI_PREFERENCES} from '../../../src/presentation/tui/TuiPreferences.js';
import type {NirvanaTuiAdapter, TuiCapabilities} from '../../../src/contracts/tuiAdapter.js';
import type {TuiAcceptedActionPort, TuiActionExecutionContext, TuiActionIntent, TuiActionPreview, TuiActionResult} from '../../../src/contracts/tuiActions.js';
import {TUI_SEARCH_LIMITS} from '../../../src/contracts/tuiInspector.js';
import type {TuiAgentProjection, TuiInspectorPage, TuiSearchPort} from '../../../src/contracts/tuiInspector.js';
import type {TuiAttentionItem} from '../../../src/contracts/tuiShell.js';

const context = {focus: 'composer' as const, observer: false, overlayOpen: false};
const execution = {...context, stateRevision: 'rev-1', sessionId: 'session-1'};

describe('CA-21 inspector, palette, and overlays', () => {
    it('exposes every bounded inspector view and preserves explicit page state', () => {
        const registry = new TuiInspectorRegistry();
        expect(registry.describe().map((item) => item.id)).toEqual(['sessions', 'lane', 'batches', 'agents', 'budgets', 'holds', 'proposals', 'events', 'context']);
        const page: TuiInspectorPage = {...registry.empty('events', 'rev-7'), state: 'truncated', truncated: true, nextCursor: 'next'};
        expect(registry.present(page)).toEqual(jasmine.objectContaining({state: 'truncated', revision: 'rev-7', nextCursor: 'next'}));
    });
    it('keeps query ownership bounded and makes stale/truncated states visible', async () => {
        const query = {query: async (request: {view: TuiInspectorPage['view']}) => ({schemaVersion: 1 as const, view: request.view, state: 'ready' as const, rows: [], revision: 'rev-2', stale: true, truncated: false, nextCursor: null, limit: 25, reasonCode: null})};
        const controller = new TuiInspectorController({laneId: 'lane-1', operatorSessionId: 'session-1', query});
        expect(controller.select('batches').state).toBe('loading');
        expect((await controller.load(new AbortController().signal)).state).toBe('stale');
    });
    it('renders the agent view from non-secret projection fields only', () => {
        const agent: TuiAgentProjection = {alias: 'codex-primary', adapter: 'codex', accountAlias: 'primary', modelProfile: 'medium', compatibilityTier: 'R4', chargingClass: 'standard', telemetryQuality: 'estimated', evidenceAge: '2m', snapshotAge: '1m', availability: 'available', reservation: null, assignment: 'D2', healthReason: null, lastSuccessfulCheck: '2026-08-10T10:00:00Z'};
        const page = new TuiAgentProjectionPresenter().present({state: 'ready', items: [agent], revision: 'rev-3', stale: false, truncated: false, nextCursor: null, reasonCode: null});
        expect(page.view).toBe('agents'); expect(page.rows[0].fields.some((field) => field.sensitive)).toBeFalse();
        expect(validateAgentProjection({...agent, credentialPath: '/secret'})).toBeFalse();
        expect(() => new TuiAgentProjectionPresenter().present({state: 'ready', items: [{...agent, alias: 7}], revision: 'rev-3', stale: false, truncated: false, nextCursor: null, reasonCode: null})).toThrowError(TuiAgentProjectionError, 'AGENT_PROJECTION_ITEM_INVALID');
        expect(() => new TuiAgentProjectionPresenter().present({state: 'ready', items: [agent], revision: 'rev-3', stale: false, truncated: false, nextCursor: null, reasonCode: null, extra: true})).toThrowError(TuiAgentProjectionError, 'AGENT_PROJECTION_PAGE_INVALID');
    });
    it('rejects overlong search and candidate expansion without a scan fallback', async () => {
        const port: TuiSearchPort = {search: async () => ({items: [], revision: 'rev', stale: false, truncated: false, nextCursor: null, examined: 101})};
        const search = new TuiBoundedSearch(port);
        await expectAsync(search.search({query: 'x'.repeat(257), scope: 'events'}, new AbortController().signal)).toBeRejectedWithError(TuiSearchError, 'SEARCH_QUERY_TOO_LONG');
        await expectAsync(search.search({query: 'x', scope: 'events'}, new AbortController().signal)).toBeRejectedWithError(TuiSearchError, 'SEARCH_CANDIDATE_LIMIT_EXCEEDED');
    });
    it('uses one canonical intent for slash and palette paths', () => {
        const registry = new TuiActionRegistry();
        expect(registry.parseSlash('/apply proposal-1 --dry-run')).toEqual(registry.intent('proposal.apply', {proposalId: 'proposal-1', dryRun: 'true'}));
        expect(registry.parseSlash('//not-a-command')).toBeNull();
        expect(() => registry.parseSlash('/unknown')).toThrowError('invalid-slash-command');
        const palette = new TuiCommandPalette(registry); expect(palette.select('proposal.apply', {proposalId: 'proposal-1'})).toEqual(registry.intent('proposal.apply', {proposalId: 'proposal-1'}));
    });
    it('requires fresh confirmation before the injected accepted effect bridge', async () => {
        const port = new FakeActionPort(); const dispatcher = new TuiActionDispatcher(new TuiActionRegistry(), port);
        const preview = await dispatcher.preview({actionId: 'proposal.apply', arguments: {proposalId: 'p1'}}, execution);
        expect(() => dispatcher.confirm(preview, 'session-1', 'rev-2')).toThrowError('stale-preview');
        const confirmed = dispatcher.confirm(preview, 'session-1', 'rev-1'); await dispatcher.dispatch(confirmed);
        expect(port.dispatched).toBe(1);
        const observer = await dispatcher.preview({actionId: 'proposal.apply', arguments: {proposalId: 'p1'}}, {...execution, observer: true});
        expect(observer.reason).toBe('observer-ineligible'); expect(port.previews).toBe(1);
    });
    it('traps overlays, retains cancellation, and navigates P1 through P4 only', () => {
        const overlays = new TuiOverlayController(); overlays.open({kind: 'confirmation', title: 'Confirm', reasonCode: 'CONFIRM', body: [], choices: ['confirm', 'cancel'], focusedChoice: 0});
        expect(overlays.reduce({type: 'next'}).closed).toBeFalse(); expect(overlays.reduce({type: 'choose', choice: 'cancel'}).closed).toBeTrue();
        const navigator = new TuiAttentionNavigator();
        const items: TuiAttentionItem[] = ['P5', 'P4', 'P1', 'P0'].map((priority, sequence) => ({priority: priority as TuiAttentionItem['priority'], sequence, eventId: priority, label: priority, stealsFocus: false}));
        expect(navigator.replace(items).items.map((item) => item.priority)).toEqual(['P1', 'P4']); expect(navigator.next().selectedIndex).toBe(1);
    });
    it('clamps the attention presentation window to 50 without mutating durable input', () => {
        const navigator = new TuiAttentionNavigator();
        const items: TuiAttentionItem[] = Array.from({length: 51}, (_, sequence) => ({priority: 'P1', sequence, eventId: `evt-${sequence}`, label: `Event ${sequence}`, stealsFocus: false}));
        const state = navigator.replace(items);
        expect(state.items.length).toBe(50);
        expect(state.items[0].eventId).toBe('evt-0');
        expect(state.items[49].eventId).toBe('evt-49');
        expect(items.length).toBe(51);
    });
    it('rejects malformed inspector/search contracts before changing owned state', async () => {
        const registry = new TuiInspectorRegistry(); let calls = 0;
        const query = {query: async () => { calls++; return {...registry.empty('lane'), extra: true}; }};
        const controller = new TuiInspectorController({laneId: 'lane-1', operatorSessionId: null, query});
        const before = controller.current();
        await expectAsync(controller.load(new AbortController().signal)).toBeRejectedWithError(TuiInspectorError, 'INSPECTOR_PAGE_MALFORMED');
        expect(controller.current()).toEqual(before); expect(calls).toBe(1);
        let searches = 0;
        const search = new TuiBoundedSearch({search: async () => { searches++; return {items: [], revision: 'r', stale: false, truncated: false, nextCursor: null, examined: 0, extra: true}; }});
        await expectAsync(search.search(42, new AbortController().signal)).toBeRejectedWithError(TuiSearchError, 'SEARCH_REQUEST_INVALID');
        expect(searches).toBe(0);
        await expectAsync(search.search({query: 'x', scope: 'events'}, new AbortController().signal)).toBeRejectedWithError(TuiSearchError, 'SEARCH_PAGE_INVALID');
        expect(searches).toBe(1);
    });
    it('rejects duplicate and unsupported overlay values without replacing the active overlay', () => {
        const overlays = new TuiOverlayController();
        expect(() => overlays.open({kind: 'help', title: 'Help', reasonCode: 'HELP', body: [], choices: ['close', 'close'], focusedChoice: 0})).toThrowError(TuiOverlayError, 'OVERLAY_REQUEST_INVALID');
        expect(overlays.current()).toBeNull();
        overlays.open({kind: 'details', title: 'Details', reasonCode: 'DETAILS', body: ['stable-id'], choices: ['close'], focusedChoice: 0});
        const before = overlays.current();
        expect(() => overlays.open({kind: 'details', title: 'Details', reasonCode: 'DETAILS', body: [], choices: ['close'], focusedChoice: 0, action: {actionId: 'not-real', arguments: {}}})).toThrowError(TuiOverlayError, 'OVERLAY_ACTION_INVALID');
        expect(overlays.current()).toBe(before);
        expect(() => overlays.open({kind: 'not-supported', title: 'Bad', reasonCode: 'BAD', body: [], choices: ['close'], focusedChoice: 0})).toThrowError(TuiOverlayError, 'OVERLAY_REQUEST_INVALID');
        expect(overlays.current()).toBe(before);
        expect(() => overlays.reduce({type: 'choose', choice: 'nope'})).toThrowError(TuiOverlayError, 'OVERLAY_INTENT_INVALID');
        expect(overlays.current()).toBe(before);
    });
    it('keeps the complete documented slash registry canonical with palette intents', () => {
        const registry = new TuiActionRegistry();
        const cases: readonly [string, string, Readonly<Record<string, string>>][] = [
            ['/status', 'status', {}], ['/batch B7', 'batch.show', {id: 'B7'}], ['/events --batch=B7', 'events', {batch: 'B7'}], ['/history --since=4', 'history', {since: '4'}],
            ['/export --format=markdown --include-routing', 'export', {format: 'markdown', 'include-routing': 'true'}], ['/pin ref-1', 'session.pin', {ref: 'ref-1'}], ['/unpin ref-1', 'session.unpin', {ref: 'ref-1'}],
            ['/compact', 'session.compact', {}], ['/new --topic=triage', 'session.new', {topic: 'triage'}], ['/switch session-2', 'session.switch', {sessionId: 'session-2'}], ['/fork --topic=child', 'session.fork', {topic: 'child'}],
            ['/suspend', 'session.suspend', {}], ['/resume', 'session.resume', {}], ['/close', 'session.close', {}], ['/budget grant --amount=5', 'budget.grant', {amount: '5'}],
            ['/apply proposal-1 --dry-run', 'proposal.apply', {proposalId: 'proposal-1', dryRun: 'true'}], ['/reject proposal-1', 'proposal.reject', {proposalId: 'proposal-1'}], ['/amend --from-turn=t1 --rationale=scope', 'amendment.request', {'from-turn': 't1', rationale: 'scope'}],
            ['/help', 'attachment.help', {}], ['/clear', 'attachment.clear', {}], ['/verbose', 'attachment.verbose', {}], ['/confirm-mode d3 --save', 'attachment.confirm-mode', {mode: 'd3', save: 'true'}], ['/exit', 'attachment.exit', {}], ['/quit', 'attachment.exit', {}]
        ];
        for (const [slash, actionId, args] of cases) expect(registry.parseSlash(slash)).toEqual(registry.intent(actionId, args));
        expect(() => registry.parseSlash('/events --batch=a --batch=b')).toThrowError('invalid-slash-command');
        expect(() => registry.parseSlash('/confirm-mode unsupported')).toThrowError('invalid-slash-command');
        expect(() => registry.parseSlash('/new --topic=a --topic=b')).toThrowError('invalid-slash-command');
        expect(new TuiCommandPalette(registry).select('attachment.exit')).toEqual(registry.parseSlash('/exit')!);
    });
    it('renders bounded inspector, attention, and every overlay kind through the fake surface', async () => {
        const surface = new FakeTuiSurface();
        const capabilities: TuiCapabilities = {alternateScreen: true, rawInput: true, resize: true, unicodeWidth: true, color: 'truecolor', mouse: false, bracketedPaste: true, reducedMotion: false};
        const adapter: NirvanaTuiAdapter = {capabilities: () => capabilities, open: async () => surface};
        const inspector = new TuiInspectorController({laneId: 'lane-1', operatorSessionId: 'session-1', query: {query: async () => ({schemaVersion: 1, view: 'lane', state: 'ready', rows: [{id: 'lane-1', title: 'lane-1', selectable: false, fields: [{label: 'revision', value: 'rev-7', sensitive: false}]}], revision: 'rev-7', stale: false, truncated: false, nextCursor: null, limit: 1, reasonCode: null})}});
        await inspector.load(new AbortController().signal);
        const overlays = new TuiOverlayController(); const application = new TuiApplication({lane: 'lane-1', adapter, preferences: DEFAULT_TUI_PREFERENCES, size: {columns: 80, rows: 20}, inspector, overlays, attention: [{priority: 'P1', sequence: 1, eventId: 'evt-9', label: 'Needs review', stealsFocus: false}]});
        for (const kind of ['command-palette', 'picker', 'help', 'confirmation', 'diagnostics', 'details'] as const) {
            overlays.open({kind, title: kind, reasonCode: `OVERLAY_${kind.toUpperCase()}`, body: [`identifier-${kind}`], choices: ['close'], focusedChoice: 0});
            const frame = application.frame(); const text = frame.cells.map((cell) => cell.text).join('\n');
            expect(text).toContain(`OVERLAY_${kind.toUpperCase()}`); expect(text).toContain(`identifier-${kind}`); expect(text).toContain('evt-9'); expect(text).toContain('lane-1');
            expect(frame.cells.every((cell) => cell.column >= 0 && cell.row >= 0 && cell.column < 80 && cell.row < 20 && cell.text.length > 0)).toBeTrue();
        }
        await application.render(); expect(surface.frames.length).toBe(1); expect(surface.frames[0].cells.length).toBeGreaterThan(0);
    });
    it('consumes confirmation tokens once and rejects malformed or interrupted effects', async () => {
        const port = new ReplayActionPort(); const dispatcher = new TuiActionDispatcher(new TuiActionRegistry(), port);
        const preview = await dispatcher.preview({actionId: 'proposal.apply', arguments: {proposalId: 'p1'}}, execution);
        const confirmed = dispatcher.confirm(preview, 'session-1', 'rev-1');
        expect(() => dispatcher.confirm(preview, 'session-1', 'rev-1')).toThrowError(TuiDispatchError, 'replayed-confirmation');
        await expectAsync(dispatcher.dispatch(confirmed)).toBeRejectedWithError('interrupted');
        await expectAsync(dispatcher.dispatch(confirmed)).toBeRejectedWithError(TuiDispatchError, 'replayed-confirmation');
        const malformed = new TuiActionDispatcher(new TuiActionRegistry(), new MalformedActionPort());
        const malformedPreview = await malformed.preview({actionId: 'proposal.apply', arguments: {proposalId: 'p1'}}, execution);
        expect(malformedPreview).toBeDefined();
        await expectAsync(malformed.dispatch(malformed.confirm(malformedPreview, 'session-1', 'rev-1'))).toBeRejectedWithError(TuiDispatchError, 'invalid-result');
    });
    it('accepts 256 Unicode query characters while preserving the 512-byte excerpt bound', async () => {
        const port: TuiSearchPort = {search: async () => ({items: [], revision: 'rev', stale: false, truncated: false, nextCursor: null, examined: 0})};
        const search = new TuiBoundedSearch(port);
        await expectAsync(search.search({query: '🙂'.repeat(256), scope: 'events'}, new AbortController().signal)).toBeResolved();
        await expectAsync(search.search({query: '🙂'.repeat(257), scope: 'events'}, new AbortController().signal)).toBeRejectedWithError(TuiSearchError, 'SEARCH_QUERY_TOO_LONG');
    });
    it('clamps raised search and palette history limits to normative maxima', async () => {
        const port: TuiSearchPort = {search: async () => ({items: [], revision: 'rev', stale: false, truncated: false, nextCursor: null, examined: 101})};
        const search = new TuiBoundedSearch(port, {...TUI_SEARCH_LIMITS, maxQueryCharacters: 500, maxResults: 100, maxCandidates: 500});
        await expectAsync(search.search({query: 'x'.repeat(257), scope: 'events'}, new AbortController().signal)).toBeRejectedWithError(TuiSearchError, 'SEARCH_QUERY_TOO_LONG');
        await expectAsync(search.search({query: 'x', scope: 'events', limit: 26}, new AbortController().signal)).toBeRejectedWithError(TuiSearchError, 'SEARCH_LIMIT_INVALID');
        await expectAsync(search.search({query: 'x', scope: 'events'}, new AbortController().signal)).toBeRejectedWithError(TuiSearchError, 'SEARCH_CANDIDATE_LIMIT_EXCEEDED');

        const palette = new TuiCommandPalette(new TuiActionRegistry(), 250);
        for (let index = 0; index < 250; index++) palette.select('attachment.exit');
        expect(palette.recent().length).toBe(200);
    });
    it('defaults non-finite and invalid lower search limits instead of bypassing hard maxima', async () => {
        const port: TuiSearchPort = {search: async () => ({items: [], revision: 'rev', stale: false, truncated: false, nextCursor: null, examined: 101})};
        const nanSearch = new TuiBoundedSearch(port, {...TUI_SEARCH_LIMITS, maxQueryCharacters: Number.NaN, maxResults: Number.NaN, maxCandidates: Number.NaN});
        await expectAsync(nanSearch.search({query: 'x'.repeat(257), scope: 'events'}, new AbortController().signal)).toBeRejectedWithError(TuiSearchError, 'SEARCH_QUERY_TOO_LONG');
        await expectAsync(nanSearch.search({query: 'x', scope: 'events', limit: 26}, new AbortController().signal)).toBeRejectedWithError(TuiSearchError, 'SEARCH_LIMIT_INVALID');
        await expectAsync(nanSearch.search({query: 'x', scope: 'events'}, new AbortController().signal)).toBeRejectedWithError(TuiSearchError, 'SEARCH_CANDIDATE_LIMIT_EXCEEDED');

        const malformedSearch = new TuiBoundedSearch(port, {...TUI_SEARCH_LIMITS, maxQueryCharacters: Number.POSITIVE_INFINITY, maxResults: -1, maxCandidates: -1});
        await expectAsync(malformedSearch.search({query: 'x'.repeat(257), scope: 'events'}, new AbortController().signal)).toBeRejectedWithError(TuiSearchError, 'SEARCH_QUERY_TOO_LONG');
        await expectAsync(malformedSearch.search({query: 'x', scope: 'events', limit: 26}, new AbortController().signal)).toBeRejectedWithError(TuiSearchError, 'SEARCH_LIMIT_INVALID');
        await expectAsync(malformedSearch.search({query: 'x', scope: 'events'}, new AbortController().signal)).toBeRejectedWithError(TuiSearchError, 'SEARCH_CANDIDATE_LIMIT_EXCEEDED');

        for (const historyLimit of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
            const palette = new TuiCommandPalette(new TuiActionRegistry(), historyLimit);
            for (let index = 0; index < 250; index++) palette.select('attachment.exit');
            expect(palette.recent().length).toBe(200);
        }
    });
});

class FakeActionPort implements TuiAcceptedActionPort {
    previews = 0; dispatched = 0;
    preview(intent: TuiActionIntent, context: TuiActionExecutionContext): Promise<TuiActionPreview> { this.previews++; return Promise.resolve({intent, mutation: 'effect', requiresConfirmation: true, available: true, reason: null, currentStateRevision: context.stateRevision, confirmationToken: `token-${this.previews}`}); }
    dispatch(action: {intent: TuiActionIntent}): Promise<TuiActionResult> { this.dispatched++; return Promise.resolve({status: 'effect', actionId: action.intent.actionId, reason: null, data: null}); }
}

class ReplayActionPort extends FakeActionPort {
    dispatch(action: {intent: TuiActionIntent}): Promise<TuiActionResult> { this.dispatched++; return Promise.reject(new Error('interrupted')); }
}
class MalformedActionPort implements TuiAcceptedActionPort {
    preview(intent: TuiActionIntent, context: TuiActionExecutionContext): Promise<unknown> { return Promise.resolve({intent, mutation: 'effect', requiresConfirmation: true, available: true, reason: null, currentStateRevision: context.stateRevision, confirmationToken: 'bad-token'}); }
    dispatch(_action: {intent: TuiActionIntent}): Promise<unknown> { return Promise.resolve({status: 'effect', actionId: 'different-action', reason: null, data: null}); }
}
