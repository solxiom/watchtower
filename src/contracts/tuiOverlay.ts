import type {TuiActionIntent} from './tuiActions.js';

export type TuiOverlayKind = 'command-palette' | 'picker' | 'help' | 'confirmation' | 'diagnostics' | 'details';
export type TuiOverlayChoice = 'confirm' | 'cancel' | 'retry' | 'close' | 'copy' | 'open';
export interface TuiOverlayRequest {
    readonly kind: TuiOverlayKind;
    readonly title: string;
    readonly reasonCode: string;
    readonly body: readonly string[];
    readonly choices: readonly TuiOverlayChoice[];
    readonly focusedChoice: number;
    readonly action?: TuiActionIntent;
}
export type TuiOverlayIntent =
    | {readonly type: 'next' | 'previous'}
    | {readonly type: 'choose'; readonly choice: TuiOverlayChoice}
    | {readonly type: 'close'}
    | {readonly type: 'search'; readonly query: string};
export interface TuiOverlayViewModel extends TuiOverlayRequest { readonly open: boolean; readonly focusedChoice: number; }
export interface TuiOverlayTransition { readonly from: TuiOverlayViewModel | null; readonly to: TuiOverlayViewModel | null; readonly closed: boolean; readonly acceptedChoice: TuiOverlayChoice | null; }
