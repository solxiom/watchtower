/**
 * CA-24 — `wt coordinator session` / `wt coordinator ask` argument grammar.
 *
 * Parsing is the first fence: an unknown form, a missing subject, an extra
 * subject, an option belonging to another form, a duplicate option, and
 * `--dry-run` on a read must all fail before lane discovery, any journal read,
 * or any effect authority call. These specs prove that boundary and nothing
 * downstream of it.
 */
import {makeArgMap} from '@nirvana/base/utils/argUtil';
import {
    coordinatorPositionalArguments, isSessionAction
} from '../../src/commands/coordinator/coordinatorCommandOptions.js';
import {parseSessionOptions} from '../../src/commands/coordinator/session/sessionCommandOptions.js';

function parse(argv: readonly string[]) {
    const args = makeArgMap([...argv]);
    return parseSessionOptions(args, coordinatorPositionalArguments(args));
}

/**
 * Correction 01: the argv shape the Nirvana host actually delivers. `BasicCli`
 * dispatches `applyCommand(cmdName, args.slice(1))`, so a command never sees
 * its own name. Every grammar rule must hold for this shape too — the original
 * suite only ever supplied the name-prefixed form, which is why a packaged
 * `coordinator status` could fail while every focused spec passed.
 */
function parseAsHost(argv: readonly string[]) {
    return parse(argv.slice(1));
}

function rejects(argv: readonly string[]): void {
    expect(() => parse(argv)).withContext(argv.join(' ')).toThrowError(/Invalid arguments/);
}

describe('CA-24 session command grammar', function () {
    it('normalizes the host argv shape, which omits the command name', function () {
        // The host form and the name-prefixed form must produce the same value.
        expect(coordinatorPositionalArguments(makeArgMap(['session', 'list']))).toEqual(['coordinator', 'session', 'list']);
        expect(coordinatorPositionalArguments(makeArgMap(['coordinator', 'session', 'list']))).toEqual(['coordinator', 'session', 'list']);
        expect(coordinatorPositionalArguments(makeArgMap(['status']))).toEqual(['coordinator', 'status']);
        expect(coordinatorPositionalArguments(makeArgMap(['status', '--json']))).toEqual(['coordinator', 'status']);
    });

    it('parses every documented form from the host argv shape', function () {
        expect(parseAsHost(['coordinator', 'session', 'list']).form).toBe('list');
        expect(parseAsHost(['coordinator', 'session', 'show', 'opsess-1']).subject).toBe('opsess-1');
        expect(parseAsHost(['coordinator', 'session', '--topic=triage']).form).toBe('create');
        expect(parseAsHost(['coordinator', 'ask', '--question=w', '--session=opsess-1']).form).toBe('ask');
        expect(parseAsHost(['coordinator', 'session', 'amendment', 'admit', 'amend-1']).amendment).toBe('admit');
    });

    it('keeps every refusal rule under the host argv shape', function () {
        expect(() => parseAsHost(['coordinator', 'session', 'chat'])).toThrowError(/Invalid arguments/);
        expect(() => parseAsHost(['coordinator', 'session', 'show'])).toThrowError(/Invalid arguments/);
        expect(() => parseAsHost(['coordinator', 'session', 'list', '--dry-run'])).toThrowError(/Invalid arguments/);
    });

    it('routes only session and ask into the session parser', function () {
        expect(isSessionAction(['coordinator', 'session'])).toBeTrue();
        expect(isSessionAction(['coordinator', 'ask'])).toBeTrue();
        expect(isSessionAction(['coordinator', 'status'])).toBeFalse();
        expect(isSessionAction(['batch', 'session'])).toBeFalse();
        // Normalized host shape routes identically.
        expect(isSessionAction(coordinatorPositionalArguments(makeArgMap(['session', 'list'])))).toBeTrue();
        expect(isSessionAction(coordinatorPositionalArguments(makeArgMap(['status'])))).toBeFalse();
    });

    it('accepts every documented form with its exact subjects', function () {
        expect(parse(['coordinator', 'session', '--topic=triage']).form).toBe('create');
        expect(parse(['coordinator', 'session', 'list']).form).toBe('list');
        expect(parse(['coordinator', 'session', 'attach', 'opsess-1', '--observe']).observe).toBeTrue();
        expect(parse(['coordinator', 'session', 'show', 'opsess-1']).subject).toBe('opsess-1');
        expect(parse(['coordinator', 'session', 'pin', 'opsess-1', 'batch:CA-24']).second).toBe('batch:CA-24');
        expect(parse(['coordinator', 'session', 'apply', 'opsess-1', 'prop-1', '--dry-run']).dryRun).toBeTrue();
        expect(parse(['coordinator', 'session', 'amendment', 'list']).amendment).toBe('list');
        expect(parse(['coordinator', 'session', 'amendment', 'admit', 'amend-1']).subject).toBe('amend-1');
        const ask = parse(['coordinator', 'ask', '--question=what', '--session=opsess-1']);
        expect(ask.form).toBe('ask');
        expect(ask.question).toBe('what');
    });

    it('defaults streaming on and honours an explicit --no-stream', function () {
        expect(parse(['coordinator', 'session', 'attach', 'opsess-1']).stream).toBeTrue();
        expect(parse(['coordinator', 'session', 'attach', 'opsess-1', '--no-stream']).stream).toBeFalse();
        rejects(['coordinator', 'session', 'attach', 'opsess-1', '--stream', '--no-stream']);
    });

    it('rejects unknown forms, wrong subject arity, and foreign or duplicate options', function () {
        rejects(['coordinator', 'session', 'chat']);
        rejects(['coordinator', 'session', 'show']);
        rejects(['coordinator', 'session', 'list', 'opsess-1']);
        rejects(['coordinator', 'session', 'pin', 'opsess-1']);
        rejects(['coordinator', 'session', 'show', 'opsess-1', 'extra']);
        rejects(['coordinator', 'session', 'show', 'opsess-1', '--observe']);
        rejects(['coordinator', 'session', 'show', 'opsess-1', '--lane=a', '--lane=b']);
        rejects(['coordinator', 'session', 'amendment', 'approve', 'amend-1']);
        rejects(['coordinator', 'session', 'amendment', 'list', 'amend-1']);
        rejects(['coordinator', 'ask', 'opsess-1', '--question=what']);
    });

    it('admits --dry-run only on a form that can change durable bytes', function () {
        rejects(['coordinator', 'session', 'list', '--dry-run']);
        rejects(['coordinator', 'session', 'show', 'opsess-1', '--dry-run']);
        rejects(['coordinator', 'session', 'history', 'opsess-1', '--dry-run']);
        expect(parse(['coordinator', 'session', 'close', 'opsess-1', '--dry-run']).dryRun).toBeTrue();
        expect(parse(['coordinator', 'session', 'compact', 'opsess-1', '--dry-run']).dryRun).toBeTrue();
    });

    it('requires the value flags a form cannot execute without', function () {
        rejects(['coordinator', 'session']);
        rejects(['coordinator', 'ask', '--question=what']);
        rejects(['coordinator', 'ask', '--session=opsess-1']);
        rejects(['coordinator', 'session', 'amendment', 'request', 'opsess-1', '--pack=wt']);
        expect(parse(['coordinator', 'session', 'amendment', 'request', 'opsess-1', '--pack=wt', '--reason=conflict']).pack).toBe('wt');
    });

    it('rejects an empty value for any value flag', function () {
        rejects(['coordinator', 'session', 'show', 'opsess-1', '--lane=']);
        rejects(['coordinator', 'session', '--topic=']);
    });
});
