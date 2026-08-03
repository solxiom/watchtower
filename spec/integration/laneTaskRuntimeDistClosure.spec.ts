/**
 * Source-independent proof against the **exact** packaged `dist/runtime-nvb/`
 * bytes.
 *
 * Nothing in this suite edits the distribution. The tree is copied verbatim into
 * a relocated immutable root, byte identity is proved against the accepted
 * artifact, the whole tree is sealed read-only, and the catalog is opened
 * against those bytes. The fresh-prefix installed-package execution proof lives
 * in `installedRuntimeExecution.spec.ts`; this suite owns only byte identity,
 * immutability, and catalog/profile identity against the unmodified dist tree.
 *
 * Runs only when `nvb dist` has produced the closure; otherwise the suite marks
 * itself pending so `nvb test` stays green while handoff records a separate dist run.
 */
import {
    accessSync, chmodSync, constants, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync,
    readFileSync, readdirSync, rmSync
} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join, relative} from 'node:path';
import {LaneTaskCatalog} from '../../src/foundation/taskRuntime/LaneTaskCatalog.js';
import {nodeRuntimeFileSystem} from '../../src/foundation/taskRuntime/runtimeFileSystem.js';
import type {TaskRuntimePinSource} from '../../src/foundation/taskRuntime/LaneTaskRunner.js';
import {semanticDigest} from '../../src/foundation/schemaComposition/jsonCanonicalizer.js';
import type {JsonObject} from '../../src/foundation/schemaComposition/schemaCompositionContracts.js';

const DIST_RUNTIME = join(process.cwd(), 'dist', 'runtime-nvb');
const TASK_ID = 'wt:runtime:smoke';
const PROFILE_ID = 'implementation-v1';
const CATALOG_ID = 'watchtower-runtime-nvb/v1';

interface DistFixture {
    readonly root: string;
    readonly runtimeRoot: string;
    readonly catalogDirectory: string;
    readonly catalogDocument: JsonObject;
    readonly controlHome: string;
    readonly laneDir: string;
}

function distAvailable(): boolean {
    return existsSync(join(DIST_RUNTIME, 'runtime-nvb.json'))
        && existsSync(join(DIST_RUNTIME, 'runtime-nvb.js'))
        && existsSync(join(DIST_RUNTIME, 'task-catalog.json'));
}

function entries(root: string): readonly string[] {
    return readdirSync(root, {recursive: true, encoding: 'utf8'}).map((name) => join(root, name));
}

function sealReadOnly(root: string): void {
    for (const path of [...entries(root)].reverse()) {
        chmodSync(path, lstatSync(path).isDirectory() ? 0o555 : 0o444);
    }
    chmodSync(root, 0o555);
}

function unseal(root: string): void {
    chmodSync(root, 0o755);
    for (const path of entries(root)) chmodSync(path, lstatSync(path).isDirectory() ? 0o755 : 0o644);
}

/** Copy the accepted distribution verbatim and seal it as an immutable root. */
function stageExactDist(): DistFixture {
    const root = mkdtempSync(join(tmpdir(), 'wt-rt05-dist-'));
    const runtimeRoot = join(root, 'runtimes', '1.0.0');
    const catalogDirectory = join(runtimeRoot, 'runtime-nvb');
    cpSync(DIST_RUNTIME, catalogDirectory, {recursive: true, verbatimSymlinks: true});
    const controlHome = join(root, 'control');
    const laneDir = join(controlHome, '.watchtower', 'lanes', 'demo');
    mkdirSync(laneDir, {recursive: true});
    const catalogDocument = JSON.parse(
        readFileSync(join(catalogDirectory, 'task-catalog.json'), 'utf8')
    ) as JsonObject;
    sealReadOnly(runtimeRoot);
    return {root, runtimeRoot, catalogDirectory, catalogDocument, controlHome, laneDir};
}

function removeDistFixture(fixture: DistFixture): void {
    unseal(fixture.runtimeRoot);
    rmSync(fixture.root, {recursive: true, force: true});
}

function pinFor(fixture: DistFixture): TaskRuntimePinSource {
    return {
        readTaskRuntime: () => ({
            catalogId: CATALOG_ID,
            catalogSha256: semanticDigest(fixture.catalogDocument),
            profile: PROFILE_ID,
            configTarget: join(fixture.catalogDirectory, 'runtime-nvb.json'),
            moduleTarget: join(fixture.catalogDirectory, 'runtime-nvb.js')
        })
    };
}

function catalogOf(fixture: DistFixture): LaneTaskCatalog {
    const pin = pinFor(fixture).readTaskRuntime(fixture.laneDir) as Parameters<typeof LaneTaskCatalog.open>[0];
    return LaneTaskCatalog.open(pin, fixture.runtimeRoot, nodeRuntimeFileSystem);
}

function digestOf(path: string): string {
    return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/** Both suites need the same guard: the accepted distribution must exist. */
function requireDist(): boolean {
    if (distAvailable()) return true;
    it('requires nvb dist output at dist/runtime-nvb/', () => {
        pending('Run `nvb dist` before this proof; dist/runtime-nvb is absent during build-only test runs.');
    });
    return false;
}

describe('packaged dist runtime closure', () => {
    if (!requireDist()) return;

    let fixture: DistFixture;
    beforeEach(() => {
        fixture = stageExactDist();
    });
    afterEach(() => removeDistFixture(fixture));

    it('relocates the accepted distribution byte for byte, with no link into any ambient tree', () => {
        const drifted = entries(fixture.catalogDirectory)
            .filter((path) => !lstatSync(path).isDirectory())
            .filter((path) => digestOf(path) !== digestOf(join(DIST_RUNTIME, relative(fixture.catalogDirectory, path))));
        expect(drifted).toEqual([]);
        expect(entries(fixture.runtimeRoot).filter((path) => lstatSync(path).isSymbolicLink())).toEqual([]);
        expect(entries(fixture.runtimeRoot).filter((path) => path.includes('node_modules'))).toEqual([]);
    });

    it('seals every relocated entry against the effective account', () => {
        const writable = [fixture.runtimeRoot, ...entries(fixture.runtimeRoot)].filter((path) => {
            try {
                accessSync(path, constants.W_OK);
                return true;
            } catch {
                return false;
            }
        });
        expect(writable).toEqual([]);
    });

    it('verifies identity, digest, and profile against the unmodified accepted catalog', () => {
        expect(fixture.catalogDocument.catalogId as unknown).toBe(CATALOG_ID);
        expect(() => catalogOf(fixture)).not.toThrow();
        expect((fixture.catalogDocument.profiles as Record<string, {taskIds: string[]}>)[PROFILE_ID].taskIds)
            .toContain(TASK_ID);
    });

});
