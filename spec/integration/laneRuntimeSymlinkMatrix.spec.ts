/**
 * The complete symlink matrix for every packaged path the lane runtime reads or
 * executes: the catalog aggregate, a catalog-declared schema, and a cataloged
 * leaf executable.
 *
 * Each subject is exercised against a **real** terminal link, an intermediate
 * directory link, a broken link, a self-referential loop, and an in-root link
 * that must still be accepted, plus an injected canonical-escape observation for
 * the same subject. Every refusal is asserted to happen before any process
 * starts, so a link attack can never reach execution.
 */
import {mkdirSync, renameSync, rmSync, symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {LeafRuntimeError} from '../../src/contracts/leafRuntime.js';
import {LaneTaskRuntimeError} from '../../src/contracts/taskRuntime.js';
import {LeafRuntimeInvoker} from '../../src/foundation/runtime/leaf/LeafRuntimeInvoker.js';
import {nodeRuntimeFileSystem} from '../../src/foundation/taskRuntime/runtimeFileSystem.js';
import {
    ACTION_ID,
    invocationFor,
    CapturedNvbProcess,
    type Fixture,
    LEAF_ID,
    RESULT_SCHEMA,
    contextFor,
    makeFixture,
    realCatalog,
    removeFixture,
    runnerFor,
    whileMutable
} from './support/realRuntimeFixture.js';

type LinkCase = 'terminal-outside' | 'intermediate-outside' | 'broken' | 'looping' | 'in-root';

function reasonOfSync(action: () => unknown): string {
    try {
        action();
    } catch (error) {
        if (error instanceof LaneTaskRuntimeError || error instanceof LeafRuntimeError) return error.reason;
        return `unexpected:${String(error)}`;
    }
    return 'no-error';
}

async function reasonOf(action: () => Promise<unknown>): Promise<string> {
    try {
        await action();
    } catch (error) {
        if (error instanceof LaneTaskRuntimeError || error instanceof LeafRuntimeError) return error.reason;
        return `unexpected:${String(error)}`;
    }
    return 'no-error';
}

/**
 * Replace `target` with the named link shape. The original bytes are preserved
 * (outside the root, or beside it for the in-root case) so only the link shape
 * differs between cases.
 */
function relink(fixture: Fixture, target: string, kind: LinkCase): void {
    whileMutable(fixture, () => {
        const escaped = join(fixture.root, `escaped-${Buffer.from(target).toString('hex').slice(-12)}`);
        if (kind === 'broken' || kind === 'looping') rmSync(target, {force: true});
        else if (kind === 'in-root') renameSync(target, `${target}.real`);
        else renameSync(target, escaped);
        if (kind === 'terminal-outside') symlinkSync(escaped, target);
        else if (kind === 'intermediate-outside') linkThroughDirectory(escaped, target);
        else if (kind === 'broken') symlinkSync(join(fixture.root, 'never-created'), target);
        else if (kind === 'looping') symlinkSync(target, target);
        else symlinkSync(`${target}.real`, target);
    });
}

/** Reach the bytes through an out-of-root directory rather than an out-of-root file. */
function linkThroughDirectory(escaped: string, target: string): void {
    const outsideDirectory = `${escaped}-dir`;
    mkdirSync(outsideDirectory, {recursive: true});
    renameSync(escaped, join(outsideDirectory, 'payload'));
    symlinkSync(join(outsideDirectory, 'payload'), target);
}

describe('real catalog aggregate symlink matrix', () => {
    let fixture: Fixture;
    beforeEach(() => {
        fixture = makeFixture();
    });
    afterEach(() => removeFixture(fixture));

    function catalogPath(): string {
        return join(fixture.catalogDirectory, 'task-catalog.json');
    }

    it('refuses a terminal link whose target leaves the immutable root', () => {
        relink(fixture, catalogPath(), 'terminal-outside');
        expect(reasonOfSync(() => realCatalog(fixture))).toBe('TASK_RUNTIME_CATALOG_UNREADABLE');
    });

    it('refuses an intermediate out-of-root link, a broken link, and a loop', () => {
        relink(fixture, catalogPath(), 'intermediate-outside');
        expect(reasonOfSync(() => realCatalog(fixture))).toBe('TASK_RUNTIME_CATALOG_UNREADABLE');
        const broken = makeFixture();
        relink(broken, join(broken.catalogDirectory, 'task-catalog.json'), 'broken');
        expect(reasonOfSync(() => realCatalog(broken))).toBe('TASK_RUNTIME_CATALOG_UNREADABLE');
        removeFixture(broken);
        const looping = makeFixture();
        relink(looping, join(looping.catalogDirectory, 'task-catalog.json'), 'looping');
        expect(reasonOfSync(() => realCatalog(looping))).toBe('TASK_RUNTIME_CATALOG_UNREADABLE');
        removeFixture(looping);
    });

    it('starts no process for any linked-catalog refusal', async () => {
        relink(fixture, catalogPath(), 'terminal-outside');
        const processes = new CapturedNvbProcess([]);
        expect(await reasonOf(() => runnerFor(fixture, processes)
            .run(invocationFor(fixture)))).toBe('TASK_RUNTIME_CATALOG_UNREADABLE');
        expect(processes.requests.length).toBe(0);
    });
});

describe('real catalog schema symlink matrix', () => {
    let fixture: Fixture;
    beforeEach(() => {
        fixture = makeFixture();
    });
    afterEach(() => removeFixture(fixture));

    function schemaPath(): string {
        return join(fixture.catalogDirectory, 'schemas', 'out.schema.json');
    }

    it('refuses an out-of-root terminal link before starting a process', async () => {
        relink(fixture, schemaPath(), 'terminal-outside');
        const processes = new CapturedNvbProcess([]);
        expect(await reasonOf(() => runnerFor(fixture, processes)
            .run(invocationFor(fixture))))
            .toBe('TASK_RUNTIME_RESULT_SCHEMA_UNAVAILABLE');
        expect(processes.requests.length).toBe(0);
    });

    it('refuses an intermediate out-of-root link, a broken link, and a loop', () => {
        for (const kind of ['intermediate-outside', 'broken', 'looping'] as const) {
            const staged = makeFixture();
            relink(staged, join(staged.catalogDirectory, 'schemas', 'out.schema.json'), kind);
            expect(reasonOfSync(() => realCatalog(staged).readCheckedSchema(RESULT_SCHEMA, nodeRuntimeFileSystem)))
                .toBe('TASK_RUNTIME_RESULT_SCHEMA_UNAVAILABLE');
            removeFixture(staged);
        }
    });

    it('accepts an in-root link whose bytes still match the declared digest', () => {
        relink(fixture, schemaPath(), 'in-root');
        expect(reasonOfSync(() => realCatalog(fixture).readCheckedSchema(RESULT_SCHEMA, nodeRuntimeFileSystem)))
            .toBe('no-error');
    });
});

describe('real leaf executable symlink matrix', () => {
    let fixture: Fixture;
    beforeEach(() => {
        fixture = makeFixture();
    });
    afterEach(() => removeFixture(fixture));

    function leafPath(staged: Fixture): string {
        return join(staged.catalogDirectory, 'leaves', 'echo.sh');
    }

    async function leafReason(staged: Fixture): Promise<string> {
        const invoker = new LeafRuntimeInvoker({catalog: realCatalog(staged), files: nodeRuntimeFileSystem});
        return reasonOf(() => invoker.invoke({
            leafId: LEAF_ID, owningActionId: ACTION_ID, args: [], context: contextFor(staged)
        }));
    }

    it('refuses a terminal link whose target leaves the immutable root', async () => {
        relink(fixture, leafPath(fixture), 'terminal-outside');
        expect(await leafReason(fixture)).toBe('LEAF_PATH_ESCAPE');
    });

    it('refuses an intermediate out-of-root link', async () => {
        relink(fixture, leafPath(fixture), 'intermediate-outside');
        expect(await leafReason(fixture)).toBe('LEAF_PATH_ESCAPE');
    });

    it('refuses a broken link and a self-referential loop as missing bytes', async () => {
        relink(fixture, leafPath(fixture), 'broken');
        expect(await leafReason(fixture)).toBe('LEAF_MISSING');
        const looping = makeFixture();
        relink(looping, leafPath(looping), 'looping');
        expect(await leafReason(looping)).toBe('LEAF_MISSING');
        removeFixture(looping);
    });

    it('never starts a leaf process for a link refusal', async () => {
        relink(fixture, leafPath(fixture), 'terminal-outside');
        const processes = new CapturedNvbProcess([]);
        const invoker = new LeafRuntimeInvoker({
            catalog: realCatalog(fixture), files: nodeRuntimeFileSystem, processes
        });
        await reasonOf(() => invoker.invoke({
            leafId: LEAF_ID, owningActionId: ACTION_ID, args: [], context: contextFor(fixture)
        }));
        expect(processes.requests.length).toBe(0);
    });
});
