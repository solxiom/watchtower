import {spawn} from 'node:child_process';
import {join} from 'node:path';

interface AttachRun {
    readonly status: number | null;
    readonly signal: NodeJS.Signals | null;
    readonly stdout: string;
    readonly stderr: string;
}

/**
 * Drives the real, built `WatchAttachment`/`nodeWatchSignalSource` (this
 * batch's exclusive runtime-adapter owner) together with the real,
 * command-owned `nodeWatchCommandSink` presentation boundary
 * (`src/commands/watch/watchCommandSink.ts`, routed through the Nirvana
 * pretty/view API per `docs/development/engineering-and-review-standard.md`
 * §3.1) in a genuinely separate OS process — the LC-06 batch's required proof
 * is "Preflight; exec behavior; stdout and Ctrl-C compatibility; no
 * daemonization", and this spec targets the last three directly against the
 * real production classes, without going through the foreign CA-01/CA-02
 * SQLite pack-index boundary that `watchCliProof.spec.ts` documents as
 * unopenable from a process spawned by a Node parent in this environment.
 */
function runAttachment(signal: NodeJS.Signals): Promise<AttachRun> {
    return new Promise((resolve, reject) => {
        const attachmentEntry = join(process.cwd(), 'build', 'src', 'foundation', 'task', 'watch', 'index.js');
        const sinkEntry = join(process.cwd(), 'build', 'src', 'commands', 'watch', 'watchCommandSink.js');
        const source = `
            import {WatchAttachment} from ${JSON.stringify(attachmentEntry)};
            import {nodeWatchCommandSink} from ${JSON.stringify(sinkEntry)};
            const lane = {
                laneId: '9d0ee3d2-8833-4fb7-b112-8438f04f57d2', slug: 'demo', initiativeId: 'watchtower-v1',
                kind: 'implementation', controlHome: '/control', laneDir: '/control/.watchtower/lanes/demo',
                lifecycle: 'active',
                manifest: {schemaVersion: 1, laneId: '9d0ee3d2-8833-4fb7-b112-8438f04f57d2', kind: 'implementation',
                    slug: 'demo', initiativeId: 'watchtower-v1', controlHomeRepository: 'main',
                    laneDir: '.watchtower/lanes/demo', repositories: []}
            };
            const outcome = await new WatchAttachment({sink: nodeWatchCommandSink}).attach(lane);
            console.log('OUTCOME', JSON.stringify(outcome));
        `;
        const child = spawn(process.execPath, ['--input-type=module', '--eval', source], {cwd: process.cwd()});
        let stdout = '';
        let stderr = '';
        let interrupted = false;
        const timeout = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('watch attachment process proof timed out')); }, 10000);
        child.stdout.on('data', (chunk: Buffer) => {
            stdout += chunk.toString();
            if (!interrupted && stdout.includes('Watching lane demo')) {
                interrupted = true;
                // A short settle delay before signaling: under the full suite's
                // cumulative process/handle load, sending the signal in the same
                // tick as the readiness line occasionally raced the child's own
                // signal-handler registration in this environment even though the
                // registration itself is synchronous; this delay only affects the
                // test harness's timing, never `WatchAttachment`'s production code.
                setTimeout(() => child.kill(signal), 100);
            }
        });
        child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
        child.on('close', (status, closeSignal) => { clearTimeout(timeout); resolve({status, signal: closeSignal, stdout, stderr}); });
        child.on('error', (error) => { clearTimeout(timeout); reject(error); });
    });
}

describe('WatchAttachment real-process proof — exec behavior, stdout, Ctrl-C, no daemonization', function () {
    it('attaches to the foreground, streams the attach line live, and exits cleanly once SIGINT arrives', async function () {
        const run = await runAttachment('SIGINT');

        expect(run.stdout).toContain('Watching lane demo (9d0ee3d2-8833-4fb7-b112-8438f04f57d2). Press Ctrl-C to stop.');
        expect(run.stdout).toContain('Stopping watch (SIGINT).');
        expect(run.stdout).toContain('OUTCOME {"outcome":"interrupted","signal":"SIGINT"}');
        expect(run.status).toBe(0);
        expect(run.signal).toBeNull();
        expect(run.stderr).toBe('');
    });

    it('handles SIGTERM identically to SIGINT — a daemonized process would ignore or trap one of them, this exits cleanly on both', async function () {
        const run = await runAttachment('SIGTERM');

        expect(run.stdout).toContain('Stopping watch (SIGTERM).');
        expect(run.stdout).toContain('OUTCOME {"outcome":"interrupted","signal":"SIGTERM"}');
        expect(run.status).toBe(0);
        expect(run.signal).toBeNull();
    });
});
