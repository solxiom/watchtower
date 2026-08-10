import type {NirvanaTuiAdapter, TuiCapabilities, TuiFrame, TuiSize} from '../../contracts/tuiAdapter.js';
import type {TuiAnimationPolicy, TuiAttentionItem, TuiDisplayPreferences, TuiHeaderViewModel, TuiShellViewModel} from '../../contracts/tuiShell.js';
import {RootLayout} from './RootLayout.js';
import {TuiActionRegistry} from './TuiActionRegistry.js';
import {TuiFocusManager} from './TuiFocusManager.js';
import {TuiLayoutResolver} from './TuiLayoutResolver.js';
import {TuiThemeResolver} from './TuiThemeResolver.js';
import type {TuiInspectorController} from './InspectorController.js';
import type {TuiOverlayController} from './TuiOverlayController.js';

export interface TuiApplicationOptions { readonly lane: string; readonly header?: Partial<TuiHeaderViewModel>; readonly adapter: NirvanaTuiAdapter; readonly preferences: TuiDisplayPreferences; readonly size: TuiSize; readonly inspector?: TuiInspectorController; readonly overlays?: TuiOverlayController; readonly attention?: readonly TuiAttentionItem[]; }
export class TuiFrameScheduler {
    private pending: TuiFrame | null = null;
    constructor(private readonly policy: TuiAnimationPolicy = {enabled: true, maxFramesPerSecond: 30, maxQueuedFrames: 2, hidden: false}) {}
    enqueue(frame: TuiFrame): boolean { if (this.policy.hidden || !this.policy.enabled) return false; this.pending = frame; return true; }
    take(): TuiFrame | null { const frame = this.pending; this.pending = null; return frame; }
    policySnapshot(): TuiAnimationPolicy { return this.policy; }
}
export class TuiApplication {
    private readonly layoutResolver = new TuiLayoutResolver();
    private readonly focusManager = new TuiFocusManager();
    private readonly themeResolver = new TuiThemeResolver();
    private readonly root = new RootLayout();
    readonly actions = new TuiActionRegistry();
    private size: TuiSize;
    constructor(private readonly options: TuiApplicationOptions) { this.size = options.size; }
    resize(size: TuiSize): TuiShellViewModel { this.size = size; return this.view(); }
    view(): TuiShellViewModel {
        const layout = this.layoutResolver.resolve(this.size, this.options.preferences);
        const inspector = layout.inspector ? inspectorModel(this.options.inspector) : null;
        const overlay = this.options.overlays?.current();
        return Object.freeze({layout, focus: this.focusManager.current(), theme: this.themeResolver.resolve(this.options.adapter.capabilities(), this.options.preferences), header: Object.freeze({lane: this.options.lane, lifecycle: 'active', batch: null, session: null, budget: 'unknown', ...this.options.header}), conversation: Object.freeze({title: 'Conversation', composerPlaceholder: 'Ask WT…', timelineAnchor: null}), inspector, attention: Object.freeze([...(this.options.attention ?? [])]), overlay: overlay ? Object.freeze({title: overlay.title, reasonCode: overlay.reasonCode, body: Object.freeze([...overlay.body]), options: Object.freeze(overlay.choices), focusedOption: overlay.focusedChoice}) : null});
    }
    async render(): Promise<void> { const surface = await this.options.adapter.open({size: this.size, signal: new AbortController().signal}); surface.render(this.root.frame(this.view())); }
    frame(): TuiFrame { return this.root.frame(this.view()); }
    slots(): ReturnType<RootLayout['render']> { return this.root.render(this.view()); }
    capabilities(): TuiCapabilities { return this.options.adapter.capabilities(); }
}

function inspectorModel(controller: TuiInspectorController | undefined): TuiShellViewModel['inspector'] {
    if (!controller) return Object.freeze({title: 'Inspector: Lane', lines: Object.freeze(['lifecycle  active', 'budget     unknown'])});
    const view = controller.current();
    const lines = view.rows.flatMap((row) => [row.title, ...row.fields.map((field) => `${field.label}  ${String(field.value)}`)]);
    return Object.freeze({title: `Inspector: ${view.title}`, lines: Object.freeze([`state      ${view.state}`, ...lines, ...(view.truncated ? ['more       available'] : [])])});
}
