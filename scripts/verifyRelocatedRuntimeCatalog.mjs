import {createHash} from 'node:crypto';
import {cp, lstat, mkdtemp, mkdir, readFile, rm} from 'node:fs/promises';
import {isAbsolute, join, relative, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const DIST_RUNTIME = resolve('dist', 'runtime-nvb');

async function copyFixture(runtimeRoot, fixtureRoot) {
    await mkdir(join(fixtureRoot, 'runtime-nvb'), {recursive: true});
    for (const name of ['catalog', 'leaves', 'profiles', 'schemas']) {
        await cp(join(runtimeRoot, name), join(fixtureRoot, 'runtime-nvb', name), {recursive: true});
    }
    for (const name of ['runtime-nvb.json', 'task-catalog.json']) {
        await cp(join(runtimeRoot, name), join(fixtureRoot, 'runtime-nvb', name));
    }
}

function contained(root, target) {
    const relation = relative(root, target);
    return relation === '' || (!relation.startsWith('..') && !isAbsolute(relation));
}

async function importDeclaredHandlers(runtimeRoot, catalog) {
    if (typeof catalog !== 'object' || catalog === null || Array.isArray(catalog) ||
        typeof catalog.handlers !== 'object' || catalog.handlers === null || Array.isArray(catalog.handlers)) {
        throw new Error('relocated task catalog handler registry is invalid');
    }
    const entries = Object.values(catalog.handlers);
    for (const entry of entries) {
        if (typeof entry !== 'object' || entry === null || Array.isArray(entry) ||
            typeof entry.module !== 'string') throw new Error('relocated handler entry is invalid');
        const target = resolve(runtimeRoot, entry.module);
        if (!contained(runtimeRoot, target)) throw new Error('relocated handler path escapes runtime');
        const handlerModule = await import(pathToFileURL(target).href);
        if (typeof handlerModule.default !== 'function') throw new Error('relocated handler export is invalid');
    }
    return entries.length;
}

async function verifyDeclaredLeaves(runtimeRoot, catalog) {
    if (typeof catalog.leaves !== 'object' || catalog.leaves === null || Array.isArray(catalog.leaves)) {
        throw new Error('relocated task catalog leaf registry is invalid');
    }
    for (const entry of Object.values(catalog.leaves)) {
        if (typeof entry !== 'object' || entry === null || Array.isArray(entry) ||
            typeof entry.path !== 'string' || typeof entry.sha256 !== 'string') {
            throw new Error('relocated leaf entry is invalid');
        }
        const target = resolve(runtimeRoot, entry.path);
        if (!contained(runtimeRoot, target)) throw new Error('relocated leaf path escapes runtime');
        const status = await lstat(target);
        const digest = `sha256:${createHash('sha256').update(await readFile(target)).digest('hex')}`;
        if (!status.isFile() || status.isSymbolicLink() || (status.mode & 0o777) !== 0o555 ||
            entry.executable !== true || entry.mode !== '0555' || digest !== entry.sha256) {
            throw new Error('relocated leaf bytes or mode do not match the catalog');
        }
    }
    return Object.keys(catalog.leaves).length;
}

async function verifyGitMaterializedSource(adapterModule, fixtureRoot) {
    await copyFixture(resolve('runtime-nvb'), fixtureRoot);
    const leaf = join(fixtureRoot, 'runtime-nvb', 'leaves', 'runtimeEcho.sh');
    const mode = (await lstat(leaf)).mode & 0o777;
    if (![0o755, 0o775].includes(mode)) throw new Error('source leaf is not Git-materialized executable input');
    for (const mode of ['check', 'write']) {
        const result = await adapterModule.runTaskCatalogCompositionTask(
            fixtureRoot, {mode}, {tempToken: () => `git-materialized-${mode}`}
        );
        if (!result.ok) throw new Error(`Git-materialized catalog ${mode} failed: ${result.failure.code}`);
    }
    return mode;
}

async function verifyManifestLeaf() {
    const manifest = JSON.parse(await readFile('runtime/manifest.json', 'utf8'));
    const leaf = manifest.assets?.find((asset) => asset.path === 'leaves/runtimeEcho.sh');
    const digest = `sha256:${createHash('sha256').update(
        await readFile('runtime-nvb/leaves/runtimeEcho.sh')).digest('hex')}`;
    if (leaf?.mode !== '0755' || leaf.sha256 !== digest) throw new Error('runtime manifest leaf record is invalid');
}

async function verify() {
    const temporaryRoot = await mkdtemp(resolve('.runtime-relocation-'));
    try {
        const runtimeRoot = join(temporaryRoot, 'runtime-nvb');
        const fixtureRoot = join(temporaryRoot, 'fixture');
        const sourceFixtureRoot = join(temporaryRoot, 'git-materialized-fixture');
        await cp(DIST_RUNTIME, runtimeRoot, {recursive: true});
        await copyFixture(runtimeRoot, fixtureRoot);
        const adapterUrl = pathToFileURL(join(runtimeRoot, 'foundation', 'taskCatalogComposition',
            'taskCatalogCompositionFileAdapter.js')).href;
        const adapterModule = await import(adapterUrl);
        const sourceLeafMode = await verifyGitMaterializedSource(adapterModule, sourceFixtureRoot);
        await verifyManifestLeaf();
        const catalog = JSON.parse(await readFile(join(fixtureRoot, 'runtime-nvb', 'task-catalog.json')));
        const handlerCount = await importDeclaredHandlers(runtimeRoot, catalog);
        const leafCount = await verifyDeclaredLeaves(runtimeRoot, catalog);
        if (typeof adapterModule.runTaskCatalogCompositionTask !== 'function') {
            throw new Error('relocated runtime exports are incomplete');
        }
        const result = await adapterModule.runTaskCatalogCompositionTask(
            fixtureRoot, {mode: 'check'}, {tempToken: () => 'relocation-check'}
        );
        if (!result.ok) throw new Error(`relocated runtime check failed: ${result.failure.code}`);
        process.stdout.write(`${JSON.stringify({
            ok: true, handlerCount, leafCount, sourceLeafMode, schemaCount: Object.keys(catalog.schemas).length
        })}\n`);
    } finally {
        await rm(temporaryRoot, {recursive: true, force: true});
    }
}

await verify();
