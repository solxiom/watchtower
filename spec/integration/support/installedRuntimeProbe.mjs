/**
 * Runs **inside** the fresh-prefix installed Watchtower package (Correction 04
 * finding 5). Nothing here may import from the source checkout: every product
 * module is imported by absolute path from the installed package root passed as
 * argv[2], and argv[3] is the source checkout that must never appear in any
 * resolved path.
 *
 * The installed `runtime-nvb` tree is relocated into the poisoned working
 * directory and sealed read-only, so the run happens against installed bytes in
 * an immutable root that is neither `dist/` nor the package itself.
 */
import {chmodSync, cpSync, lstatSync, mkdirSync, readdirSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';

const packageRoot = process.argv[2];
const sourceRoot = process.argv[3];
const installedTaskRuntime = join(packageRoot, 'src', 'foundation', 'taskRuntime');
/** `<prefix>/lib/node_modules`: the package and its dependency closure. */
const installedRoots = join(packageRoot, '..');

const {LaneTaskCatalog} = await import(join(installedTaskRuntime, 'LaneTaskCatalog.js'));
const {NirvanaLaneTaskRunner} = await import(join(installedTaskRuntime, 'NirvanaLaneTaskRunner.js'));
const {resolvePackagedNvbRunner} = await import(join(installedTaskRuntime, 'packagedNvbRunner.js'));
const {nodeRuntimeFileSystem} = await import(join(installedTaskRuntime, 'runtimeFileSystem.js'));
const {semanticDigest} = await import(join(packageRoot, 'src', 'foundation', 'schemaComposition', 'jsonCanonicalizer.js'));

const entries = (root) => readdirSync(root, {recursive: true, encoding: 'utf8'}).map((name) => join(root, name));
const digestOf = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

// Relocate the installed runtime-nvb tree and seal it, so the run happens against
// installed bytes in an immutable root that is neither dist/ nor the package.
const relocated = join(process.cwd(), 'runtimes', '1.0.0');
const catalogDirectory = join(relocated, 'runtime-nvb');
mkdirSync(relocated, {recursive: true});
cpSync(join(packageRoot, 'runtime-nvb'), catalogDirectory, {recursive: true, verbatimSymlinks: true});
const controlHome = join(process.cwd(), 'control');
const laneDir = join(controlHome, '.watchtower', 'lanes', 'demo');
mkdirSync(laneDir, {recursive: true});
for (const path of [...entries(relocated)].reverse()) {
    chmodSync(path, lstatSync(path).isDirectory() ? 0o555 : 0o444);
}
chmodSync(relocated, 0o555);

const catalogDocument = JSON.parse(readFileSync(join(catalogDirectory, 'task-catalog.json'), 'utf8'));
const pin = {
    catalogId: catalogDocument.catalogId,
    catalogSha256: semanticDigest(catalogDocument),
    profile: 'implementation-v1',
    configTarget: join(catalogDirectory, 'runtime-nvb.json'),
    moduleTarget: join(catalogDirectory, 'runtime-nvb.js')
};
const catalog = LaneTaskCatalog.open(pin, relocated, nodeRuntimeFileSystem);
const runnerBinding = resolvePackagedNvbRunner(nodeRuntimeFileSystem, process.execPath);

const runner = new NirvanaLaneTaskRunner({
    runtimeRoots: {resolveRuntimeRoot: () => relocated},
    pins: {readTaskRuntime: () => pin},
    identity: {read: () => ({cliVersion: '1.0.0', runtimeVersion: '1.0.0', knowledgeVersion: '1.0.0'})},
    files: nodeRuntimeFileSystem
});
async function runLaneAction(runtimeRoot, target, actionId) {
    const laneRunner = new NirvanaLaneTaskRunner({
        runtimeRoots: {resolveRuntimeRoot: () => runtimeRoot},
        pins: {readTaskRuntime: () => target},
        identity: {read: () => ({cliVersion: '1.0.0', runtimeVersion: '1.0.0', knowledgeVersion: '1.0.0'})},
        files: nodeRuntimeFileSystem
    });
    try {
        const result = await laneRunner.run({
            actionId,
            input: {schemaVersion: 1, operation: 'runtime-smoke'},
            context: {
                workspace: controlHome, laneId: '9d0ee3d2-8833-4fb7-b112-8438f04f57d2',
                initiativeId: 'watchtower-v1', laneSlug: 'demo', laneDir,
                homeRepositoryId: 'watchtower', repositoriesFile: join(laneDir, 'repositories.json'),
                runtimeRoot, runtimeVersion: '1.0.0', knowledgeRoot: join(packageRoot, 'knowledge'),
                baseEnvironment: {path: process.env.PATH ?? '', home: process.env.HOME ?? ''}
            }
        });
        return {
            reason: 'no-error', outcome: result.outcome, result: result.outcome === 'completed' ? result.result : null,
            eventCount: result.events.length,
            diagnostic: result.outcome === 'failed' ? result.diagnostic : null,
            failedTaskId: result.outcome === 'failed' ? result.failedTaskId : null
        };
    } catch (error) {
        return {
            reason: error?.reason ?? `unexpected:${String(error)}`, outcome: null, result: null, eventCount: 0,
            diagnostic: null, failedTaskId: null
        };
    }
}

const declaredRun = await runLaneAction(relocated, pin, 'runtime.smoke');
const undeclaredRun = await runLaneAction(relocated, pin, 'runtime.absent');
const actionReason = declaredRun.reason;

// Second phase: the *installed* runtime tree itself, sealed in place, so every
// resolved product path is under the installed package root rather than a copy.
const installedCatalogDirectory = join(packageRoot, 'runtime-nvb');
const catalogBefore = digestOf(join(installedCatalogDirectory, 'task-catalog.json'));
for (const path of [...entries(installedCatalogDirectory)].reverse()) {
    chmodSync(path, lstatSync(path).isDirectory() ? 0o555 : 0o444);
}
chmodSync(installedCatalogDirectory, 0o555);
chmodSync(packageRoot, 0o555);
const installedPin = {
    catalogId: catalogDocument.catalogId,
    catalogSha256: semanticDigest(JSON.parse(readFileSync(join(installedCatalogDirectory, 'task-catalog.json'), 'utf8'))),
    profile: 'implementation-v1',
    configTarget: join(installedCatalogDirectory, 'runtime-nvb.json'),
    moduleTarget: join(installedCatalogDirectory, 'runtime-nvb.js')
};
const installedCatalog = LaneTaskCatalog.open(installedPin, packageRoot, nodeRuntimeFileSystem);
const installedDeclaredRun = await runLaneAction(packageRoot, installedPin, 'runtime.smoke');
const installedUndeclaredRun = await runLaneAction(packageRoot, installedPin, 'runtime.absent');
const installedActionReason = installedDeclaredRun.reason;
let installedLeafReason = 'no-error';
try {
    installedCatalog.resolveLeaf('runtime.echo');
} catch (error) {
    installedLeafReason = error?.reason ?? `unexpected:${String(error)}`;
}
let installedUnknownLeafReason = 'no-error';
try {
    installedCatalog.resolveLeaf('runtime.absent');
} catch (error) {
    installedUnknownLeafReason = error?.reason ?? `unexpected:${String(error)}`;
}
const catalogAfter = digestOf(join(installedCatalogDirectory, 'task-catalog.json'));
const modes = {};
for (const path of entries(installedCatalogDirectory)) {
    const mode = (lstatSync(path).mode & 0o7777).toString(8);
    modes[mode] = (modes[mode] ?? 0) + 1;
}

const relocatedFiles = entries(catalogDirectory).filter((path) => !lstatSync(path).isDirectory());
process.stdout.write(JSON.stringify({
    nodeExecutable: process.execPath,
    adapterModule: join(installedTaskRuntime, 'NirvanaLaneTaskRunner.js'),
    nvbRunnerScript: runnerBinding.runnerScript,
    configTarget: pin.configTarget,
    moduleTarget: pin.moduleTarget,
    catalogTarget: join(catalogDirectory, 'task-catalog.json'),
    schemaDirectory: join(catalogDirectory, 'schemas'),
    handlerDirectory: join(catalogDirectory, 'handlers'),
    catalogId: catalogDocument.catalogId,
    declaredActions: Object.keys(catalogDocument.actions ?? {}),
    declaredLeaves: Object.keys(catalogDocument.leaves ?? {}),
    actionReason,
    declaredRunOutcome: declaredRun.outcome,
    declaredRunResult: declaredRun.result,
    declaredRunEventCount: declaredRun.eventCount,
    declaredRunDiagnostic: declaredRun.diagnostic,
    declaredRunFailedTaskId: declaredRun.failedTaskId,
    undeclaredRunReason: undeclaredRun.reason,
    productPathsUnderInstalledRoots: [
        join(installedTaskRuntime, 'NirvanaLaneTaskRunner.js'),
        runnerBinding.runnerScript,
        join(packageRoot, 'runtime-nvb', 'task-catalog.json')
    ].every((path) => path.startsWith(installedRoots)),
    pathsUnderSourceCheckout: [
        process.execPath, join(installedTaskRuntime, 'NirvanaLaneTaskRunner.js'), runnerBinding.runnerScript,
        pin.configTarget, pin.moduleTarget, join(catalogDirectory, 'schemas'), join(catalogDirectory, 'handlers')
    ].filter((path) => path.startsWith(sourceRoot)),
    installedRuntimeRoot: installedCatalogDirectory,
    installedConfigTarget: installedPin.configTarget,
    installedModuleTarget: installedPin.moduleTarget,
    installedCatalogTarget: join(installedCatalogDirectory, 'task-catalog.json'),
    installedSchemaFiles: entries(join(installedCatalogDirectory, 'schemas')).length,
    installedHandlerFiles: entries(join(installedCatalogDirectory, 'handlers')).length,
    installedActionReason,
    installedRunOutcome: installedDeclaredRun.outcome,
    installedRunResult: installedDeclaredRun.result,
    installedUndeclaredRunReason: installedUndeclaredRun.reason,
    installedLeafReason,
    installedUnknownLeafReason,
    installedCatalogDigestBefore: catalogBefore,
    installedCatalogDigestAfter: catalogAfter,
    installedModeHistogram: modes,
    installedPathsUnderPackageRoot: [
        installedPin.configTarget, installedPin.moduleTarget,
        join(installedCatalogDirectory, 'task-catalog.json'),
        join(installedCatalogDirectory, 'schemas'), join(installedCatalogDirectory, 'handlers')
    ].every((path) => path.startsWith(packageRoot)),
    relocatedFileCount: relocatedFiles.length,
    driftedFromInstalled: relocatedFiles.filter((path) =>
        digestOf(path) !== digestOf(join(packageRoot, 'runtime-nvb', path.slice(catalogDirectory.length + 1)))),
    symlinkCount: entries(relocated).filter((path) => lstatSync(path).isSymbolicLink()).length,
    nodeModulesEntries: entries(relocated).filter((path) => path.includes('node_modules')).length
}));
