import type {TuiActionContext, TuiActionDescriptor, TuiActionResolution} from '../../contracts/tuiShell.js';

const ACTIONS: readonly TuiActionDescriptor[] = Object.freeze([
    action('focus.composer', 'i', 'Focus composer', 'read', false, true, ['conversation', 'composer']),
    action('focus.next', 'Tab', 'Cycle regions', 'read', false, true, ['conversation', 'composer', 'inspector', 'overlay']),
    action('inspector.toggle', 'Ctrl-B', 'Toggle inspector', 'read', false, false, ['conversation', 'composer']),
    action('palette.open', 'Ctrl-P', 'Open command palette', 'read', false, true, ['conversation', 'composer', 'inspector']),
    action('help.open', '?', 'Open help', 'read', false, true, ['conversation', 'inspector']),
    action('attachment.detach', 'Ctrl-D', 'Detach', 'read', false, true, ['conversation', 'composer', 'inspector'])
]);
export class TuiActionRegistry {
    inspect(context: TuiActionContext): readonly TuiActionResolution[] { return Object.freeze(ACTIONS.filter((item) => item.focusScope.includes(context.focus)).map((item) => this.resolve(item.id, context))); }
    resolve(actionId: string, context: TuiActionContext): TuiActionResolution {
        const descriptor = ACTIONS.find((item) => item.id === actionId);
        if (!descriptor) return Object.freeze({id: actionId, key: '', label: actionId, focusScope: [], mutation: 'read', requiresConfirmation: false, observerEligible: false, available: false, reason: 'unknown-action'});
        const conflict = context.conflictingActionIds?.includes(descriptor.id) ?? false;
        const available = descriptor.focusScope.includes(context.focus) && (context.observer ? descriptor.observerEligible : true) && !conflict;
        return Object.freeze({...descriptor, available, reason: conflict ? 'key-conflict' : available ? undefined : context.observer && !descriptor.observerEligible ? 'observer-ineligible' : 'focus-unavailable'});
    }
}
function action(id: string, key: string, label: string, mutation: 'read' | 'advisory' | 'effect', requiresConfirmation: boolean, observerEligible: boolean, focusScope: readonly ('conversation' | 'composer' | 'inspector' | 'overlay')[]): TuiActionDescriptor { return Object.freeze({id, key, label, mutation, requiresConfirmation, observerEligible, focusScope}); }
