import {
    TUI_CONTENT_LIMITS, TUI_SEMANTIC_STATE_LABELS, TuiTerminalError, type TuiAccessibleRegion, type TuiAccessibleView,
    type TuiAnnouncement, type TuiContentSurface, type TuiSemanticState
} from '../../contracts/tuiAccessibility.js';
import type {TuiDisplayPreferences, TuiShellViewModel} from '../../contracts/tuiShell.js';
import {TerminalContentSanitizer} from './TerminalContentSanitizer.js';

export interface AccessibleTuiPresenterOptions { readonly preferences: TuiDisplayPreferences; readonly sanitizer?: TerminalContentSanitizer; readonly maxAnnouncements?: number; }
/** Typed activity the shell view model does not carry, so no semantic state is inferred from rendered prose. */
export interface TuiActivityState { readonly streaming?: boolean; readonly provisional?: boolean; readonly stale?: boolean; readonly outcome?: 'success' | 'failure'; readonly disabled?: boolean; }

/**
 * Presents every semantic state without color, mouse, animation, Unicode
 * icons, syntax highlighting, or terminal hyperlinks (`cli-session.md §14.3`).
 *
 * Accessible mode is a presentation of the same view model, never a second
 * source of truth: regions are emitted in one linear focus order with explicit
 * titles, progress is a static label rather than an animation, and
 * announcements are an append-only bounded stream. Every state that colour
 * would otherwise carry is also emitted as a text label, so a monochrome or
 * screen-reader operator loses no information.
 */
export class AccessibleTuiPresenter {
    private readonly sanitizer: TerminalContentSanitizer;
    private readonly maxAnnouncements: number;
    private stream: readonly TuiAnnouncement[] = Object.freeze([]);
    private sequence = 0;

    constructor(private readonly options: AccessibleTuiPresenterOptions) {
        this.sanitizer = options.sanitizer ?? new TerminalContentSanitizer({accessible: options.preferences.accessible});
        this.maxAnnouncements = Math.min(options.maxAnnouncements ?? TUI_CONTENT_LIMITS.maxAnnouncements, TUI_CONTENT_LIMITS.maxAnnouncements);
    }

    present(model: TuiShellViewModel, activity: TuiActivityState = {}): TuiAccessibleView {
        const regions = [
            this.region('header', 'Lane header', [`lane ${model.header.lane}`, `lifecycle ${model.header.lifecycle}`, `budget ${model.header.budget}`], model, []),
            this.region('conversation', model.conversation.title, [`layout ${model.layout.mode}`, model.conversation.composerPlaceholder], model, conversationStates(activity)),
            this.region('attention', 'Attention', model.attention.map((item) => `${item.priority} ${item.eventId} ${item.label}`), model, model.attention.length > 0 ? ['attention'] : []),
            ...(model.inspector ? [this.region('inspector', model.inspector.title, model.inspector.lines, model, activity.stale === true ? ['stale'] : [])] : []),
            ...(model.overlay ? [this.region('overlay', `${model.overlay.title} (${model.overlay.reasonCode})`, overlayLines(model), model, ['attention', 'selection'])] : []),
            this.region('composer', 'Composer', [model.conversation.composerPlaceholder], model, activity.disabled === true ? ['disabled'] : [])
        ];
        return Object.freeze({
            regions: Object.freeze(regions), announcements: this.stream,
            linearFocusOrder: Object.freeze(regions.map((region) => region.id)),
            restrainedRedraw: this.options.preferences.accessible, animated: this.animated(), usesColor: false
        });
    }

    /** Announcements are append-only and bounded; the oldest entry is dropped, never rewritten. */
    announce(text: unknown, states: readonly TuiSemanticState[] = []): readonly TuiAnnouncement[] {
        const sanitized = this.sanitizer.sanitize('toast', text);
        this.sequence += 1;
        const announcement = Object.freeze({sequence: this.sequence, text: withLabels(sanitized.text, states), states: Object.freeze([...states])});
        const next = [...this.stream, announcement];
        this.stream = Object.freeze(next.slice(Math.max(0, next.length - this.maxAnnouncements)));
        return this.stream;
    }

    announcements(): readonly TuiAnnouncement[] { return this.stream; }

    /** Progress is a labelled static indicator whenever motion is reduced or accessible mode is active. */
    progress(label: unknown, percent: number | null = null): string {
        const text = this.sanitizer.sanitize('toast', label).text;
        const measure = percent === null ? 'in progress' : `${Math.max(0, Math.min(100, Math.round(percent)))}%`;
        return `${TUI_SEMANTIC_STATE_LABELS.progress} ${text} ${measure}`;
    }

    private animated(): boolean { return !this.options.preferences.accessible && !this.options.preferences.reducedMotion; }

    private region(id: string, title: unknown, lines: readonly unknown[], model: TuiShellViewModel, states: readonly TuiSemanticState[]): TuiAccessibleRegion {
        const focused = model.focus === id;
        const all = Object.freeze(focused ? ['focus' as const, ...states] : [...states]);
        const surface = SURFACES[id] ?? 'timeline';
        if (lines.length > TUI_CONTENT_LIMITS.maxAnnouncements) throw new TuiTerminalError('TERMINAL_CONTENT_INVALID', id, 'A region exceeded its bounded line budget.');
        return Object.freeze({
            id, title: withLabels(this.sanitizer.sanitize(surface, title).text, all), focusOrder: FOCUS_ORDER.indexOf(id),
            focused, lines: Object.freeze(lines.map((line) => this.sanitizer.sanitize(surface, line).text)), states: all
        });
    }
}

const FOCUS_ORDER: readonly string[] = Object.freeze(['header', 'conversation', 'attention', 'inspector', 'overlay', 'composer']);
const SURFACES: Readonly<Record<string, TuiContentSurface>> = Object.freeze({
    header: 'timeline', conversation: 'timeline', attention: 'toast', inspector: 'inspector', overlay: 'overlay', composer: 'composer'
});

function conversationStates(activity: TuiActivityState): readonly TuiSemanticState[] {
    const states: TuiSemanticState[] = [];
    if (activity.streaming === true) states.push('progress');
    if (activity.provisional === true) states.push('provisional');
    if (activity.stale === true) states.push('stale');
    if (activity.outcome === 'success') states.push('success');
    if (activity.outcome === 'failure') states.push('failure');
    return Object.freeze(states);
}

function overlayLines(model: TuiShellViewModel): readonly string[] {
    const overlay = model.overlay!;
    return Object.freeze([...overlay.body, ...overlay.options.map((option, index) => `${index === overlay.focusedOption ? `${TUI_SEMANTIC_STATE_LABELS.selection} ` : ''}${option}`)]);
}

/** Every state that colour would carry also appears as text, in a stable order. */
function withLabels(text: string, states: readonly TuiSemanticState[]): string {
    return states.length === 0 ? text : `${text} ${states.map((state) => TUI_SEMANTIC_STATE_LABELS[state]).join(' ')}`;
}
