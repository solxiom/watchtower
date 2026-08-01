import type {JsonObject, JsonValue, SchemaCompositionFailure} from './schemaCompositionContracts.js';
import {isJsonObject} from './jsonCanonicalizer.js';

interface ReferenceLocation {
    readonly value: unknown;
    readonly pointer: string;
}

function collectReferences(value: JsonValue, pointer = '#'): ReferenceLocation[] {
    if (Array.isArray(value)) {
        return value.flatMap((item, index) => collectReferences(item, `${pointer}/${index}`));
    }
    if (!isJsonObject(value)) {
        return [];
    }
    const references: ReferenceLocation[] = [];
    for (const key of Object.keys(value).sort()) {
        const childPointer = `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`;
        if (key === '$ref') {
            references.push({value: value[key], pointer: childPointer});
        }
        references.push(...collectReferences(value[key], childPointer));
    }
    return references;
}

function decodeToken(token: string): string | null {
    if (token.includes('%') || /~(?![01])/u.test(token)) {
        return null;
    }
    const decoded = token.replaceAll('~1', '/').replaceAll('~0', '~');
    return decoded === '.' || decoded === '..' ? null : decoded;
}

function resolvesPointer(root: JsonObject, reference: string): boolean | null {
    if (reference === '#') {
        return true;
    }
    if (!reference.startsWith('#/')) {
        return null;
    }
    let current: JsonValue = root;
    for (const rawToken of reference.slice(2).split('/')) {
        const token = decodeToken(rawToken);
        if (token === null) {
            return null;
        }
        if (Array.isArray(current)) {
            if (!/^(0|[1-9][0-9]*)$/u.test(token) || Number(token) >= current.length) {
                return false;
            }
            current = current[Number(token)];
        } else if (isJsonObject(current) && Object.hasOwn(current, token)) {
            current = current[token];
        } else {
            return false;
        }
    }
    return true;
}

function failure(code: SchemaCompositionFailure['code'], pointer: string, subject: string):
    SchemaCompositionFailure {
    return {code, source: null, subject: `${pointer}:${subject}`, conflictingSource: null};
}

export function validateSchemaReferences(root: JsonObject): SchemaCompositionFailure | null {
    for (const reference of collectReferences(root)) {
        if (typeof reference.value !== 'string') {
            return failure('SCHEMA_REFERENCE_INVALID', reference.pointer, typeof reference.value);
        }
        const resolution = resolvesPointer(root, reference.value);
        if (resolution === null) {
            return failure('SCHEMA_REFERENCE_ESCAPES', reference.pointer, reference.value);
        }
        if (!resolution) {
            return failure('SCHEMA_REFERENCE_UNRESOLVED', reference.pointer, reference.value);
        }
    }
    return null;
}
