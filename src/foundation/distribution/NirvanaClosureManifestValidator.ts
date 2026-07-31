import type {
    NirvanaClosureDependency,
    NirvanaClosurePackage,
    NirvanaDependencyClosureManifest
} from '../../contracts/nirvanaClosure.js';
import {NirvanaClosureError} from '../../contracts/nirvanaClosure.js';
import {compareText} from './nirvanaClosureData.js';

const digestPattern = /^sha256:[0-9a-f]{64}$/;
const exactVersionPattern = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/;
const packageNamePattern = /^(?:@nirvana\/[a-z0-9-]+|[a-z0-9][a-z0-9-]*)$/;
const allowedRootTokens = new Set(['~/.nirvana/ecosystem/versions', '<custom-versions-root>']);

export class NirvanaClosureManifestValidator {
    validate(value: unknown): NirvanaDependencyClosureManifest {
        const root = requireRecord(value, 'manifest');
        requireKeys(root, ['schemaVersion', 'manifestId', 'ecosystem', 'registry', 'watchtower', 'packages']);
        if (root.schemaVersion !== 1 || root.manifestId !== 'watchtower-nirvana-closure/v1') {
            malformed('manifest identity is unsupported');
        }
        const manifest: NirvanaDependencyClosureManifest = {
            schemaVersion: 1,
            manifestId: 'watchtower-nirvana-closure/v1',
            ecosystem: this.ecosystem(root.ecosystem),
            registry: this.registry(root.registry),
            watchtower: this.watchtower(root.watchtower),
            packages: this.packages(root.packages)
        };
        this.validateGraph(manifest);
        return deepFreeze(manifest);
    }

    private ecosystem(value: unknown): NirvanaDependencyClosureManifest['ecosystem'] {
        const item = requireRecord(value, 'ecosystem');
        requireKeys(item, ['version', 'versionsRoot', 'manifestSha256']);
        const version = exactVersion(item.version, 'ecosystem.version');
        const versionsRoot = requireString(item.versionsRoot, 'ecosystem.versionsRoot');
        if (!allowedRootTokens.has(versionsRoot)) {
            malformed('ecosystem.versionsRoot must use a portable provenance token');
        }
        return {version, versionsRoot, manifestSha256: digest(item.manifestSha256, 'ecosystem.manifestSha256')};
    }

    private registry(value: unknown): NirvanaDependencyClosureManifest['registry'] {
        const item = requireRecord(value, 'registry');
        requireKeys(item, ['external', 'nirvana']);
        const external = requireString(item.external, 'registry.external');
        if (!/^https:\/\/[^\s]+$/.test(external) || item.nirvana !== 'packed-artifacts') {
            malformed('registry channels are invalid');
        }
        return {external, nirvana: 'packed-artifacts'};
    }

    private watchtower(value: unknown): NirvanaDependencyClosureManifest['watchtower'] {
        const item = requireRecord(value, 'watchtower');
        requireKeys(item, ['name', 'version', 'dependencies']);
        if (item.name !== 'watchtower') {
            malformed('watchtower.name is invalid');
        }
        return {
            name: 'watchtower',
            version: exactVersion(item.version, 'watchtower.version'),
            dependencies: dependencyArray(item.dependencies, 'watchtower.dependencies')
        };
    }

    private packages(value: unknown): readonly NirvanaClosurePackage[] {
        if (!Array.isArray(value) || value.length === 0) {
            malformed('packages must be a non-empty array');
        }
        const packages = value.map((entry, index) => packageEntry(entry, index));
        const identities = new Set<string>();
        for (const item of packages) {
            if (identities.has(item.name)) {
                throw new NirvanaClosureError('DUPLICATE_PACKAGE', 'validate', item.name, 'Duplicate package identity.');
            }
            identities.add(item.name);
        }
        if (packages.some((item, index) => index > 0 && compareText(packages[index - 1].name, item.name) >= 0)) {
            malformed('packages must be strictly sorted by name');
        }
        return packages;
    }

    private validateGraph(manifest: NirvanaDependencyClosureManifest): void {
        const byName = new Map(manifest.packages.map(item => [item.name, item]));
        const pending = [...manifest.watchtower.dependencies];
        const visited = new Set<string>();
        while (pending.length > 0) {
            const edge = pending.shift() as NirvanaClosureDependency;
            const target = byName.get(edge.name);
            if (!target || target.version !== edge.version) {
                throw new NirvanaClosureError('INCOMPLETE_CLOSURE', 'validate', edge.name, 'Dependency target is absent or mismatched.');
            }
            if (!visited.has(edge.name)) {
                visited.add(edge.name);
                pending.push(...target.dependencies);
            }
        }
        if (visited.size !== manifest.packages.length) {
            throw new NirvanaClosureError('INCOMPLETE_CLOSURE', 'validate', 'packages', 'Manifest contains unreachable packages.');
        }
    }
}

function packageEntry(value: unknown, index: number): NirvanaClosurePackage {
    const item = requireRecord(value, `packages[${index}]`);
    requireKeys(item, ['kind', 'name', 'version', 'artifact', 'source', 'dependencies']);
    if (item.kind !== 'nirvana' && item.kind !== 'vendor') malformed(`packages[${index}].kind is invalid`);
    const name = packageName(item.name, `packages[${index}].name`);
    if ((item.kind === 'nirvana') !== name.startsWith('@nirvana/')) malformed(`packages[${index}] kind/name mismatch`);
    const artifact = requireRecord(item.artifact, `packages[${index}].artifact`);
    const source = requireRecord(item.source, `packages[${index}].source`);
    requireKeys(artifact, ['file', 'sha256']);
    requireKeys(source, ['path', 'sha256']);
    const file = safeRelative(artifact.file, `packages[${index}].artifact.file`);
    const sourcePath = safeRelative(source.path, `packages[${index}].source.path`);
    return {
        kind: item.kind,
        name,
        version: exactVersion(item.version, `packages[${index}].version`),
        artifact: {file, sha256: digest(artifact.sha256, `packages[${index}].artifact.sha256`)},
        source: {path: sourcePath, sha256: digest(source.sha256, `packages[${index}].source.sha256`)},
        dependencies: dependencyArray(item.dependencies, `packages[${index}].dependencies`)
    };
}

function dependencyArray(value: unknown, target: string): readonly NirvanaClosureDependency[] {
    if (!Array.isArray(value)) malformed(`${target} must be an array`);
    const dependencies = value.map((entry, index) => {
        const item = requireRecord(entry, `${target}[${index}]`);
        requireKeys(item, ['name', 'version']);
        return {name: packageName(item.name, `${target}[${index}].name`), version: exactVersion(item.version, `${target}[${index}].version`)};
    });
    if (dependencies.some((item, index) => index > 0 && compareText(dependencies[index - 1].name, item.name) >= 0)) {
        malformed(`${target} must be strictly sorted by name`);
    }
    return dependencies;
}

function requireRecord(value: unknown, target: string): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
        malformed(`${target} must be an object`);
    }
    return value as Record<string, unknown>;
}

function requireKeys(value: Record<string, unknown>, expected: string[]): void {
    const actual = Object.keys(value).sort();
    if (actual.length !== expected.length || expected.slice().sort().some((key, index) => key !== actual[index])) malformed('object keys are missing or extra');
}

function requireString(value: unknown, target: string): string {
    if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) malformed(`${target} must be a non-empty string`);
    return value as string;
}

function exactVersion(value: unknown, target: string): string {
    const version = requireString(value, target);
    if (!exactVersionPattern.test(version)) throw new NirvanaClosureError('UNSAFE_DEPENDENCY_SPEC', 'validate', target, 'Dependency version is not exact.');
    return version;
}

function packageName(value: unknown, target: string): string {
    const name = requireString(value, target);
    if (!packageNamePattern.test(name)) malformed(`${target} is invalid`);
    return name;
}

function digest(value: unknown, target: string): string {
    const result = requireString(value, target);
    if (!digestPattern.test(result)) malformed(`${target} is invalid`);
    return result;
}

function safeRelative(value: unknown, target: string): string {
    const result = requireString(value, target);
    if (result.startsWith('/') || result.split('/').some(part => part === '' || part === '.' || part === '..') || result.includes('\\')) malformed(`${target} is unsafe`);
    return result;
}

function malformed(message: string): never {
    throw new NirvanaClosureError('MALFORMED_MANIFEST', 'validate', 'nirvana-closure', message);
}

function deepFreeze<T>(value: T): T {
    if (typeof value === 'object' && value !== null) {
        Object.freeze(value);
        for (const child of Object.values(value)) deepFreeze(child);
    }
    return value;
}
