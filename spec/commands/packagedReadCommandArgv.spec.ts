/**
 * CA-14 packaged-argv correction — batch and events host argv contract.
 *
 * CA-24 correction 01 fixed the same host-shape gap for `coordinator`. Batch
 * and events still required the command name in their positional grammar, so
 * every packaged `wt batch ready` / `wt events tail|latest` failed at parse
 * time with `ERR_INVALID_ARGUMENT` even though focused specs passed.
 */
import {makeArgMap} from '@nirvana/base/utils/argUtil';
import {parseBatchOptions, batchPositionalArguments} from '../../src/commands/batch/batchCommandOptions.js';
import {parseEventsOptions, eventsPositionalArguments} from '../../src/commands/events/eventsCommandOptions.js';

/** Exactly what the host hands a command: argv with the command name removed. */
function hostArgs(argv: readonly string[]) {
    return makeArgMap([...argv].slice(1));
}

describe('CA-14 packaged read-command argv contract', function () {
    it('positive control: the host shape differs from the name-prefixed shape', function () {
        expect([...hostArgs(['batch', 'ready']).entries()].map(([key]) => key)).toEqual(['ready']);
        expect([...hostArgs(['events', 'tail']).entries()].map(([key]) => key)).toEqual(['tail']);
    });

    it('parses batch ready from the host argv shape', function () {
        expect(batchPositionalArguments(hostArgs(['batch', 'ready']))).toEqual(['batch', 'ready']);
        expect(parseBatchOptions(hostArgs(['batch', 'ready'])).json).toBeFalse();
        expect(parseBatchOptions(hostArgs(['batch', 'ready', '--lane=lane-a'])).lane).toBe('lane-a');
    });

    it('parses events tail and latest from the host argv shape', function () {
        expect(eventsPositionalArguments(hostArgs(['events', 'latest']))).toEqual(['events', 'latest']);
        expect(parseEventsOptions(hostArgs(['events', 'tail', '--limit=10'])).action).toBe('tail');
        expect(parseEventsOptions(hostArgs(['events', 'latest', '--batch=CA-01'])).batch).toBe('CA-01');
    });

    it('keeps closed-grammar refusals under the host argv shape', function () {
        const rejectsBatch = (argv: readonly string[]) =>
            expect(() => parseBatchOptions(hostArgs(argv))).withContext(argv.join(' ')).toThrowError(/Invalid arguments/);
        rejectsBatch(['batch']);
        rejectsBatch(['batch', 'queue']);
        rejectsBatch(['batch', 'ready', '--lane=a', '--lane=b']);

        const rejectsEvents = (argv: readonly string[]) =>
            expect(() => parseEventsOptions(hostArgs(argv))).withContext(argv.join(' ')).toThrowError(/Invalid arguments/);
        rejectsEvents(['events']);
        rejectsEvents(['events', 'bogus']);
        rejectsEvents(['events', 'latest', '--since=e1']);
        rejectsEvents(['events', 'latest', '--limit=2', '--limit=3']);
    });
});
