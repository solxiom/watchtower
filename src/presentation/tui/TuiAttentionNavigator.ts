import type {TuiAttentionItem} from '../../contracts/tuiShell.js';
import {reduceAttention} from '../../contracts/tuiShell.js';
import {TUI_ATTENTION_MAX_ITEMS, type TuiAttentionNavigatorState} from '../../contracts/tuiInspector.js';

type NavigableAttentionItem = Omit<TuiAttentionItem, 'priority'> & {readonly priority: 'P1' | 'P2' | 'P3' | 'P4'};
export class TuiAttentionNavigator {
    private items: readonly NavigableAttentionItem[] = [];
    private selectedIndex = -1;
    replace(items: readonly TuiAttentionItem[]): TuiAttentionNavigatorState {
        const selected = this.selected();
        this.items = Object.freeze(reduceAttention(items).filter(isNavigable).slice(0, TUI_ATTENTION_MAX_ITEMS));
        this.selectedIndex = selected === null ? (this.items.length ? 0 : -1) : this.items.findIndex((item) => item.eventId === selected.eventId);
        if (this.selectedIndex < 0 && this.items.length) this.selectedIndex = 0;
        return this.state();
    }
    next(): TuiAttentionNavigatorState { return this.move(1); }
    previous(): TuiAttentionNavigatorState { return this.move(-1); }
    state(): TuiAttentionNavigatorState { return Object.freeze({items: this.items, selectedIndex: this.selectedIndex}); }
    selected(): NavigableAttentionItem | null { return this.selectedIndex >= 0 ? this.items[this.selectedIndex] ?? null : null; }
    private move(delta: number): TuiAttentionNavigatorState { if (this.items.length) this.selectedIndex = (this.selectedIndex + delta + this.items.length) % this.items.length; return this.state(); }
}
function isNavigable(item: TuiAttentionItem): item is NavigableAttentionItem { return item.priority !== 'P0' && item.priority !== 'P5'; }
