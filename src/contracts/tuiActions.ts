import type {TuiFocusTarget, TuiMutationClass} from './tuiShell.js';

export interface TuiActionIntent { readonly actionId: string; readonly arguments: Readonly<Record<string, string>>; }
export interface ConfirmedTuiAction { readonly intent: TuiActionIntent; readonly confirmationToken: string; readonly confirmedBySessionId: string; }
export interface TuiActionPreview {
    readonly intent: TuiActionIntent;
    readonly mutation: TuiMutationClass;
    readonly requiresConfirmation: boolean;
    readonly available: boolean;
    readonly reason: string | null;
    readonly currentStateRevision: string;
    readonly confirmationToken: string | null;
}
export interface TuiActionResult { readonly status: 'read' | 'advisory' | 'effect' | 'refused'; readonly actionId: string; readonly reason: string | null; readonly data: Readonly<Record<string, unknown>> | null; }
export interface TuiActionExecutionContext { readonly focus: TuiFocusTarget; readonly observer: boolean; readonly overlayOpen: boolean; readonly stateRevision: string; readonly sessionId: string; }
export interface TuiAcceptedActionPort {
    preview(intent: TuiActionIntent, context: TuiActionExecutionContext): Promise<unknown>;
    dispatch(action: ConfirmedTuiAction): Promise<unknown>;
}
export const TUI_ACTION_REASONS = Object.freeze(['unknown-action', 'observer-ineligible', 'focus-unavailable', 'key-conflict', 'stale-preview', 'confirmation-required', 'invalid-slash-command'] as const);
