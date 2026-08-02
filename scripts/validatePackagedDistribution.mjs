import {createHash} from 'node:crypto';
import {lstat, readFile, readdir} from 'node:fs/promises';
import {isAbsolute, join, relative, resolve} from 'node:path';

const DIST_ROOT = resolve('dist');
const RUNTIME_ROOT = join(DIST_ROOT, 'runtime-nvb');

function failure(reason, target) { throw new Error(`${reason}: ${relative(DIST_ROOT, target) || '.'}`); }
function contained(root, target) { const item = relative(root, target); return item === '' || (!item.startsWith('..') && !isAbsolute(item)); }
function object(value, target) { if (typeof value !== 'object' || value === null || Array.isArray(value)) failure('DIST_JSON_INVALID', target); return value; }

async function json(path) {
    try { return JSON.parse(await readFile(path, 'utf8')); } catch { failure('DIST_JSON_INVALID', path); }
}
async function regular(path, executable = false) {
    let status;
    try { status = await lstat(path); } catch { failure('DIST_ASSET_MISSING', path); }
    if (!status.isFile() || status.isSymbolicLink()) failure('DIST_ASSET_INVALID', path);
    if (executable && (status.mode & 0o111) === 0) failure('DIST_ASSET_MODE_INVALID', path);
}
async function knowledge(manifest) {
    if (!Array.isArray(manifest.assets)) failure('DIST_MANIFEST_INVALID', join(DIST_ROOT, 'knowledge', 'manifest.json'));
    for (const raw of manifest.assets) {
        const item = object(raw, join(DIST_ROOT, 'knowledge', 'manifest.json'));
        if (typeof item.path !== 'string' || typeof item.sha256 !== 'string' || typeof item.mode !== 'string') failure('DIST_MANIFEST_INVALID', join(DIST_ROOT, 'knowledge', 'manifest.json'));
        const target = resolve(DIST_ROOT, 'knowledge', item.path);
        if (!contained(join(DIST_ROOT, 'knowledge'), target)) failure('DIST_PATH_ESCAPE', target);
        await regular(target, item.mode === '0755');
        if (`sha256:${createHash('sha256').update(await readFile(target)).digest('hex')}` !== item.sha256) failure('DIST_MANIFEST_CHECKSUM_MISMATCH', target);
    }
}
async function catalog(value) {
    for (const raw of [...Object.values(object(value.handlers, join(RUNTIME_ROOT, 'task-catalog.json'))), ...Object.values(object(value.schemas, join(RUNTIME_ROOT, 'task-catalog.json')))]) {
        const item = object(raw, join(RUNTIME_ROOT, 'task-catalog.json'));
        const source = item.path ?? item.module;
        if (typeof source !== 'string') failure('DIST_CATALOG_INVALID', join(RUNTIME_ROOT, 'task-catalog.json'));
        const target = resolve(RUNTIME_ROOT, source);
        if (!contained(RUNTIME_ROOT, target)) failure('DIST_PATH_ESCAPE', target);
        await regular(target);
        if (typeof item.sha256 === 'string' && `sha256:${createHash('sha256').update(await readFile(target)).digest('hex')}` !== item.sha256) failure('DIST_CATALOG_CHECKSUM_MISMATCH', target);
    }
}
async function closure(packageJson) {
    const manifest = object(await json('distribution/nirvanaDependencyClosure.json'), 'distribution/nirvanaDependencyClosure.json');
    const watchtower = object(manifest.watchtower, 'distribution/nirvanaDependencyClosure.json');
    const dependencies = object(packageJson.dependencies, join(DIST_ROOT, 'package.json'));
    if (!Array.isArray(watchtower.dependencies)) failure('DIST_CLOSURE_INVALID', 'distribution/nirvanaDependencyClosure.json');
    for (const raw of watchtower.dependencies) {
        const item = object(raw, 'distribution/nirvanaDependencyClosure.json');
        if (typeof item.name !== 'string' || typeof item.version !== 'string' || dependencies[item.name] !== item.version) failure('DIST_CLOSURE_MISMATCH', join(DIST_ROOT, 'package.json'));
    }
}
async function links(root) {
    for (const entry of await readdir(root, {withFileTypes: true})) {
        const target = join(root, entry.name); const status = await lstat(target);
        if (status.isSymbolicLink()) failure('DIST_SOURCE_LINK', target);
        if (status.isDirectory()) await links(target);
    }
}
async function verify() {
    for (const path of ['bin/wt.js', 'src/cli.js', 'help/help.json', 'runtime/manifest.json', 'knowledge/manifest.json', 'runtime-nvb/nvb-manifest.json', 'runtime-nvb/runtime-nvb.json', 'runtime-nvb/runtime-nvb.js', 'runtime-nvb/task-catalog.json']) await regular(join(DIST_ROOT, path), path === 'bin/wt.js');
    await closure(object(await json(join(DIST_ROOT, 'package.json')), join(DIST_ROOT, 'package.json')));
    await knowledge(object(await json(join(DIST_ROOT, 'knowledge', 'manifest.json')), join(DIST_ROOT, 'knowledge', 'manifest.json')));
    await catalog(object(await json(join(RUNTIME_ROOT, 'task-catalog.json')), join(RUNTIME_ROOT, 'task-catalog.json')));
    await links(DIST_ROOT); process.stdout.write('{"ok":true,"distribution":"validated"}\n');
}
await verify();
