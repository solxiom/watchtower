/**
 * REL-01 phase 4 — init refusal trial.
 *
 * Split from `accept-trial.spec.ts` by trial phase, as the batch brief permits,
 * so neither file approaches the spec size ceiling.
 *
 * Each case takes a **real** committed, sealed, accepted pack and damages
 * exactly one property the v1 acceptance contract requires, then runs the
 * installed `wt init`. The assertion is that init refuses, names a typed reason,
 * and leaves the control home without a lane — a partial lane would be worse
 * than a refusal, so absence of `.watchtower/lanes/<slug>` is asserted every
 * time.
 */
import {existsSync, readFileSync, rmSync, writeFileSync, appendFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {
    envelope, prepareInstall, requireDist, wt, INSTALL_TIMEOUT, RUN_TIMEOUT
} from './support/acceptTrialHarness.js';
import {makeInitEffectFixture, type InitEffectFixture} from '../foundation/fixtures/initEffectFixture.js';

const SLUG = 'refused-lane';

/** One damaged-pack case: a mutation, and the refusal it must produce. */
interface RefusalCase {
    readonly name: string;
    readonly damage: (fixture: InitEffectFixture) => void;
}

const CASES: readonly RefusalCase[] = [
    {
        name: 'an unaccepted pack whose acceptance record is absent',
        damage: (fixture) => rmSync(join(fixture.packRoot, 'pack-acceptance.json'))
    },
    {
        name: 'an unsealed pack whose lock seal does not reproduce',
        damage: (fixture) => {
            const path = join(fixture.packRoot, 'implementation-pack.lock.json');
            const lock = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
            lock.sealId = `sha256:${'0'.repeat(64)}`;
            writeFileSync(path, JSON.stringify(lock));
        }
    },
    {
        name: 'a critically drifted pack whose sealed bytes changed',
        damage: (fixture) => appendFileSync(join(fixture.packRoot, 'implementation-tracker.md'), 'drift\n')
    },
    {
        name: 'an uncommitted pack whose sealed file is untracked at HEAD',
        damage: (fixture) => {
            execFileSync('git', ['rm', '--quiet', '--cached', 'pack/implementation-tracker.md'],
                {cwd: fixture.controlHome, stdio: ['ignore', 'ignore', 'ignore']});
        }
    }
];

function initArgs(slug: string, fixture: InitEffectFixture): string[] {
    return [
        'init', slug, '--tmux-prefix=refuse', `--impl-pack=${fixture.packRoot}`,
        `--coordinator-routing=${join(fixture.controlHome, 'routing.json')}`,
        `--scope=${join(fixture.controlHome, 'scope.json')}`, '--runtime=1.0.0', '--json', '--no-color'
    ];
}

if (requireDist()) {
    describe('REL-01 phase 4 — init refuses every unacceptable pack', () => {
        beforeAll(prepareInstall, INSTALL_TIMEOUT);

        for (const testCase of CASES) {
            it(`refuses ${testCase.name}`, () => {
                const fixture = makeInitEffectFixture({slug: SLUG});
                try {
                    testCase.damage(fixture);
                    const run = wt(fixture.controlHome, fixture.dataHome, initArgs(SLUG, fixture));
                    const result = envelope(run);

                    expect(result.ok).withContext(run.stdout).toBeFalse();
                    expect(run.status).not.toBe(0);
                    expect(result.code).toMatch(/^ERR_/u);
                    // No partial lane may survive a refused init.
                    expect(existsSync(join(fixture.controlHome, '.watchtower', 'lanes', SLUG))).toBeFalse();
                } finally {
                    fixture.remove();
                }
            }, RUN_TIMEOUT);
        }

        it('refuses to initialize when `.watchtower/` is unignored and --update-gitignore is absent', () => {
            const fixture = makeInitEffectFixture({slug: SLUG});
            try {
                // Damaged after construction, not via `gitignoreCovered: false`:
                // that option makes the in-process LC-01 planner throw inside the
                // fixture itself, which would prove the planner rather than the
                // installed CLI this phase is about.
                writeFileSync(join(fixture.controlHome, '.gitignore'), 'node_modules/\n');
                const run = wt(fixture.controlHome, fixture.dataHome, initArgs(SLUG, fixture));
                const result = envelope(run);

                expect(result.ok).withContext(run.stdout).toBeFalse();
                expect(result.code).toBe('ERR_PREFLIGHT_FAILED');
                expect(existsSync(join(fixture.controlHome, '.watchtower', 'lanes', SLUG))).toBeFalse();
            } finally {
                fixture.remove();
            }
        }, RUN_TIMEOUT);

        it('refuses a second init over an existing lane and leaves it intact', () => {
            const fixture = makeInitEffectFixture({slug: SLUG});
            try {
                const first = wt(fixture.controlHome, fixture.dataHome, initArgs(SLUG, fixture));
                expect(envelope(first).ok).withContext(first.stderr).toBeTrue();
                const laneManifest = join(fixture.controlHome, '.watchtower', 'lanes', SLUG, 'lane.json');
                const before = readFileSync(laneManifest, 'utf8');

                const second = wt(fixture.controlHome, fixture.dataHome, initArgs(SLUG, fixture));
                const result = envelope(second);
                expect(result.ok).toBeFalse();
                expect(result.code).toBe('ERR_PREFLIGHT_FAILED');
                // The established lane must be byte-identical after the refusal.
                expect(readFileSync(laneManifest, 'utf8')).toBe(before);
            } finally {
                fixture.remove();
            }
        }, RUN_TIMEOUT);
    });
}
