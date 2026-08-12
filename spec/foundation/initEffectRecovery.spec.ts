/**
 * LC-11 correction 01, F-02 — post-commit retry convergence and idempotence.
 *
 * `docs/spec/v1-contracts.md` §11 forbids rolling a committed lane back, so
 * every post-commit failure must be recoverable by *retrying* the completion
 * from whatever durable state it left. This exercises each of those states —
 * failed activation, a partially published index, failed verification, failed
 * lifecycle replacement, and unpublished memberships — and proves the retry
 * converges on the same `active` lane, then proves a further retry changes
 * nothing.
 */
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {WatchtowerError} from '../../src/contracts/index.js';
import {InitEffect, createInitEffectPorts} from '../../src/foundation/lane/index.js';
import {completeInitCommit, type InitEffectPorts} from '../../src/foundation/lane/init/index.js';
import {makeInitEffectFixture, type InitEffectFixture} from './fixtures/initEffectFixture.js';

/** One durable post-commit state, produced by a real injected failure. */
interface RecoveryCase {
    readonly name: string;
    readonly ports: (base: InitEffectPorts, fixture: InitEffectFixture) => Partial<InitEffectPorts>;
    /** Additional damage applied after the (successful or failed) first attempt. */
    readonly damage?: (fixture: InitEffectFixture) => void;
    readonly lifecycleAfterFailure: 'bootstrap' | 'active';
    readonly fails: boolean;
}

const CASES: readonly RecoveryCase[] = [
    {
        name: 'a failed index activation',
        ports: () => ({activateIndex: () => Promise.resolve({ok: false as const,
            reason: 'PACK_INDEX_PUBLISH_FAILED' as const, target: 'coordinator/index/pack',
            detail: 'the injected publication failed'})}),
        lifecycleAfterFailure: 'bootstrap',
        fails: true
    },
    {
        name: 'a partially published pack index',
        ports: (base) => ({activateIndex: base.activateIndex}),
        damage: (fixture) => rmSync(join(fixture.laneDir, 'coordinator', 'index', 'pack', 'current.json')),
        lifecycleAfterFailure: 'active',
        fails: false
    },
    {
        name: 'a failed post-commit verification',
        ports: () => ({verifyCommit: () => { throw injected('verification'); }}),
        lifecycleAfterFailure: 'bootstrap',
        fails: true
    },
    {
        name: 'a failed lifecycle replacement',
        ports: () => ({projectLifecycle: () => Promise.reject(injected('lifecycle'))}),
        lifecycleAfterFailure: 'bootstrap',
        fails: true
    },
    {
        name: 'an unpublished membership index',
        ports: () => ({registerMemberships: () =>
            Promise.resolve({registered: false, retryCount: 3, warning: 'index unavailable'})}),
        lifecycleAfterFailure: 'active',
        fails: false
    }
];

describe('init effect — post-commit retry convergence', function () {
    let fixture: InitEffectFixture;
    beforeEach(function () { fixture = makeInitEffectFixture(); });
    afterEach(function () { fixture.remove(); });

    for (const scenario of CASES) {
        it(`converges and stays idempotent after ${scenario.name}`, async function () {
            const base = createInitEffectPorts();
            await firstAttempt(scenario, base, fixture);
            const damaged = durableState(fixture);
            expect(lifecycleOf(fixture)).toBe(scenario.lifecycleAfterFailure);
            expect(existsSync(join(fixture.laneDir, 'lane.json'))).toBeTrue();

            const recovered = await retry(base, fixture);
            const afterFirstRetry = durableState(fixture);
            const again = await retry(base, fixture);

            expect(recovered.lane.lifecycle).toBe('active');
            expect(again.lane.id).toBe(recovered.lane.id);
            expect(again.pack.indexId).toBe(recovered.pack.indexId);
            expect(again.warnings.map((warning) => warning.code)).not.toContain('MEMBERSHIP_REGISTRATION_PENDING');
            expect(durableState(fixture)).toBe(afterFirstRetry);
            expect(registeredLanes(fixture)).toContain(fixture.plan.lane.id);
            // Positive control: the retry actually had something to converge
            // from, except in the one case whose damage is outside the digest.
            if (scenario.name !== 'an unpublished membership index') {
                expect(afterFirstRetry).not.toBe(damaged);
            }
        });
    }
});

/** Runs the first attempt, which either refuses or applies, then applies the case's damage. */
async function firstAttempt(
    scenario: RecoveryCase, base: InitEffectPorts, fixture: InitEffectFixture
): Promise<void> {
    const effect = new InitEffect({...base, ...scenario.ports(base, fixture)});
    if (scenario.fails) {
        await expectRefusal(effect.apply(fixture.request));
    } else {
        expect((await effect.apply(fixture.request)).applied).toBeTrue();
    }
    scenario.damage?.(fixture);
}

/** The documented recovery: re-run the post-commit completion with working collaborators. */
async function retry(base: InitEffectPorts, fixture: InitEffectFixture) {
    const pack = await base.validatePack(fixture.request);
    return completeInitCommit(base, fixture.request, pack,
        {laneDir: fixture.laneDir, gitignoreUpdated: false});
}

function lifecycleOf(fixture: InitEffectFixture): string {
    return readFileSync(join(fixture.laneDir, 'state', 'coordinator-lane-state.txt'), 'utf8')
        .replace('lane_status=', '').trim();
}

/** A digest of every authoritative lane document plus the active index pointer. */
function durableState(fixture: InitEffectFixture): string {
    const documents = ['lane.json', 'install.json', 'repositories.local.json', 'lane.config.env',
        'state/coordinator-lane-state.txt', 'coordinator/coordinator-routing.json',
        'coordinator/routing-policy.json', 'coordinator/context-policy.json',
        'coordinator/index/pack/current.json'];
    const digest = createHash('sha256');
    for (const document of documents) {
        const path = join(fixture.laneDir, document);
        digest.update(document).update(existsSync(path) ? readFileSync(path) : Buffer.from('<absent>'));
    }
    return digest.digest('hex');
}

function registeredLanes(fixture: InitEffectFixture): string[] {
    const path = join(fixture.dataHome, 'index', 'repository-memberships.json');
    if (!existsSync(path)) return [];
    const index = JSON.parse(readFileSync(path, 'utf8')) as Record<string, {laneId: string}>;
    return Object.values(index).map((entry) => entry.laneId);
}

async function expectRefusal(promise: Promise<unknown>): Promise<WatchtowerError> {
    try {
        await promise;
    } catch (error) {
        if (error instanceof WatchtowerError) return error;
        throw error;
    }
    throw new Error('expected the init effect to refuse');
}

function injected(boundary: string): Error {
    return Object.assign(new Error(`injected ${boundary} failure`), {code: 'EIO'});
}
