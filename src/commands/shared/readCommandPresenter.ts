import {output as prettyOutput} from '@nirvana/base/utils/pretty';
import type {JsonValue} from '../../contracts/index.js';
import {buildCommandResult, renderResult} from '../../foundation/presentation/index.js';

export function presentReadCommand(
    command: string, data: JsonValue, options: {readonly json: boolean; readonly noColor: boolean}
): void {
    const envelope = buildCommandResult(command, data);
    prettyOutput.write(renderResult(envelope, options), 'basic', 0, true);
}
