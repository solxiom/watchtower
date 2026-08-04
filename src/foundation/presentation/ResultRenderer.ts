import {view} from '@nirvana/base/utils/pretty';
import type {TerminalView} from '@nirvana/base/utils/pretty/contracts';
import stripAnsi from 'strip-ansi';
import {createWatchtowerError, type CommandError, type CommandResult, type JsonValue} from '../../contracts/index.js';
import {validateEnvelope} from './commandEnvelopeSerializer.js';

export interface RenderOptions {json: boolean; noColor: boolean; view?: TerminalView;}

export function renderResult(result: CommandResult, options: RenderOptions): string {
    const envelope = renderable(result, true);
    return options.json ? JSON.stringify(envelope) : renderHuman(envelope.command, envelope.data, options);
}

export function renderError(error: CommandError, options: RenderOptions): string {
    const envelope = renderable(error, false);
    return options.json ? JSON.stringify(envelope) : renderHuman(envelope.command, envelope.error, options);
}

function renderable<T extends CommandResult | CommandError>(value: T, expectedOk: boolean): T {
    const validation = validateEnvelope(value);
    if (validation.valid === true && validation.envelope.ok === expectedOk) return value;
    throw createWatchtowerError('ERR_PARSE_FAILURE', {
        operation: 'render command envelope', target: 'command output', remediation: 'supply a serializable v1 command envelope'
    });
}

function renderHuman(command: string, value: JsonValue | CommandError['error'], options: RenderOptions): string {
    const terminalView = options.view ?? view();
    terminalView.row(command, {color: 'cyan'});
    terminalView.json(value);
    const rendered = terminalView.renderToString();
    return options.noColor ? stripAnsi(rendered) : rendered;
}
