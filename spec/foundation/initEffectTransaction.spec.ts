/**
 * LC-11 — the transactional failure matrix. Every pre-commit boundary is
 * injected with a real failure and must leave the destination absent, the
 * membership index untouched, and `.gitignore` byte-identical; every
 * post-commit boundary must leave a valid, home-discoverable lane that stays
 * `bootstrap` rather than a half-lane (`docs/spec/v1-contracts.md` §11).
 */
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {WatchtowerError} from '../../src/contracts/index.js';
import {InitEffect, createInitEffectPorts} from '../../src/foundation/lane/index.js';
import {INIT_EFFECT_PHASES, type InitEffectPhase, type InitEffectPorts} from '../../src/foundation/lane/init/index.js';
import {
    nodeTransactionalWriterFileSystem, type TransactionalWriterFileSystem
} from '../../src/foundation/lane/writer/index.js';
import {makeInitEffectFixture, type InitEffectFixture} from './fixtures/initEffectFixture.js';

interface PreCommitCase {
    readonly name: string;
    readonly phase: InitEffectPhase;
    readonly ports: () => Partial<InitEffectPorts>;
}

/** Pre-commit boundaries: the lane must not exist and nothing may be left behind. */
const PRE_COMMIT: readonly PreCommitCase[] = [
    {name: 'pack validation', phase: 'pack-validation',
        ports: () => ({validatePack: () => Promise.reject(injected('pack'))})},
    {name: 'runtime resolution', phase: 'runtime-resolution',
        ports: () => ({resolveInstall: () => { throw injected('runtime'); }})},
    {name: 'lock acquisition', phase: 'lock-acquisition',
        ports: () => ({acquireLocks: () => Promise.reject(injected('lock'))})},
    {name: 'baseline and layout composition', phase: 'layout-composition',
        ports: () => ({composeLayout: () => { throw injected('layout'); }})}
];

/** Every phase this file's scenarios inject a real failure at. */
const COVERED_PHASES: readonly InitEffectPhase[] = [
    ...PRE_COMMIT.map((scenario) => scenario.phase),
    'gitignore-update', 'lane-commit', 'index-activation', 'post-commit-verification',
    'lifecycle-activation', 'membership-registration'
];

interface StagingCase {
    readonly name: string;
    readonly operation: keyof TransactionalWriterFileSystem;
    /** Narrows the injected failure to one specific call, e.g. only the final commit rename. */
    readonly match?: (fixture: InitEffectFixture, args: readonly unknown[]) => boolean;
}

/** Staging boundaries inside LC-03's commit path, injected on the real filesystem port. */
const STAGING: readonly StagingCase[] = [
    {name: 'staging directory creation', operation: 'mkdtemp'},
    {name: 'a staged directory write', operation: 'mkdir'},
    {name: 'a staged file write', operation: 'open'},
    {name: 'a staged managed link', operation: 'symlink'},
    {name: 'a staged fsync', operation: 'syncDirectory'},
    {name: 'a staged manifest rename', operation: 'rename'},
    {name: 'the final commit rename', operation: 'rename',
        match: (fixture, args) => args[1] === fixture.laneDir}
];

describe('init effect — pre-commit failure matrix', function () {
    let fixture: InitEffectFixture;
    beforeEach(function () { fixture = makeInitEffectFixture(); });
    afterEach(function () { fixture.remove(); });

    for (const scenario of PRE_COMMIT) {
        it(`rolls back completely when ${scenario.name} fails`, async function () {
            const before = fixture.inventory();

            const error = await expectRefusal(
                new InitEffect({...createInitEffectPorts(), ...scenario.ports()}).apply(fixture.request));

            expect(error.message).toContain(`apply init (${scenario.phase})`);
            expect(existsSync(fixture.laneDir)).toBeFalse();
            expect(existsSync(join(fixture.dataHome, 'index', 'repository-memberships.json'))).toBeFalse();
            expect(fixture.inventory()).toBe(before);
        });
    }

    it('injects a real failure at every declared init effect phase', function () {
        expect([...new Set(COVERED_PHASES)].sort()).toEqual([...INIT_EFFECT_PHASES].sort());
    });

    for (const scenario of STAGING) {
        it(`rolls the staging tree back when ${scenario.name} fails`, async function () {
            const before = fixture.inventory();
            const files = failingWriter(scenario.operation,
                scenario.match === undefined ? undefined : (args) => scenario.match!(fixture, args));

            const error = await expectRefusal(new InitEffect(createInitEffectPorts({writerFileSystem: files}))
                .apply(fixture.request));

            expect(error.message).toContain('apply init (lane-commit)');
            expect(existsSync(fixture.laneDir)).toBeFalse();
            expect(files.calls).toBeGreaterThan(0);
            expect(fixture.inventory()).toBe(before);
        });
    }
});

describe('init effect — conditional Git-ignore rollback', function () {
    it('restores the operator .gitignore byte for byte when the commit fails', async function () {
        const fixture = makeInitEffectFixture({gitignoreCovered: false, updateGitignore: true});
        try {
            const gitignore = join(fixture.controlHome, '.gitignore');
            const original = digest(readFileSync(gitignore));
            expect(fixture.plan.warnings.map((warning) => warning.code)).toContain('GITIGNORE_UPDATE_PENDING');

            await expectRefusal(new InitEffect(createInitEffectPorts({writerFileSystem: failingWriter('rename')}))
                .apply(fixture.request));

            expect(digest(readFileSync(gitignore))).toBe(original);
            expect(existsSync(fixture.laneDir)).toBeFalse();
        } finally {
            fixture.remove();
        }
    });

    it('rolls back with the original bytes when the Git-ignore update itself fails', async function () {
        const fixture = makeInitEffectFixture({gitignoreCovered: false, updateGitignore: true});
        try {
            const before = fixture.inventory();
            const ports = {...createInitEffectPorts(),
                updateGitignore: () => Promise.reject(injected('gitignore'))};

            const error = await expectRefusal(new InitEffect(ports).apply(fixture.request));

            expect(error.message).toContain('apply init (gitignore-update)');
            expect(readFileSync(join(fixture.controlHome, '.gitignore'), 'utf8')).toBe('node_modules/\n');
            expect(existsSync(fixture.laneDir)).toBeFalse();
            expect(fixture.inventory()).toBe(before);
        } finally {
            fixture.remove();
        }
    });

    it('adds the ignore line exactly once on an applied init', async function () {
        const fixture = makeInitEffectFixture({gitignoreCovered: false, updateGitignore: true});
        try {
            const result = await new InitEffect(createInitEffectPorts()).apply(fixture.request);

            expect(result.changed).toContain('.gitignore');
            expect(readFileSync(join(fixture.controlHome, '.gitignore'), 'utf8').split('\n')
                .filter((line) => line === '/.watchtower/').length).toBe(1);
        } finally {
            fixture.remove();
        }
    });
});

describe('init effect — post-commit failure matrix', function () {
    let fixture: InitEffectFixture;
    beforeEach(function () { fixture = makeInitEffectFixture(); });
    afterEach(function () { fixture.remove(); });

    it('keeps the committed lane in bootstrap when index activation fails', async function () {
        const ports = {...createInitEffectPorts(),
            activateIndex: () => Promise.resolve({ok: false as const, reason: 'PACK_INDEX_PUBLISH_FAILED' as const,
                target: 'coordinator/index/pack', detail: 'the injected publication failed'})};

        const error = await expectRefusal(new InitEffect(ports).apply(fixture.request));

        expect(error.code).toBe('ERR_INDEX_UNAVAILABLE');
        expectBootstrapLane(fixture);
    });

    it('keeps the committed lane in bootstrap when post-commit verification fails', async function () {
        const ports = {...createInitEffectPorts(), verifyCommit: () => { throw injected('verification'); }};

        await expectRefusal(new InitEffect(ports).apply(fixture.request));

        expectBootstrapLane(fixture);
        expect(existsSync(join(fixture.laneDir, 'coordinator', 'index', 'pack', 'current.json'))).toBeTrue();
    });

    it('keeps the committed lane in bootstrap when the lifecycle projection fails', async function () {
        const ports = {...createInitEffectPorts(), projectLifecycle: () => Promise.reject(injected('lifecycle'))};

        await expectRefusal(new InitEffect(ports).apply(fixture.request));

        expectBootstrapLane(fixture);
    });

    it('reports an unregistered membership as a warning on an otherwise active lane', async function () {
        const ports = {...createInitEffectPorts(),
            registerMemberships: () => Promise.resolve({registered: false, retryCount: 3, warning: 'index unavailable'})};

        const result = await new InitEffect(ports).apply(fixture.request);

        expect(result.applied).toBeTrue();
        expect(result.lane.lifecycle).toBe('active');
        expect(result.warnings.map((warning) => warning.code)).toContain('MEMBERSHIP_REGISTRATION_PENDING');
        expect(existsSync(join(fixture.dataHome, 'index', 'repository-memberships.json'))).toBeFalse();
    });
});

function expectBootstrapLane(fixture: InitEffectFixture): void {
    expect(existsSync(join(fixture.laneDir, 'lane.json'))).toBeTrue();
    expect(readFileSync(join(fixture.laneDir, 'state', 'coordinator-lane-state.txt'), 'utf8'))
        .toBe('lane_status=bootstrap\n');
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

interface FailingWriter extends TransactionalWriterFileSystem {
    calls: number;
}

/**
 * The real filesystem port with exactly one operation failing, so staging,
 * write, fsync, symlink, and rename boundaries are exercised against real
 * bytes rather than an in-memory double.
 */
function failingWriter(
    operation: keyof TransactionalWriterFileSystem, match?: (args: readonly unknown[]) => boolean
): FailingWriter {
    const writer: FailingWriter = {...nodeTransactionalWriterFileSystem, calls: 0};
    const original = nodeTransactionalWriterFileSystem[operation] as (...args: unknown[]) => Promise<unknown>;
    let injectedOnce = false;
    Object.assign(writer, {
        [operation]: async (...args: unknown[]): Promise<unknown> => {
            if (!injectedOnce && (match === undefined || match(args))) {
                injectedOnce = true;
                writer.calls += 1;
                throw injected(operation);
            }
            return original(...args);
        }
    });
    return writer;
}

function injected(boundary: string | number | symbol): Error {
    return Object.assign(new Error(`injected ${String(boundary)} failure`), {code: 'EIO'});
}

function digest(bytes: Buffer): string {
    return createHash('sha256').update(bytes).digest('hex');
}
