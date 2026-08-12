/**
 * CA-14 packaged-argv correction — end-to-end batch and events dispatch.
 *
 * Unit specs can reconstruct the host argv shape, but only the packaged binary
 * proves the real `dist/bin/wt.js` boundary. Run outside any lane so the first
 * real gate after parse is lane discovery (`ERR_LANE_NOT_FOUND`).
 */
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {join} from 'node:path';

const PACKAGED_CLI = join(process.cwd(), 'dist', 'bin', 'wt.js');
const OUTSIDE_ANY_LANE = '/';

interface PackagedResult {
    readonly exitCode: number;
    readonly ok: boolean;
    readonly code: string;
    readonly message: string;
}

function runPackaged(...argv: readonly string[]): PackagedResult {
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

function requirePackagedCli(): void {
    if (!existsSync(PACKAGED_CLI)) {
        throw new Error(`packaged CLI missing at ${PACKAGED_CLI}; run nvb dist before nvb test`);
    }
}

function expectPastParseBoundary(result: PackagedResult, parseHint: string): void {
    expect(result.code).withContext(result.message).not.toBe('ERR_INVALID_ARGUMENT');
    expect(result.message).not.toContain(parseHint);
    expect(result.code).toBe('ERR_LANE_NOT_FOUND');
}

describe('CA-14 packaged read-command dispatch', function () {
    beforeAll(requirePackagedCli);

    it('parses and dispatches packaged `batch ready` past the argv boundary', function () {
        expectPastParseBoundary(runPackaged('batch', 'ready'), 'batch positional arguments');
    }, 60000);

    it('parses and dispatches packaged `events tail` past the argv boundary', function () {
        expectPastParseBoundary(runPackaged('events', 'tail', '--limit=25'), 'events positional arguments');
    }, 60000);

    it('parses and dispatches packaged `events latest` past the argv boundary', function () {
        expectPastParseBoundary(runPackaged('events', 'latest', '--batch=CA-01'), 'events positional arguments');
    }, 60000);

    it('parses and dispatches packaged coordinator index read forms past the argv boundary', function () {
        expectPastParseBoundary(runPackaged('coordinator', 'index', 'status'), 'coordinator positional arguments');
        expectPastParseBoundary(runPackaged('coordinator', 'index', 'verify'), 'coordinator positional arguments');
        expectPastParseBoundary(runPackaged('coordinator', 'index', 'explain', 'CA-01'), 'coordinator positional arguments');
    }, 90000);

    it('still refuses invalid packaged batch and events forms at the argv boundary', function () {
        expect(runPackaged('batch', 'queue').code).toBe('ERR_INVALID_ARGUMENT');
        expect(runPackaged('events', 'stream').code).toBe('ERR_INVALID_ARGUMENT');
        expect(runPackaged('events', 'latest', '--since=e1').code).toBe('ERR_INVALID_ARGUMENT');
    }, 90000);
});
