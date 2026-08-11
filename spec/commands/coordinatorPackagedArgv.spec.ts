/**
 * CA-24 correction 01 — the packaged command-host argv contract.
 *
 * The Nirvana host strips a command's own name before dispatch
 * (`BasicCli.run` → `applyCommand(cmdName, args.slice(1))`), so a command
 * receives `['status']`, not `['coordinator', 'status']`. Every focused spec in
 * this repository supplied the name-prefixed form directly, so the whole
 * `coordinator` grammar could pass its unit proof while every packaged
 * invocation failed before dispatch. These specs pin the host shape for the
 * accepted baseline forms as well as CA-24's new ones, so that gap cannot
 * silently reopen.
 */
import {makeArgMap} from '@nirvana/base/utils/argUtil';
import {
    coordinatorPositionalArguments, isSessionAction, parseCoordinatorOptions
} from '../../src/commands/coordinator/coordinatorCommandOptions.js';
import {sessionError} from '../../src/commands/coordinator/session/sessionCommandPresenter.js';
import {MAX_CONTEXT_VALUE_LENGTH, WatchtowerError} from '../../src/contracts/index.js';
import type {SessionCommandFailure} from '../../src/contracts/sessionCommand.js';

/** Exactly what the host hands a command: argv with the command name removed. */
function hostArgs(argv: readonly string[]) {
    return makeArgMap([...argv].slice(1));
}

describe('CA-24 correction 01 — packaged coordinator argv contract', function () {
    it('positive control: the host shape differs from the name-prefixed shape', function () {
        expect([...hostArgs(['coordinator', 'status']).entries()].map(([key]) => key)).toEqual(['status']);
    });

    it('parses the accepted read forms from the host argv shape', function () {
        expect(parseCoordinatorOptions(hostArgs(['coordinator', 'status'])).action).toBe('status');
        expect(parseCoordinatorOptions(hostArgs(['coordinator', 'index', 'status'])).subject).toBe('status');
        expect(parseCoordinatorOptions(hostArgs(['coordinator', 'index', 'explain', 'B1'])).target).toBe('B1');
        expect(parseCoordinatorOptions(hostArgs(['coordinator', 'explain', '--cycle=c1'])).cycle).toBe('c1');
    });

    it('parses the accepted mutating forms from the host argv shape', function () {
        expect(parseCoordinatorOptions(hostArgs(['coordinator', 'cycle', '--trigger=e1'])).action).toBe('cycle');
        expect(parseCoordinatorOptions(hostArgs(['coordinator', 'escalate', '--reason=r'])).reason).toBe('r');
        expect(parseCoordinatorOptions(hostArgs(['coordinator', 'resolution', 'show', 'blk-1'])).target).toBe('blk-1');
    });

    it('routes the session forms from the host argv shape', function () {
        expect(isSessionAction(coordinatorPositionalArguments(hostArgs(['coordinator', 'session', 'list'])))).toBeTrue();
        expect(isSessionAction(coordinatorPositionalArguments(hostArgs(['coordinator', 'ask'])))).toBeTrue();
        expect(isSessionAction(coordinatorPositionalArguments(hostArgs(['coordinator', 'status'])))).toBeFalse();
    });

    it('keeps every closed-grammar refusal under the host argv shape', function () {
        const rejects = (argv: readonly string[]) =>
            expect(() => parseCoordinatorOptions(hostArgs(argv))).withContext(argv.join(' ')).toThrowError(/Invalid arguments/);
        rejects(['coordinator']);
        rejects(['coordinator', 'bogus']);
        rejects(['coordinator', 'status', 'extra']);
        rejects(['coordinator', 'status', '--bogus']);
        rejects(['coordinator', 'status', '--dry-run']);
        rejects(['coordinator', 'index']);
        rejects(['coordinator', 'cycle']);
        rejects(['coordinator', 'resolution', 'sync-check', 'blk-1']);
    });
});

describe('CA-24 correction 01 — session refusal rendering stays typed', function () {
    const failure = (target: string, detail: string): SessionCommandFailure =>
        ({ok: false, reason: 'SESSION_COMMAND_LANE_UNAVAILABLE', target, detail});

    it('renders an over-long owner detail as a bounded typed error', function () {
        // A real lane-marker refusal nests its own remediation sentence and
        // exceeded the context limit, which threw a raw TypeError instead.
        const error = sessionError('coordinator session list', failure('/tmp/lane', 'x'.repeat(400)));
        expect(error).toBeInstanceOf(WatchtowerError);
        expect((error as WatchtowerError).exitCode).toBeGreaterThan(0);
    });

    it('renders control characters and empty values without throwing', function () {
        expect(sessionError('coordinator session list', failure('/tmp/lane', 'line one\nline two\ttab'))).toBeInstanceOf(WatchtowerError);
        expect(sessionError('coordinator session list', failure('', ''))).toBeInstanceOf(WatchtowerError);
        expect(sessionError('', failure('/tmp/lane', 'detail'))).toBeInstanceOf(WatchtowerError);
    });

    it('bounds every rendered context value to the contract limit', function () {
        const error = sessionError('c'.repeat(400), failure('t'.repeat(400), 'd'.repeat(400))) as WatchtowerError;
        const {operation, target, remediation} = error.details;
        for (const value of [operation, target, remediation]) {
            expect(typeof value).toBe('string');
            expect(value.length).toBeLessThanOrEqual(MAX_CONTEXT_VALUE_LENGTH);
            expect(value.length).toBeGreaterThan(0);
        }
    });
});
