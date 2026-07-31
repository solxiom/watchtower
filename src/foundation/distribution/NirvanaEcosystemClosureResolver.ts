import os from 'node:os';
import path from 'node:path';
import {NirvanaClosureError} from '../../contracts/nirvanaClosure.js';
import type {NirvanaClosureDependency} from '../../contracts/nirvanaClosure.js';
import {NirvanaClosureFileStore} from './NirvanaClosureFileStore.js';
import {compareText, exactVersion, isUnsafeSpec, packageData, record, stringValue, type PackageData} from './nirvanaClosureData.js';

export interface ResolvedClosurePackage {
    kind: 'nirvana' | 'vendor';
    sourcePath: string;
    sourceRelativePath: string;
    sourceSha256: string;
    packageData: PackageData;
    bundledDependencies: readonly NirvanaClosureDependency[];
    normalizedDependencies: Readonly<Record<string, string>>;
}

export interface ResolvedNirvanaClosure {
    ecosystemVersion: string;
    versionsRoot: string;
    versionsRootProvenance: string;
    versionRoot: string;
    ecosystemManifestSha256: string;
    watchtower: {name: 'watchtower'; version: string; dependencies: readonly NirvanaClosureDependency[]};
    packages: readonly ResolvedClosurePackage[];
}

interface EcosystemComponent {
    packageName: string;
    packageVersion: string;
    path: string;
}

export class NirvanaEcosystemClosureResolver {
    constructor(private readonly files: NirvanaClosureFileStore) {}

    async resolve(options: {projectRoot: string; versionsRoot?: string}): Promise<ResolvedNirvanaClosure> {
        const projectRoot = await this.files.canonicalDirectory(options.projectRoot);
        const nira = record(await this.files.readUnknown(path.join(projectRoot, 'nira.json')), 'nira.json');
        const ecosystem = record(nira.ecosystem, 'nira.json.ecosystem');
        const ecosystemVersion = exactVersion(ecosystem.version, 'nira.json.ecosystem.version');
        const defaultRoot = path.join(os.homedir(), '.nirvana', 'ecosystem', 'versions');
        const requestedRoot = options.versionsRoot ? path.resolve(options.versionsRoot) : defaultRoot;
        const versionsRoot = await this.files.canonicalDirectory(requestedRoot);
        const versionRoot = await this.files.canonicalDirectory(path.join(versionsRoot, ecosystemVersion), versionsRoot);
        const manifestPath = path.join(versionRoot, 'ecosystem-manifest.json');
        const ecosystemManifest = record(await this.files.readUnknown(manifestPath), 'ecosystem-manifest.json');
        if (ecosystemManifest.version !== ecosystemVersion) {
            throw new NirvanaClosureError('ECOSYSTEM_VERSION_MISMATCH', 'resolve', manifestPath, 'Installed ecosystem version does not match nira.json.');
        }
        const components = componentMap(ecosystemManifest.components);
        const watchtower = packageData(await this.files.readUnknown(path.join(projectRoot, 'package.json')), 'package.json');
        if (watchtower.name !== 'watchtower') {
            throw new NirvanaClosureError('PACKAGE_IDENTITY_MISMATCH', 'resolve', 'package.json', 'Expected the Watchtower package identity.');
        }
        const roots = nirvanaEdges(watchtower.dependencies, 'package.json');
        const packages = await this.resolvePackages({versionRoot, components, roots});
        return {
            ecosystemVersion,
            versionsRoot,
            versionsRootProvenance: path.resolve(defaultRoot) === versionsRoot
                ? '~/.nirvana/ecosystem/versions'
                : '<custom-versions-root>',
            versionRoot,
            ecosystemManifestSha256: this.files.sha256Value({
                schemaVersion: ecosystemManifest.schemaVersion,
                version: ecosystemManifest.version,
                components: ecosystemManifest.components
            }),
            watchtower: {name: 'watchtower', version: watchtower.version, dependencies: roots},
            packages
        };
    }

    private async resolvePackages(input: {
        versionRoot: string;
        components: ReadonlyMap<string, EcosystemComponent>;
        roots: readonly NirvanaClosureDependency[];
    }): Promise<readonly ResolvedClosurePackage[]> {
        const resolved = new Map<string, ResolvedClosurePackage>();
        const pending: Array<NirvanaClosureDependency & {kind: 'nirvana' | 'vendor'; sourceHint: string}> =
            input.roots.map(edge => ({...edge, kind: 'nirvana', sourceHint: ''}));
        while (pending.length > 0) {
            const edge = pending.shift() as NirvanaClosureDependency & {kind: 'nirvana' | 'vendor'; sourceHint: string};
            const previous = resolved.get(edge.name);
            if (previous) {
                if (previous.packageData.version !== edge.version) this.identityMismatch(edge.name);
                continue;
            }
            const sourcePath = edge.kind === 'nirvana'
                ? await this.componentPath(input.versionRoot, input.components, edge)
                : await this.files.canonicalDirectory(edge.sourceHint, input.versionRoot);
            const data = packageData(await this.files.readUnknown(path.join(sourcePath, 'package.json')), `${edge.name}/package.json`);
            if (data.name !== edge.name || data.version !== edge.version) this.identityMismatch(edge.name);
            const packageEdges = nirvanaEdges(data.dependencies, edge.name);
            const vendorEdges = await this.vendorEdges(data.dependencies, sourcePath, input.versionRoot);
            const bundledDependencies = [...packageEdges, ...vendorEdges.map(item => item.edge)]
                .sort((left, right) => compareText(left.name, right.name));
            resolved.set(edge.name, {
                kind: edge.kind,
                sourcePath,
                sourceRelativePath: path.relative(input.versionRoot, sourcePath).split(path.sep).join('/'),
                sourceSha256: await this.files.sha256Tree(sourcePath),
                packageData: data,
                bundledDependencies,
                normalizedDependencies: Object.freeze(Object.fromEntries(vendorEdges.map(item => [item.edge.name, item.edge.version])))
            });
            pending.push(...packageEdges.map(item => ({...item, kind: 'nirvana' as const, sourceHint: ''})));
            pending.push(...vendorEdges.map(item => ({...item.edge, kind: 'vendor' as const, sourceHint: item.sourcePath})));
        }
        return [...resolved.values()].sort((left, right) => compareText(left.packageData.name, right.packageData.name));
    }

    private async componentPath(
        versionRoot: string,
        components: ReadonlyMap<string, EcosystemComponent>,
        edge: NirvanaClosureDependency
    ): Promise<string> {
        const component = components.get(edge.name);
        if (!component) throw new NirvanaClosureError('MISSING_COMPONENT', 'resolve', edge.name, 'Ecosystem manifest omits a required component.');
        if (component.packageVersion !== edge.version) this.identityMismatch(edge.name);
        return await this.files.canonicalDirectory(path.join(versionRoot, component.path), versionRoot);
    }

    private async vendorEdges(
        dependencies: Readonly<Record<string, string>>,
        sourcePath: string,
        versionRoot: string
    ): Promise<Array<{edge: NirvanaClosureDependency; sourcePath: string}>> {
        const result: Array<{edge: NirvanaClosureDependency; sourcePath: string}> = [];
        for (const [name, spec] of Object.entries(dependencies)) {
            if (!spec.startsWith('file:')) continue;
            const source = await this.files.canonicalDirectory(path.resolve(sourcePath, spec.slice(5)), versionRoot);
            const data = packageData(await this.files.readUnknown(path.join(source, 'package.json')), `${name}/package.json`);
            if (data.name !== name) this.identityMismatch(name);
            result.push({edge: {name, version: data.version}, sourcePath: source});
        }
        return result.sort((left, right) => compareText(left.edge.name, right.edge.name));
    }

    private identityMismatch(target: string): never {
        throw new NirvanaClosureError('PACKAGE_IDENTITY_MISMATCH', 'resolve', target, 'Package name or version does not match its declared edge.');
    }
}

function componentMap(value: unknown): ReadonlyMap<string, EcosystemComponent> {
    const entries = record(value, 'ecosystem-manifest.json.components');
    const result = new Map<string, EcosystemComponent>();
    for (const [key, raw] of Object.entries(entries)) {
        const item = record(raw, `components.${key}`);
        const component = {
            packageName: stringValue(item.packageName, `components.${key}.packageName`),
            packageVersion: exactVersion(item.packageVersion, `components.${key}.packageVersion`),
            path: stringValue(item.path, `components.${key}.path`)
        };
        if (result.has(component.packageName)) throw new NirvanaClosureError('DUPLICATE_PACKAGE', 'resolve', component.packageName, 'Duplicate ecosystem component identity.');
        result.set(component.packageName, component);
    }
    return result;
}

function nirvanaEdges(dependencies: Readonly<Record<string, string>>, target: string): readonly NirvanaClosureDependency[] {
    const result: NirvanaClosureDependency[] = [];
    for (const [name, spec] of Object.entries(dependencies)) {
        if (isUnsafeSpec(spec) && !spec.startsWith('file:')) {
            throw new NirvanaClosureError('UNSAFE_DEPENDENCY_SPEC', 'resolve', `${target}:${name}`, 'Wildcard, workspace, link, URL, or Git dependency is forbidden.');
        }
        if (name.startsWith('@nirvana/')) result.push({name, version: exactVersion(spec, `${target}:${name}`)});
    }
    return result.sort((left, right) => compareText(left.name, right.name));
}
