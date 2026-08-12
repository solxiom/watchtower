/**
 * LC-11 correction 01, F-01 — the post-commit lock scope.
 *
 * `docs/spec/v1-contracts.md` §11 fixes the lock order and requires the lane
 * and operator-session locks for a lane mutation. Those two paths live inside
 * the lane directory, so they only become acquirable at the commit rename;
 * from that point the complete four-lock scope is held across index
 * activation, verification, and the `bootstrap` → `active` projection.
 *
 * The fence is proven against the real on-disk lock records, not against the
 * in-process lease guard: each assertion takes the same exclusive `wx` record
 * a competing process would take, so a concurrent index or lane mutation is
 * shown to be refused for the whole window.
 */
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {WatchtowerError} from '../../src/contracts/index.js';
import {InitEffect, createInitEffectPorts} from '../../src/foundation/lane/index.js';
import {registerLaneWithRetry} from '../../src/foundation/lifecycle/index.js';
import {acquireWriteLock} from '../../src/foundation/storage/sqliteWriteLock.js';
import {makeInitEffectFixture, type InitEffectFixture} from './fixtures/initEffectFixture.js';

const CONTENDER = {timeoutMs: 60, pollMs: 10};

describe('init effect — post-commit lock scope', function () {
    let fixture: InitEffectFixture;
    beforeEach(function () { fixture = makeInitEffectFixture(); });
    afterEach(function () { fixture.remove(); });

    it('holds every §11 lock across activation, verification, and the lifecycle projection', async function () {
        const observed: string[][] = [];
        const conflicts: string[] = [];
        const base = createInitEffectPorts();
        const ports = {
            ...base,
            activateIndex: async (request: Parameters<typeof base.activateIndex>[0],
                pack: Parameters<typeof base.activateIndex>[1], laneDir: string) => {
                observed.push(heldLocks(fixture, laneDir));
                conflicts.push(await contend(join(laneDir, 'state', 'lane.lock')));
                return base.activateIndex(request, pack, laneDir);
            },
            projectLifecycle: async (laneDir: string, lifecycle: 'bootstrap' | 'active') => {
                observed.push(heldLocks(fixture, laneDir));
                conflicts.push(await contend(join(laneDir, 'coordinator', 'operator-sessions', 'session.lock')));
                return base.projectLifecycle(laneDir, lifecycle);
            }
        };

        const result = await new InitEffect(ports).apply(fixture.request);

        expect(result.lane.lifecycle).toBe('active');
        expect(observed.length).toBe(2);
        for (const held of observed) expect(held).toEqual(lockPaths(fixture, fixture.laneDir));
        expect(conflicts).toEqual(['ERR_LOCK_CONFLICT', 'ERR_LOCK_CONFLICT']);
        // Positive control: the same contender succeeds once the window closes,
        // so the refusals above come from the held scope and not from an
        // unrelated permission or path failure.
        expect(await contend(join(fixture.laneDir, 'state', 'lane.lock'))).toBe('acquired');
    });

    it('records the §11 owner evidence in each held lock and releases every one afterwards', async function () {
        let records: unknown[] = [];
        const base = createInitEffectPorts();
        const ports = {
            ...base,
            verifyCommit: (laneDir: string, pack: Parameters<typeof base.verifyCommit>[1]) => {
                records = lockPaths(fixture, laneDir).map((path) => JSON.parse(readFileSync(path, 'utf8')) as unknown);
                base.verifyCommit(laneDir, pack);
            }
        };

        await new InitEffect(ports).apply(fixture.request);

        expect(records.length).toBe(4);
        for (const record of records) {
            const owner = record as Record<string, unknown>;
            expect(typeof owner.pid).toBe('number');
            expect(typeof owner.processStartIdentity).toBe('string');
            expect(typeof owner.command).toBe('string');
            expect(typeof owner.acquiredAt).toBe('string');
        }
        for (const path of lockPaths(fixture, fixture.laneDir)) expect(existsSync(path)).toBeFalse();
    });

    it('publishes memberships under the same normative scope, not outside it', async function () {
        await new InitEffect(createInitEffectPorts()).apply(fixture.request);
        let duringPublish = '';

        const result = await registerLaneWithRetry(fixture.laneDir, 0, {
            dataHome: fixture.dataHome,
            beforePublish: async () => { duringPublish = await contend(join(fixture.laneDir, 'state', 'lane.lock')); }
        });

        expect(result.registered).toBeTrue();
        expect(duringPublish).toBe('ERR_LOCK_CONFLICT');
    });
});

function lockPaths(fixture: InitEffectFixture, laneDir: string): string[] {
    const indexDir = join(fixture.dataHome, 'index');
    return [
        join(indexDir, '.membership-index.lock'),
        join(laneDir, 'state', 'lane.lock'),
        join(laneDir, 'coordinator', 'operator-sessions', 'session.lock'),
        join(indexDir, '.publication.lock')
    ];
}

function heldLocks(fixture: InitEffectFixture, laneDir: string): string[] {
    return lockPaths(fixture, laneDir).filter((path) => existsSync(path));
}

/** Takes the same exclusive record a competing process would; returns its refusal code. */
async function contend(path: string): Promise<string> {
    try {
        const lock = await acquireWriteLock(path, CONTENDER);
        await lock.release();
        return 'acquired';
    } catch (error) {
        return error instanceof WatchtowerError ? error.code : 'unexpected';
    }
}
