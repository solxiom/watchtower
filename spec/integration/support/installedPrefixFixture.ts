/**
 * A fresh-prefix installed Watchtower package, built with the accepted `RT-08`
 * dependency-closure harness (Correction 04 finding 5).
 *
 * The point of this fixture is that nothing it produces can resolve back into the
 * source worktree: the packaged `dist/` tree is packed with `npm pack`, installed
 * into a throwaway prefix together with the accepted Nirvana artifacts, and then
 * exercised by a child process whose cwd, `PATH`, and `node_modules` are
 * deliberately poisoned. Every path the child reports is checked against the
 * prefix and against this checkout.
 */
import {
    chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync
} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {homedir, tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {
    NirvanaClosureFileStore,
    NirvanaClosureFixture,
    NirvanaCommandProcessRunner
} from '../../../src/foundation/distribution/index.js';

/** Where the pinned ecosystem versions live; the closure resolver reads it. */
const VERSIONS_ROOT = join(homedir(), '.nirvana', 'ecosystem', 'versions');

export interface InstalledPrefix {
    /** npm `--global --prefix` root holding the installed package tree. */
    readonly prefix: string;
    /** The installed Watchtower package root. */
    readonly packageRoot: string;
    /** A poisoned working directory: hostile `node_modules/.bin/nvb`, no product bytes. */
    readonly poisonedCwd: string;
    /** Temporary root removed on cleanup. */
    readonly workRoot: string;
}

export interface InstallOutcome {
    readonly ok: boolean;
    readonly reason?: string;
    readonly installed?: InstalledPrefix;
}

/**
 * Pack `dist/` and install it into a fresh prefix. Returns a typed failure rather
 * than throwing so a suite can report an unavailable npm/offline environment as a
 * pending proof instead of a false negative.
 */
export async function installFreshPrefix(projectRoot: string): Promise<InstallOutcome> {
    const nodeCommand = process.execPath;
    const runner = new NirvanaCommandProcessRunner({
        PATH: `${dirname(nodeCommand)}:/usr/bin:/bin`,
        HOME: homedir()
    });
    const result = await new NirvanaClosureFixture(new NirvanaClosureFileStore(), runner).run({
        projectRoot,
        versionsRoot: VERSIONS_ROOT,
        watchtowerPackageRoot: join(projectRoot, 'dist'),
        npmCommand: join(dirname(nodeCommand), 'npm'),
        nodeCommand,
        keepInstallPrefix: true
    });
    if (!result.ok) return {ok: false, reason: `${result.reason}:${result.phase}:${result.target}`};
    const prefix = result.installPrefix ?? '';
    return {
        ok: true,
        installed: {
            prefix,
            packageRoot: join(prefix, 'lib', 'node_modules', 'watchtower'),
            poisonedCwd: makePoisonedCwd(),
            workRoot: dirname(prefix)
        }
    };
}

export function removeInstalledPrefix(installed: InstalledPrefix): void {
    // The probe seals both the relocated runtime root and the installed package
    // tree at 0555, so both have to be made writable again before removal.
    unseal(installed.poisonedCwd);
    unseal(installed.workRoot);
    rmSync(installed.workRoot, {recursive: true, force: true});
    rmSync(installed.poisonedCwd, {recursive: true, force: true});
}

function unseal(root: string): void {
    if (!existsSync(root)) return;
    chmodSync(root, 0o755);
    for (const name of readdirSync(root, {recursive: true, encoding: 'utf8'})) {
        const path = join(root, name);
        try {
            chmodSync(path, lstatSync(path).isDirectory() ? 0o755 : 0o644);
        } catch {
            // A vanished or foreign entry cannot block fixture cleanup.
        }
    }
}

/**
 * A working directory that would capture any ambient NVB resolution: the pinned
 * facade resolves `nvb` from `<cwd>/node_modules/.bin` and then `PATH`, so both
 * are stocked with a runner that fails loudly if it is ever chosen.
 */
function makePoisonedCwd(): string {
    const root = mkdtempSync(join(tmpdir(), 'wt-rt05-poison-'));
    const binRoot = join(root, 'node_modules', '.bin');
    mkdirSync(binRoot, {recursive: true});
    for (const name of ['nvb', 'node', 'npm']) {
        const path = join(binRoot, name);
        writeFileSync(path, '#!/bin/sh\necho "poisoned ambient tool was executed" >&2\nexit 97\n');
        chmodSync(path, 0o755);
    }
    return root;
}

/**
 * Run one probe script with the installed package as its only source of product
 * bytes. `PATH` contains only the poisoned bin directory, the cwd carries a
 * hostile `node_modules`, and `NODE_PATH` is cleared, so any resolution that
 * reaches this checkout would show up in the reported paths.
 */
export function runInstalledProbe(
    installed: InstalledPrefix,
    probePath: string,
    args: readonly string[] = []
): {readonly status: number | null; readonly stdout: string; readonly stderr: string} {
    const scriptPath = join(installed.poisonedCwd, 'probe.mjs');
    copyFileSync(probePath, scriptPath);
    const observed = spawnSync(process.execPath, [scriptPath, ...args], {
        cwd: installed.poisonedCwd,
        encoding: 'utf8',
        timeout: 120_000,
        env: {
            PATH: join(installed.poisonedCwd, 'node_modules', '.bin'),
            HOME: installed.poisonedCwd
        }
    });
    return {status: observed.status, stdout: observed.stdout ?? '', stderr: observed.stderr ?? ''};
}
