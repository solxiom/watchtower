import {createWatchtowerError} from '../../src/contracts/index.js';
import {buildCommandError, buildCommandResult} from '../../src/foundation/presentation/commandEnvelopeSerializer.js';
import {renderError, renderResult} from '../../src/foundation/presentation/ResultRenderer.js';

const ansiPattern = /\u001b\[[0-?]*[ -/]*[@-~]/;

describe('result renderer', function () {
    it('renders one compact undecorated JSON value for each envelope', function () {
        const result = renderResult(buildCommandResult('list', null), {json: true, noColor: false});
        const error = renderError(buildCommandError('status', createWatchtowerError('ERR_LANE_NOT_FOUND', {
            operation: 'test', target: 'fixture', remediation: 'none'
        })), {json: true, noColor: false});

        expect(ansiPattern.test(result + error)).toBeFalse();
        expect(result).not.toContain('\n');
        expect(error).not.toContain('\n');
        expect(JSON.parse(result).data).toBeNull();
        expect(JSON.parse(error).ok).toBeFalse();
    });

    it('routes human rendering through an injected TerminalView and strips ANSI only for no-color', function () {
        const calls: Array<{color: string}> = [];
        const terminalView = {
            row: (_message: string, options: {color: string}) => calls.push(options),
            json: () => undefined,
            renderToString: () => '\u001b[36mterminal-view-output\u001b[0m'
        };
        const result = buildCommandResult('list', {items: []});

        expect(renderResult(result, {json: false, noColor: false, view: terminalView as never})).toContain('\u001b[36m');
        expect(renderResult(result, {json: false, noColor: true, view: terminalView as never})).toBe('terminal-view-output');
        expect(calls).toEqual([{color: 'cyan'}, {color: 'cyan'}]);
    });
});
