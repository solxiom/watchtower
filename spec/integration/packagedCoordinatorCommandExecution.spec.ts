/**
 * CA-24 correction 02 — end-to-end packaged coordinator/session command execution.
 *
 * Correction 01 fixed the packaged argv boundary and pinned it with unit specs
 * that reconstruct the host's argv shape. Those specs prove the parser, but
 * they still model the host rather than run it. This suite closes that last
 * gap by executing the real packaged binary — `dist/bin/wt.js`, the artifact
 * `nvb dist` produces and a user installs — and asserting the mandatory
 * command gate directly.
 *
 * The assertion is deliberately about the *boundary*, not the outcome: run
 * outside a lane, every form must get past argument parsing and fail at lane
 * discovery (`ERR_LANE_NOT_FOUND`). A regression in the argv contract shows up
 * as `ERR_INVALID_ARGUMENT` for `coordinator positional arguments`, which is
 * exactly the failure both reviews reported.
 */
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {join} from 'node:path';

const PACKAGED_CLI = join(process.cwd(), 'dist', 'bin', 'wt.js');
/** A directory that is certainly not inside any lane, so discovery is the first real gate. */
const OUTSIDE_ANY_LANE = '/';

interface PackagedResult {
    readonly exitCode: number;
    readonly ok: boolean;
    readonly code: string;
    readonly message: string;
}

function runPackaged(...argv: readonly string[]): PackagedResult {
    // `stdin: 'ignore'` is required, not incidental: with an open stdin pipe the
    // packaged host waits on it and never returns, so a piped invocation would
    // hang instead of answering (see the implementation report, §5.7).
    const result = spawnSync(process.execPath, [PACKAGED_CLI, ...argv, '--json'], {
        cwd: OUTSIDE_ANY_LANE, encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe']
    });
    const text = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    const start = text.indexOf('{');
    if (start < 0) return {exitCode: result.status ?? -1, ok: false, code: 'NO_JSON_ENVELOPE', message: text.slice(0, 300)};
    let parsed: {ok?: boolean; error?: {code?: string; message?: string}};
    try {
        parsed = JSON.parse(text.slice(start, text.indexOf('\n', start) < 0 ? undefined : text.indexOf('\n', start)));
    } catch {
        return {exitCode: result.status ?? -1, ok: false, code: 'UNPARSEABLE_ENVELOPE', message: text.slice(0, 300)};
    }
    return {
        exitCode: result.status ?? -1, ok: parsed.ok === true,
        code: parsed.error?.code ?? '', message: parsed.error?.message ?? ''
    };
}

/** `nvb dist` is a precondition of this suite, as it is for the specs that import from `dist/`. */
function requirePackagedCli(): void {
    if (!existsSync(PACKAGED_CLI)) {
        throw new Error(`packaged CLI missing at ${PACKAGED_CLI}; run nvb dist before nvb test`);
    }
}

describe('CA-24 correction 02 — packaged coordinator command dispatch', function () {
    beforeAll(requirePackagedCli);

    it('positive control: the packaged host itself starts and answers', function () {
        const result = runPackaged('version');
        expect(result.ok).withContext(result.message).toBeTrue();
    });

    it('parses and dispatches packaged `coordinator status` past the argv boundary', function () {
        const result = runPackaged('coordinator', 'status');
        expect(result.code).withContext(result.message).not.toBe('ERR_INVALID_ARGUMENT');
        expect(result.message).not.toContain('coordinator positional arguments');
        expect(result.code).toBe('ERR_LANE_NOT_FOUND');
    }, 60000);

    it('parses and dispatches packaged `coordinator session list` to the session boundary', function () {
        const result = runPackaged('coordinator', 'session', 'list');
        expect(result.code).withContext(result.message).not.toBe('ERR_INVALID_ARGUMENT');
        expect(result.message).not.toContain('coordinator positional arguments');
        expect(result.code).toBe('ERR_LANE_NOT_FOUND');
        // Reaching SessionCommandFront is what makes this the session boundary:
        // the refusal names the session form, not a generic coordinator parse.
        expect(result.message).toContain('coordinator session list');
    }, 60000);

});

describe('CA-24 correction 02 — packaged session forms and grammar', function () {
    beforeAll(requirePackagedCli);

    it('parses and dispatches a packaged session read form that carries a subject', function () {
        const result = runPackaged('coordinator', 'session', 'show', 'opsess-1');
        expect(result.code).withContext(result.message).toBe('ERR_LANE_NOT_FOUND');
    }, 60000);

    it('parses and dispatches packaged `coordinator ask` to its session boundary', function () {
        // The third literal form of the acceptance gate, with the exact flags
        // the correction brief names.
        const result = runPackaged(
            'coordinator', 'ask', '--question=x', '--session=opsess-1',
            '--query-form=operator-session-projection-v1'
        );
        expect(result.code).withContext(result.message).not.toBe('ERR_INVALID_ARGUMENT');
        expect(result.message).not.toContain('coordinator positional arguments');
        expect(result.code).toBe('ERR_LANE_NOT_FOUND');
    }, 60000);

    it('still refuses an invalid packaged form at the argv boundary', function () {
        // The closed grammar must keep refusing; the fix normalizes shape only.
        const unknown = runPackaged('coordinator', 'session', 'chat');
        expect(unknown.code).toBe('ERR_INVALID_ARGUMENT');
        const dryRunOnRead = runPackaged('coordinator', 'session', 'list', '--dry-run');
        expect(dryRunOnRead.code).toBe('ERR_INVALID_ARGUMENT');
    }, 90000);
});
