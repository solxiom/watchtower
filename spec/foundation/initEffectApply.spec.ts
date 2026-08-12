/**
 * LC-11 — the applied init effect against real bytes: one committed,
 * accepted, sealed pack becomes one usable lane, and the post-commit
 * completion is idempotent.
 */
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createInitEffect, createInitEffectPorts} from '../../src/foundation/lane/index.js';
import {completeInitCommit} from '../../src/foundation/lane/init/index.js';
import {WatchPreflight} from '../../src/foundation/task/index.js';
import {makeInitEffectFixture, type InitEffectFixture} from './fixtures/initEffectFixture.js';

describe('init effect — applied lane creation', function () {
    let fixture: InitEffectFixture;
    beforeEach(function () { fixture = makeInitEffectFixture(); });
    afterEach(function () { fixture.remove(); });

    it('creates a usable, active lane from the accepted pack', async function () {
        const result = await createInitEffect().apply(fixture.request);

        expect(result.applied).toBeTrue();
        expect(result.lane.lifecycle).toBe('active');
        expect(result.lane.dir).toBe(fixture.laneDir);
        expect(result.pack.sealId.startsWith('sha256:')).toBeTrue();
        expect(result.pack.indexId.length).toBeGreaterThan(0);
        expect(result.warnings.map((warning) => warning.code)).not.toContain('MEMBERSHIP_REGISTRATION_PENDING');
        for (const artifact of ['lane.json', 'install.json', 'repositories.local.json', 'lane.config.env',
            'state/coordinator-lane-state.txt', 'coordinator/coordinator-routing.json',
            'coordinator/routing-policy.json', 'coordinator/context-policy.json',
            'coordinator/index/pack/current.json', 'bin/runtime-nvb.json']) {
            expect(existsSync(join(fixture.laneDir, artifact))).withContext(artifact).toBeTrue();
        }
        expect(readFileSync(join(fixture.laneDir, 'state', 'coordinator-lane-state.txt'), 'utf8'))
            .toBe('lane_status=active\n');
        const manifest = JSON.parse(readFileSync(join(fixture.laneDir, 'lane.json'), 'utf8')) as {laneId: string};
        expect(manifest.laneId).toBe(fixture.plan.lane.id);
        const memberships = JSON.parse(readFileSync(
            join(fixture.dataHome, 'index', 'repository-memberships.json'), 'utf8')) as Record<string, {laneId: string}>;
        expect(memberships[fixture.controlHome].laneId).toBe(fixture.plan.lane.id);
    });

    it('reports the mutation as a bounded, control-home-relative changed inventory', async function () {
        const result = await createInitEffect().apply(fixture.request);

        expect(result.changed).toContain(`.watchtower/lanes/${fixture.plan.lane.slug}`);
        expect(result.changed).toContain(`.watchtower/lanes/${fixture.plan.lane.slug}/lane.json`);
        expect(result.changed).not.toContain('.gitignore');
        expect(result.unchanged).toEqual([]);
    });

    /**
     * LC-11 correction 01, F-03 (positive half): the lane init creates is
     * genuinely attachable. `WatchPreflight` is `watch`'s own accepted owner of
     * lane resolution, install identity, runtime root, and the activated pack
     * index, and it succeeds here in-process against the created lane — the
     * attachment readiness a nested-spawn CLI run cannot demonstrate.
     */
    it('produces a lane the accepted watch preflight resolves and opens', async function () {
        const applied = await createInitEffect().apply(fixture.request);

        const preflight = await new WatchPreflight().run({
            cwd: fixture.controlHome, workspace: fixture.controlHome, lane: applied.lane.slug
        });

        expect(preflight.lane.laneId).toBe(applied.lane.id);
        expect(preflight.lane.laneDir).toBe(fixture.laneDir);
        expect(preflight.runtimeVersion).toBe('1.0.0');
        expect(preflight.indexId).toBe(applied.pack.indexId);
    });

    it('re-running the post-commit completion is idempotent', async function () {
        const ports = createInitEffectPorts();
        const first = await createInitEffect().apply(fixture.request);
        const pack = await ports.validatePack(fixture.request);

        const again = await completeInitCommit(ports, fixture.request, pack,
            {laneDir: fixture.laneDir, gitignoreUpdated: false});

        expect(again.lane.id).toBe(first.lane.id);
        expect(again.pack.indexId).toBe(first.pack.indexId);
        expect(readFileSync(join(fixture.laneDir, 'state', 'coordinator-lane-state.txt'), 'utf8'))
            .toBe('lane_status=active\n');
    });
});
