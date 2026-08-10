import type {TuiLayout, TuiShellViewModel} from '../../contracts/tuiShell.js';

export interface TuiShellSlots { readonly header: string; readonly conversation: string; readonly inspector: string; readonly overlay: string; readonly footer: string; }
export class RootLayout {
    render(model: TuiShellViewModel): TuiShellSlots {
        const inspector = model.inspector ? `${model.inspector.title}\n${model.inspector.lines.join('\n')}` : '';
        const overlay = model.overlay ? `${model.overlay.title} [${model.overlay.reasonCode}]\n${model.overlay.options.join('  ')}` : '';
        return Object.freeze({header: header(model), conversation: model.conversation.title, inspector, overlay, footer: `${model.focus} · ${model.layout.mode}`});
    }
}
function header(model: TuiShellViewModel): string { return `WT · ${model.header.lane} · ${model.header.lifecycle} · ${model.header.batch ?? 'no batch'} · ${model.header.session ?? 'no session'}`; }
