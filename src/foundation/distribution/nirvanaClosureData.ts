import {NirvanaClosureError} from '../../contracts/nirvanaClosure.js';

export interface PackageData {
    name: string;
    version: string;
    dependencies: Readonly<Record<string, string>>;
}

export function packageData(value: unknown, target: string): PackageData {
    const item = record(value, target);
    const name = stringValue(item.name, `${target}.name`);
    const version = exactVersion(item.version, `${target}.version`);
    const rawDependencies = item.dependencies === undefined ? {} : record(item.dependencies, `${target}.dependencies`);
    const dependencies: Record<string, string> = {};
    for (const [dependency, spec] of Object.entries(rawDependencies).sort(([left], [right]) => compareText(left, right))) {
        dependencies[dependency] = stringValue(spec, `${target}.dependencies.${dependency}`);
    }
    return {name, version, dependencies: Object.freeze(dependencies)};
}

export function record(value: unknown, target: string): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
        throw new NirvanaClosureError('MALFORMED_MANIFEST', 'resolve', target, 'Expected an object.');
    }
    return value as Record<string, unknown>;
}

export function stringValue(value: unknown, target: string): string {
    if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
        throw new NirvanaClosureError('MALFORMED_MANIFEST', 'resolve', target, 'Expected a non-empty string.');
    }
    return value;
}

export function exactVersion(value: unknown, target: string): string {
    const version = stringValue(value, target);
    if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
        throw new NirvanaClosureError('UNSAFE_DEPENDENCY_SPEC', 'resolve', target, 'Expected an exact package version.');
    }
    return version;
}

export function isUnsafeSpec(spec: string): boolean {
    return spec === '*' || spec === 'latest' || /^(?:workspace:|link:|https?:|git(?:\+|:))/.test(spec);
}

export function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}
