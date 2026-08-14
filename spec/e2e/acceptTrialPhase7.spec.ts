/**
 * REL-01 release qualification — phase 7, coordinator mutation authorization.
 *
 * Phase 7a proves the shipped cycle command refuses without a durable capsule.
 * Phase 7b replays an operator witness: a CA-25-valid capsule authored outside
 * implementer authority, then a bounded `--dry-run` preview through the installed
 * `wt` binary.
 */
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {
    envelope, installFailureReason, prepareInstall, requireDist, wt,
    INSTALL_TIMEOUT, RUN_TIMEOUT
} from './support/acceptTrialHarness.js';
import {makeInitEffectFixture, type InitEffectFixture} from '../foundation/fixtures/initEffectFixture.js';
import {cycleTriggerId, witnessCycleAuthorizationCapsule} from './support/operatorWitnessCycleCapsule.js';
import {laneDigest} from '../foundation/coordinatorMutation/support/mutationFixtures.js';

const TRIGGER = cycleTriggerId();

function initArgs(slug: string, fixture: InitEffectFixture): string[] {
    return [
        'init', slug, '--tmux-prefix=relcyc', `--impl-pack=${fixture.packRoot}`,
        `--coordinator-routing=${join(fixture.controlHome, 'routing.json')}`,
        `--scope=${join(fixture.controlHome, 'scope.json')}`, '--runtime=1.0.0', '--json', '--no-color'
    ];
}

if (requireDist()) {
    describe('REL-01 phase 7a — cycle authorization fence', () => {
        let fixture: InitEffectFixture;
        const slug = 'rel-one-cycle-fence';

        beforeAll(async () => {
            await prepareInstall();
            fixture = makeInitEffectFixture({slug});
            const init = wt(fixture.controlHome, fixture.dataHome, initArgs(slug, fixture));
            expect(init.status).withContext(init.stderr).toBe(0);
        }, INSTALL_TIMEOUT);

        afterAll(() => fixture?.remove());

        it('refuses cycle dry-run when no authorization capsule exists', () => {
            expect(installFailureReason()).toBe('');
            const laneDir = join(fixture.controlHome, '.watchtower', 'lanes', slug);
            const capsulePath = join(laneDir, 'coordinator', 'authorizations', 'cycle.json');
            expect(existsSync(capsulePath)).toBeFalse();

            const run = wt(fixture.controlHome, fixture.dataHome,
                ['coordinator', 'cycle', `--trigger=${TRIGGER}`, '--dry-run', `--lane=${slug}`, '--json', '--no-color']);

            expect(run.status).withContext(`${run.stdout}${run.stderr}`).toBe(4);
            expect(envelope(run).code).toBe('ERR_MISSING_DEPENDENCY');
            expect(`${run.stdout}${run.stderr}`).toContain('COORDINATOR_MUTATION_AUTHORIZATION_UNAVAILABLE');
        }, RUN_TIMEOUT);
    });

    describe('REL-01 phase 7b — operator witness cycle preview', () => {
        let fixture: InitEffectFixture;
        const slug = 'rel-one-cycle-witness';

        beforeAll(async () => {
            await prepareInstall();
            fixture = makeInitEffectFixture({slug});
            const init = wt(fixture.controlHome, fixture.dataHome, initArgs(slug, fixture));
            expect(init.status).withContext(init.stderr).toBe(0);
        }, INSTALL_TIMEOUT);

        afterAll(() => fixture?.remove());

        it('previews cycle dry-run after operator-authored CA-25-valid capsule', () => {
            expect(installFailureReason()).toBe('');
            const laneDir = join(fixture.controlHome, '.watchtower', 'lanes', slug);
            const beforeCapsule = laneDigest(laneDir);

            const path = witnessCycleAuthorizationCapsule(laneDir);
            expect(existsSync(path)).toBeTrue();
            const afterCapsule = laneDigest(laneDir);
            expect(afterCapsule.length).toBeGreaterThan(beforeCapsule.length);

            const run = wt(fixture.controlHome, fixture.dataHome,
                ['coordinator', 'cycle', `--trigger=${TRIGGER}`, '--dry-run', `--lane=${slug}`, '--json', '--no-color']);

            expect(run.status).withContext(`${run.stdout}${run.stderr}`).toBe(0);
            const data = envelope(run).data as {status?: string; dryRun?: boolean; operation?: string};
            expect(data.status).toBe('previewed');
            expect(data.dryRun).toBeTrue();
            expect(data.operation).toBe('cycle');
            expect(laneDigest(laneDir)).toEqual(afterCapsule);
        }, RUN_TIMEOUT);
    });
}
