import type {TuiFocusIntent, TuiFocusScope, TuiFocusTarget, TuiFocusTransition, TuiLayout} from '../../contracts/tuiShell.js';

export class TuiFocusManager {
    private target: TuiFocusTarget = 'composer';
    private beforeOverlay: TuiFocusTarget = 'composer';
    private overlayIndex = 0;
    current(): TuiFocusTarget { return this.target; }
    scope(): TuiFocusScope { const overlayTargets: TuiFocusTarget[] = ['overlay']; const baseTargets: TuiFocusTarget[] = ['conversation', 'composer', 'inspector']; return this.target === 'overlay' ? Object.freeze({kind: 'overlay', targets: overlayTargets, activeIndex: this.overlayIndex}) : Object.freeze({kind: 'base', targets: baseTargets, activeIndex: Math.max(0, baseTargets.indexOf(this.target))}); }
    transition(intent: TuiFocusIntent, layout: TuiLayout): TuiFocusTransition {
        const from = this.target;
        if (intent.type === 'open-overlay') { this.beforeOverlay = valid(this.target, layout); this.overlayIndex = 0; this.target = 'overlay'; }
        else if (intent.type === 'close-overlay' && from === 'overlay') this.target = valid(this.beforeOverlay, layout);
        else if (intent.type === 'target' && intent.target && this.target !== 'overlay') this.target = valid(intent.target, layout);
        else if (intent.type === 'next' || intent.type === 'previous') { if (this.target === 'overlay') this.overlayIndex = 0; else this.target = cycle(this.target, intent.type === 'next', layout); }
        return Object.freeze({from, to: this.target, restored: intent.type === 'close-overlay', scope: this.scope()});
    }
}
function valid(target: TuiFocusTarget, layout: TuiLayout): TuiFocusTarget { return target === 'inspector' && !layout.inspector ? 'conversation' : target; }
function cycle(current: TuiFocusTarget, forward: boolean, layout: TuiLayout): TuiFocusTarget {
    const targets: TuiFocusTarget[] = ['conversation', 'composer', ...(layout.inspector ? ['inspector' as const] : [])];
    const index = Math.max(0, targets.indexOf(current));
    return targets[(index + (forward ? 1 : targets.length - 1)) % targets.length];
}
