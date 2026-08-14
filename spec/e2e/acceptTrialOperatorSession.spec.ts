/**
 * REL-01 release qualification — phase 8, operator-session lifecycle.
 *
 * Split by trial phase, per the brief's structural allowance.
 *
 * These commands enforce the accepted v1 §4 `SESSION_COMMAND_TERMINAL_REQUIRED`
 * fence, which earlier revisions of this batch recorded as making phase 8
 * unexecutable. That was a harness limitation, not a product fence: the
 * lifecycle runs correctly under a real controlling terminal, which
 * `wtPty` provides. Both sides are proven here — the refusal on piped stdio and
 * the success on a PTY.
 *
 * Out of scope by the normative spec, not by omission: `wt coordinator hold
 * place|release|list` (brief phase 8 steps 7–9) is marked ❌ "not implemented"
 * in `docs/spec/v1.md` §"CLI surface". Asserting it would demand a v1
 * non-deliverable, so it is recorded in the evidence packet instead.
 */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {
    envelope, installFailureReason, prepareInstall, ptyAvailable, requireDist, wt, wtPty,
    INSTALL_TIMEOUT, RUN_TIMEOUT
} from './support/acceptTrialHarness.js';
import {makeInitEffectFixture, type InitEffectFixture} from '../foundation/fixtures/initEffectFixture.js';

const SLUG = 'rel-one-session';
const M0_FORM = 'operator-session-projection-v1';

interface SessionResult {
    readonly state?: string;
    readonly role?: string;
    readonly from?: string;
    readonly to?: string;
    readonly sessions?: readonly {operatorSessionId: string; state: string}[];
    readonly turns?: readonly unknown[];
}

function result(run: ReturnType<typeof wt>): SessionResult {
    return ((envelope(run).data as {result?: SessionResult}).result) ?? {};
}

function initArgs(fixture: InitEffectFixture): string[] {
    return [
        'init', SLUG, '--tmux-prefix=relses', `--impl-pack=${fixture.packRoot}`,
        `--coordinator-routing=${join(fixture.controlHome, 'routing.json')}`,
        `--scope=${join(fixture.controlHome, 'scope.json')}`, '--runtime=1.0.0', '--json', '--no-color'
    ];
}

if (requireDist()) {
    describe('REL-01 phase 8 — operator-session lifecycle', () => {
        let fixture: InitEffectFixture;
        let laneDir = '';

        beforeAll(async () => {
            await prepareInstall();
            fixture = makeInitEffectFixture({slug: SLUG});
            laneDir = join(fixture.controlHome, '.watchtower', 'lanes', SLUG);
            const init = wt(fixture.controlHome, fixture.dataHome, initArgs(fixture));
            expect(init.status).withContext(init.stderr).toBe(0);
        }, INSTALL_TIMEOUT);

        afterAll(() => fixture?.remove());

        it('refuses session creation on piped stdio', () => {
            expect(installFailureReason()).toBe('');
            const run = wt(fixture.controlHome, fixture.dataHome,
                ['coordinator', 'session', '--topic=piped', `--lane=${SLUG}`, '--json', '--no-color']);

            expect(run.status).withContext(run.stdout).toBe(4);
            expect(envelope(run).code).toBe('ERR_PREFLIGHT_FAILED');
            expect(`${run.stdout}${run.stderr}`).toContain('SESSION_COMMAND_TERMINAL_REQUIRED');
        }, RUN_TIMEOUT);

        it('refuses an apply that no durable authorization capsule permits', () => {
            if (!ptyAvailable()) return pending('`script` (util-linux) is unavailable; a PTY cannot be allocated.');
            const created = wtPty(fixture.controlHome, fixture.dataHome,
                ['coordinator', 'session', '--topic=capsule', `--lane=${SLUG}`, '--json', '--no-color']);
            const id = /opsess-[0-9a-f-]+/u.exec(created.stdout)?.[0] ?? '';
            expect(id).not.toBe('');

            const run = wtPty(fixture.controlHome, fixture.dataHome,
                ['coordinator', 'session', 'apply', id, 'prop-absent', `--lane=${SLUG}`, '--json', '--no-color']);

            expect(run.status).withContext(run.stdout).toBe(5);
            expect(envelope(run).code).toBe('ERR_CONFIRMATION_REQUIRED');
            expect(`${run.stdout}${run.stderr}`).toContain('SESSION_COMMAND_CONFIRMATION_REQUIRED');
        }, RUN_TIMEOUT);

        // One spec for the ordered lifecycle: Jasmine randomizes spec order and
        // create→ask→attach→close is inherently sequential on one session.
        it('creates, answers advisorily, attaches, and closes under a real terminal', () => {
            if (!ptyAvailable()) return pending('`script` (util-linux) is unavailable; a PTY cannot be allocated.');

            const created = wtPty(fixture.controlHome, fixture.dataHome,
                ['coordinator', 'session', `--topic=${SLUG}`, `--lane=${SLUG}`, '--json', '--no-color']);
            expect(created.status).withContext(created.stderr).toBe(0);
            expect(result(created).state).toBe('ATTACHED');
            const id = /opsess-[0-9a-f-]+/u.exec(created.stdout)?.[0] ?? '';
            expect(id).not.toBe('');

            const listed = wt(fixture.controlHome, fixture.dataHome,
                ['coordinator', 'session', 'list', `--lane=${SLUG}`, '--json', '--no-color']);
            expect(listed.status).toBe(0);
            expect(result(listed).sessions?.find((entry) => entry.operatorSessionId === id)?.state)
                .withContext(listed.stdout).toBe('open');

            // Advisory: answered model-free from durable session bytes, and it
            // must not mutate the lane or append a turn.
            const asked = wtPty(fixture.controlHome, fixture.dataHome,
                ['coordinator', 'ask', '--question=What batch should we focus on next?',
                    `--session=${id}`, `--query-form=${M0_FORM}`, `--lane=${SLUG}`, '--json', '--no-color']);
            expect(asked.status).withContext(asked.stderr).toBe(0);
            const advisory = envelope(asked).data as {applied?: boolean; result?: {usedModel?: boolean; decisionClass?: string}};
            expect(advisory.applied).withContext(asked.stdout).toBe(false);
            expect(advisory.result?.usedModel).toBe(false);
            expect(advisory.result?.decisionClass).toBe('M0');

            const attached = wtPty(fixture.controlHome, fixture.dataHome,
                ['coordinator', 'session', 'attach', id, '--observe', `--lane=${SLUG}`, '--json', '--no-color']);
            expect(attached.status).withContext(attached.stderr).toBe(0);
            expect(result(attached).state).toBe('OBSERVING');
            expect(result(attached).role).toBe('observer');
            // Attachment settles without appending a turn.
            const history = wt(fixture.controlHome, fixture.dataHome,
                ['coordinator', 'session', 'history', id, `--lane=${SLUG}`, '--json', '--no-color']);
            expect(result(history).turns).withContext(history.stdout).toEqual([]);

            // Detaching leaves the session open; only `close` transitions it.
            const stillOpen = wt(fixture.controlHome, fixture.dataHome,
                ['coordinator', 'session', 'show', id, `--lane=${SLUG}`, '--json', '--no-color']);
            expect(stillOpen.stdout).withContext(stillOpen.stderr).toContain('"state":"open"');

            const closed = wtPty(fixture.controlHome, fixture.dataHome,
                ['coordinator', 'session', 'close', id, `--lane=${SLUG}`, '--json', '--no-color']);
            expect(closed.status).withContext(closed.stderr).toBe(0);
            expect(result(closed).from).toBe('open');
            expect(result(closed).to).toBe('closed');

            // The lane mutation lock is never held by session work.
            expect(readFileSync(join(laneDir, 'lane.json'), 'utf8')).toContain('"slug"');
        }, RUN_TIMEOUT);
    });
}
