import {mkdir, mkdtemp, rm, symlink, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export interface ClosureSandbox {
    root: string;
    projectRoot: string;
    versionsRoot: string;
    versionRoot: string;
    remove(): Promise<void>;
}

export async function makeClosureSandbox(): Promise<ClosureSandbox> {
    const root = await mkdtemp(path.join(os.tmpdir(), 'watchtower-closure-spec-'));
    const projectRoot = path.join(root, 'project');
    const versionsRoot = path.join(root, 'versions');
    const versionRoot = path.join(versionsRoot, '1.0.0-alpha');
    await mkdir(projectRoot, {recursive: true});
    await mkdir(path.join(versionRoot, 'components', 'base'), {recursive: true});
    await write(projectRoot, 'nira.json', "{ecosystem: {version: '1.0.0-alpha'}}\n");
    await writeJson(projectRoot, 'package.json', {
        name: 'watchtower',
        version: '0.1.0',
        dependencies: {'@nirvana/base': '1.0.0'}
    });
    await writeJson(versionRoot, 'ecosystem-manifest.json', {
        schemaVersion: 1,
        version: '1.0.0-alpha',
        components: {
            base: {packageName: '@nirvana/base', packageVersion: '1.0.0', path: 'components/base'}
        }
    });
    await writeJson(path.join(versionRoot, 'components', 'base'), 'package.json', {
        name: '@nirvana/base',
        version: '1.0.0',
        dependencies: {}
    });
    await write(path.join(versionRoot, 'components', 'base'), 'index.js', 'export const base = true;\n');
    return {
        root,
        projectRoot,
        versionsRoot,
        versionRoot,
        remove: async () => await rm(root, {recursive: true, force: true})
    };
}

export async function addVendorDependency(sandbox: ClosureSandbox): Promise<void> {
    const componentRoot = path.join(sandbox.versionRoot, 'components', 'base');
    const vendorRoot = path.join(sandbox.versionRoot, 'vendor', 'renatus');
    await mkdir(vendorRoot, {recursive: true});
    await writeJson(componentRoot, 'package.json', {
        name: '@nirvana/base',
        version: '1.0.0',
        dependencies: {renatus: 'file:../../vendor/renatus'}
    });
    await writeJson(vendorRoot, 'package.json', {name: 'renatus', version: '1.1.0', dependencies: {}});
    await write(vendorRoot, 'index.js', 'export const vendor = true;\n');
}

export async function addEscapingComponentLink(sandbox: ClosureSandbox): Promise<void> {
    const outside = path.join(sandbox.root, 'outside');
    await mkdir(outside);
    await writeJson(outside, 'package.json', {name: '@nirvana/base', version: '1.0.0'});
    await rm(path.join(sandbox.versionRoot, 'components', 'base'), {recursive: true});
    await symlink(outside, path.join(sandbox.versionRoot, 'components', 'base'), 'dir');
}

export async function writeJson(root: string, name: string, value: unknown): Promise<void> {
    await write(root, name, `${JSON.stringify(value, null, 2)}\n`);
}

async function write(root: string, name: string, content: string): Promise<void> {
    await mkdir(root, {recursive: true});
    await writeFile(path.join(root, name), content, 'utf8');
}
