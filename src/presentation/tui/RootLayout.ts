import type {TuiCell, TuiFrame} from '../../contracts/tuiAdapter.js';
import {measureTuiCells, type TuiLayout, type TuiShellViewModel, type TuiRegion} from '../../contracts/tuiShell.js';

export interface TuiShellSlots { readonly header: string; readonly conversation: string; readonly inspector: string; readonly overlay: string; readonly footer: string; }
export class RootLayout {
    render(model: TuiShellViewModel): TuiShellSlots {
        const inspector = model.inspector ? `${model.inspector.title}\n${model.inspector.lines.join('\n')}` : '';
        const overlay = model.overlay ? `${model.overlay.title} [${model.overlay.reasonCode}]\n${model.overlay.body.join('\n')}\n${model.overlay.options.map((option, index) => `${index === model.overlay!.focusedOption ? '> ' : '  '}${option}`).join('\n')}` : '';
        const attention = model.attention.map((item) => `${item.priority} ${item.eventId} · ${item.label}`);
        return Object.freeze({header: header(model), conversation: [model.conversation.title, ...attention].join('\n'), inspector, overlay, footer: `${model.focus} · ${model.layout.mode}`});
    }
    frame(model: TuiShellViewModel): TuiFrame {
        const slots = this.render(model); const cells: TuiCell[] = [];
        write(cells, slots.header, {column: 0, row: 0, width: model.layout.size.columns, height: Math.min(3, model.layout.size.rows)});
        write(cells, slots.conversation, model.layout.conversation);
        if (model.layout.inspector && slots.inspector) write(cells, slots.inspector, model.layout.inspector);
        write(cells, slots.footer, {column: 0, row: Math.max(0, model.layout.size.rows - 1), width: model.layout.size.columns, height: 1});
        if (model.overlay && slots.overlay) write(cells, slots.overlay, model.layout.overlay);
        return Object.freeze({size: model.layout.size, cells: Object.freeze(cells)});
    }
}
function header(model: TuiShellViewModel): string { return `WT · ${model.header.lane} · ${model.header.lifecycle} · ${model.header.batch ?? 'no batch'} · ${model.header.session ?? 'no session'}`; }
function write(cells: TuiCell[], text: string, region: TuiRegion): void {
    if (region.width <= 0 || region.height <= 0) return;
    for (const [offset, line] of text.split('\n').slice(0, region.height).entries()) {
        const clipped = clip(line, region.width); if (clipped.length > 0) cells.push(Object.freeze({column: region.column, row: region.row + offset, text: clipped}));
    }
}
function clip(text: string, width: number): string {
    if (measureTuiCells(text) <= width) return text;
    if (width <= 1) return '…'.slice(0, width);
    const segmenter = new Intl.Segmenter(undefined, {granularity: 'grapheme'}); let result = '';
    for (const part of segmenter.segment(text)) { if (measureTuiCells(result + part.segment + '…') > width) break; result += part.segment; }
    return `${result}…`;
}
