import {execFileSync} from 'node:child_process';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseOpenCodeResult, OPENCODE_JSONL_FORMAT_VERSION, openCodeParseLimits} from '../../src/foundation/endpoint/openCodeEventStream.js';
import {OPENCODE_MAX_OUTPUT_BYTES} from '../../src/contracts/opencodeEndpoint.js';
import {OPENCODE_11814_VERSION} from './support/opencodeStreamFixtures.js';

function opencodeExecutable(): string {
    return execFileSync('bash', ['-lc', 'source ~/.nvm/nvm.sh && command -v opencode'], {encoding: 'utf8'}).trim();
}

describe('OpenCode 1.18.16 executable JSONL conformance', () => {
    it('matches the pinned compatible version and parses a live unattended stream', () => {
        const executable = opencodeExecutable();
        const version = execFileSync(executable, ['--version'], {encoding: 'utf8'}).trim();
        expect(version).toBe(OPENCODE_11814_VERSION);
        expect(OPENCODE_JSONL_FORMAT_VERSION).toBe(OPENCODE_11814_VERSION);

        const workspace = mkdtempSync(join(tmpdir(), 'wt-opencode-'));
        // `opencode/deepseek-v4-flash-free` intermittently hangs past 120s on the
        // real free tier; `nemotron-3.5-lightning-free` completes reliably for
        // the same unattended JSONL conformance probe (REL-03 C03 evidence).
        const stdout = execFileSync(executable, [
            'run', '--pure', '--format', 'json', '--model', 'opencode/nemotron-3.5-lightning-free', '--dir', workspace,
            'Reply with ONLY this JSON object, no markdown: {"decision":"hold"}'
        ], {encoding: 'utf8', timeout: 120_000, env: {...process.env, NO_COLOR: '1'}});

        expect(stdout.split('\n').filter(line => line.trim().length > 0).length).toBeGreaterThan(1);
        const parsed = parseOpenCodeResult(stdout, openCodeParseLimits(OPENCODE_MAX_OUTPUT_BYTES));
        expect(parsed.ok).withContext(stdout).toBeTrue();
        if (parsed.ok) expect(JSON.stringify(parsed.value)).toBe('{"decision":"hold"}');
    });
});
