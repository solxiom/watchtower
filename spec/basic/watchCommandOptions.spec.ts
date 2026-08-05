import {makeArgMap} from '@nirvana/base/utils/argUtil';
import type {WatchtowerError} from '../../src/contracts/index.js';
import {parseWatchCommandOptions} from '../../src/commands/watch/watchCommandOptions.js';

function expectCode(run: () => unknown, code: string): void {
    try {
        run();
        fail(`expected ${code}`);
    } catch (error) {
        expect((error as WatchtowerError).code).toBe(code);
    }
}

describe('parseWatchCommandOptions', function () {
    it('parses no arguments to every field optional and no-color false', function () {
        expect(parseWatchCommandOptions(makeArgMap([]))).toEqual({noColor: false});
    });

    it('parses workspace, lane, initiative, and no-color', function () {
        expect(parseWatchCommandOptions(makeArgMap([
            '--workspace=/repo', '--lane=lane-a', '--initiative=init-a', '--no-color'
        ]))).toEqual({workspace: '/repo', lane: 'lane-a', initiative: 'init-a', noColor: true});
    });

    it('rejects --json with a message naming the read-only alternative', function () {
        try {
            parseWatchCommandOptions(makeArgMap(['--json']));
            fail('expected ERR_INVALID_ARGUMENT');
        } catch (error) {
            const watchtowerError = error as WatchtowerError;
            expect(watchtowerError.code).toBe('ERR_INVALID_ARGUMENT');
            expect(watchtowerError.message).toContain('--json');
        }
    });

    it('rejects an unknown flag', function () {
        expectCode(() => parseWatchCommandOptions(makeArgMap(['--unknown'])), 'ERR_INVALID_ARGUMENT');
    });

    it('rejects an unknown positional argument', function () {
        expectCode(() => parseWatchCommandOptions(makeArgMap(['extra'])), 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a value flag with no value', function () {
        expectCode(() => parseWatchCommandOptions(makeArgMap(['--lane'])), 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a boolean flag given a value', function () {
        expectCode(() => parseWatchCommandOptions(makeArgMap(['--no-color=true'])), 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a duplicated flag', function () {
        expectCode(() => parseWatchCommandOptions(makeArgMap(['--lane=a', '--lane=b'])), 'ERR_INVALID_ARGUMENT');
    });
});
