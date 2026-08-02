import {mkdir, readFile, rm} from 'node:fs/promises';
import os from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {NirvanaClosureFileStore, NirvanaClosureFixture, NirvanaCommandProcessRunner} from '../dist/src/foundation/distribution/index.js';

async function verifySqlite(prefix) {
    const packageRoot = join(prefix, 'lib', 'node_modules', 'watchtower');
    const module = await import(pathToFileURL(join(packageRoot, 'src', 'foundation', 'storage', 'derivedStorage.js')).href);
    const root = join(prefix, 'sqlite-proof'); await mkdir(root, {recursive: true});
    const schema = [{name: 'proof', columns: [{name: 'id', type: 'integer'}, {name: 'value', type: 'text'}], primaryKey: ['id']}];
    const store = await module.openDerivedStorage(root).open('runtime', schema, {create: true});
    try {
        await store.insert('proof', {id: 1n, value: 'isolated'});
        if ((await store.count('proof')) !== 1 || !(await store.diagnostics()).foreignKeys) throw new Error('installed SQLite capability is unavailable');
    } finally { await store.close(); }
}
async function verify() {
    const expectedManifest = JSON.parse(await readFile('distribution/nirvanaDependencyClosure.json', 'utf8'));
    const runner = new NirvanaCommandProcessRunner({PATH: process.env.PATH ?? '', HOME: os.homedir()});
    const result = await new NirvanaClosureFixture(new NirvanaClosureFileStore(), runner).run({projectRoot: resolve('.'), watchtowerPackageRoot: resolve('dist'), expectedManifest, npmCommand: 'npm', nodeCommand: process.execPath, keepInstallPrefix: true});
    if (!result.ok || !result.installPrefix || result.installPrefix === '<verified-and-removed>') {
        throw new Error(`DIST_CLOSURE_FAILED: ${result.ok ? 'missing-install-prefix' : `${result.reason}:${result.message}`}`);
    }
    try { await verifySqlite(result.installPrefix); process.stdout.write('{"ok":true,"closure":"isolated","sqlite":"loaded"}\n'); }
    finally { await rm(dirname(result.installPrefix), {recursive: true, force: true}); }
}
await verify();
