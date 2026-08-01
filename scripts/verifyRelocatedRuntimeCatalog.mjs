import {cp, mkdtemp, mkdir, readFile, rm} from 'node:fs/promises';
import {isAbsolute, join, relative, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const DIST_RUNTIME = resolve('dist', 'runtime-nvb');

async function copyFixture(runtimeRoot, fixtureRoot) {
    await mkdir(join(fixtureRoot, 'runtime-nvb'), {recursive: true});
    for (const name of ['catalog', 'profiles', 'schemas']) {
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

async function verify() {
    const temporaryRoot = await mkdtemp(resolve('.runtime-relocation-'));
    try {
        const runtimeRoot = join(temporaryRoot, 'runtime-nvb');
        const fixtureRoot = join(temporaryRoot, 'fixture');
        await cp(DIST_RUNTIME, runtimeRoot, {recursive: true});
        await copyFixture(runtimeRoot, fixtureRoot);
        const adapterUrl = pathToFileURL(join(runtimeRoot, 'foundation', 'taskCatalogComposition',
            'taskCatalogCompositionFileAdapter.js')).href;
        const catalog = JSON.parse(await readFile(join(fixtureRoot, 'runtime-nvb', 'task-catalog.json')));
        const handlerCount = await importDeclaredHandlers(runtimeRoot, catalog);
        const adapterModule = await import(adapterUrl);
        if (typeof adapterModule.runTaskCatalogCompositionTask !== 'function') {
            throw new Error('relocated runtime exports are incomplete');
        }
        const result = await adapterModule.runTaskCatalogCompositionTask(
            fixtureRoot, {mode: 'check'}, {tempToken: () => 'relocation-check'}
        );
        if (!result.ok) throw new Error(`relocated runtime check failed: ${result.failure.code}`);
        process.stdout.write(`${JSON.stringify({
            ok: true, handlerCount, schemaCount: Object.keys(catalog.schemas).length
        })}\n`);
    } finally {
        await rm(temporaryRoot, {recursive: true, force: true});
    }
}

await verify();
