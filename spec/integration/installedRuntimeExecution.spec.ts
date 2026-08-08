/**
 * Correction 04 finding 5: the adapter must be executed from a **fresh-prefix
 * installed** Watchtower package, not from `build/` or `src/`, and not with
 * `@nirvana/builder` resolved out of this worktree.
 *
 * The install is the accepted `RT-08` closure harness against the real packaged
 * `dist/` tree; the run happens in a child whose cwd carries a hostile
 * `node_modules/.bin/nvb`, whose `PATH` contains only poisoned stubs, and whose
 * only product bytes are the installed ones. The probe itself is
 * `support/installedRuntimeProbe.mjs`, which never imports from this checkout.
 *
 * The install is performed once and shared by both suites below; cleanup is
 * idempotent so either suite may be the last one to finish.
 */
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {
    installFreshPrefix,
    removeInstalledPrefix,
    runInstalledProbe,
    type InstalledPrefix
} from './support/installedPrefixFixture.js';

const DIST_RUNTIME = join(process.cwd(), 'dist', 'runtime-nvb');
const CATALOG_ID = 'watchtower-runtime-nvb/v1';
const PROBE = join(process.cwd(), 'spec', 'integration', 'support', 'installedRuntimeProbe.mjs');
const INSTALL_TIMEOUT = 600_000;

let installed: InstalledPrefix | null = null;
let failure = '';
let observed: Record<string, unknown> = {};
let prepared: Promise<void> | null = null;

/** The packaged distribution must exist; `nvb dist` produces it. */
function requireDist(): boolean {
    if (existsSync(join(DIST_RUNTIME, 'task-catalog.json'))) return true;
    it('requires nvb dist output at dist/runtime-nvb/', () => {
        pending('Run `nvb dist` before this proof; dist/runtime-nvb is absent during build-only test runs.');
    });
    return false;
}

/** Pack, install, and probe exactly once for every suite in this file. */
async function prepare(): Promise<void> {
    prepared ??= (async () => {
        const outcome = await installFreshPrefix(process.cwd());
        if (!outcome.ok || outcome.installed === undefined) {
            failure = outcome.reason ?? 'install failed';
            return;
        }
        installed = outcome.installed;
        const run = runInstalledProbe(installed, PROBE, [installed.packageRoot, process.cwd()]);
        if (run.status !== 0) {
            failure = `probe exited ${String(run.status)}: ${run.stderr.slice(0, 400)}`;
            return;
        }
        observed = JSON.parse(run.stdout) as Record<string, unknown>;
    })();
    return prepared;
}

function cleanup(): void {
    if (installed === null) return;
    removeInstalledPrefix(installed);
    installed = null;
}

describe('installed-package runtime resolution from a fresh prefix', () => {
    if (!requireDist()) return;

    beforeAll(prepare, INSTALL_TIMEOUT);
    afterAll(cleanup);

    it('installed the packaged distribution into a fresh prefix', () => {
        expect(failure).toBe('');
        expect(String(observed.adapterModule)).toContain(join('lib', 'node_modules', 'watchtower'));
    });

    it('resolves every product path under the installed roots and none under this checkout', () => {
        expect(observed.pathsUnderSourceCheckout as unknown).toEqual([]);
        expect(observed.productPathsUnderInstalledRoots as unknown).toBeTrue();
    });

    it('resolves the NVB runner from the installed closure, never the poisoned cwd or PATH', () => {
        expect(String(observed.nvbRunnerScript)).toContain(join('node_modules', '@nirvana', 'builder'));
        expect(String(observed.nvbRunnerScript).startsWith(process.cwd())).toBeFalse();
        expect(String(observed.nvbRunnerScript).endsWith(join('bin', 'nvb.js'))).toBeTrue();
    });

    it('relocates the installed runtime tree byte for byte, sealed and link free', () => {
        expect(observed.driftedFromInstalled as unknown).toEqual([]);
        expect(Number(observed.relocatedFileCount)).toBeGreaterThan(0);
        expect(observed.symlinkCount as unknown).toBe(0);
        expect(observed.nodeModulesEntries as unknown).toBe(0);
    });
});

describe('installed-package runtime execution against the package tree itself', () => {
    if (!requireDist()) return;

    beforeAll(prepare, INSTALL_TIMEOUT);
    afterAll(cleanup);

    it('resolves config, module, catalog, schemas, and handlers under the installed package root', () => {
        expect(observed.installedPathsUnderPackageRoot as unknown).toBeTrue();
        expect(String(observed.installedRuntimeRoot)).toContain(join('node_modules', 'watchtower', 'runtime-nvb'));
        expect(Number(observed.installedSchemaFiles)).toBeGreaterThan(0);
        expect(Number(observed.installedHandlerFiles)).toBeGreaterThan(0);
    });

    it('runs the installed tree sealed read-only and mutates nothing', () => {
        expect(observed.installedCatalogDigestAfter as unknown).toBe(observed.installedCatalogDigestBefore as never);
        const modes = Object.keys(observed.installedModeHistogram as Record<string, number>);
        expect(modes.every((mode) => mode === '555' || mode === '444')).toBeTrue();
    });

    it('verifies the installed catalog identity and reports its declared surface', () => {
        expect(observed.catalogId as unknown).toBe(CATALOG_ID);
        expect(observed.declaredActions as unknown).toEqual(['coordinator.poll-triggers', 'effect.dispatchBatch', 'git.publish-commits', 'git.record-acceptance', 'runtime.smoke']);
        expect(observed.declaredLeaves as unknown).toEqual(['git.push', 'runtime.echo', 'tmux.command']);
    });

    it('authorizes the declared action through the relocated copy before any dependency-closure concern applies', () => {
        // The relocated copy under process.cwd()/runtimes intentionally carries
        // no node_modules of its own (that is what proves path independence from
        // the poisoned cwd/PATH); a real spawn there therefore cannot resolve
        // @nirvana/builder and fails post-spawn. What this proof owns is that the
        // catalog/action lookup itself no longer refuses before spawn.
        expect(observed.actionReason as unknown).toBe('no-error');
        expect(observed.declaredRunOutcome as unknown).not.toBeNull();
    });

    it('runs the declared action against the installed package root to a structured result', () => {
        expect(observed.installedActionReason as unknown).toBe('no-error');
        expect(observed.installedRunOutcome as unknown).toBe('completed');
        expect(observed.installedRunResult as unknown).toEqual({schemaVersion: 1, ok: true, operation: 'runtime-smoke'});
    });

    it('resolves the one declared packaged leaf under the installed root', () => {
        expect(observed.installedLeafReason as unknown).toBe('no-error');
    });

    it('still refuses a genuinely undeclared action and leaf, relocated and in place', () => {
        expect(observed.undeclaredRunReason as unknown).toBe('TASK_RUNTIME_ACTION_UNKNOWN');
        expect(observed.installedUndeclaredRunReason as unknown).toBe('TASK_RUNTIME_ACTION_UNKNOWN');
        expect(observed.installedUnknownLeafReason as unknown).toBe('LEAF_UNKNOWN');
    });
});
