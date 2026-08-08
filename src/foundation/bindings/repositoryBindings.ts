import {accessSync, constants, lstatSync, readFileSync} from 'node:fs';
import {cmd} from '@nirvana/base/terminal';
import type {RepositoryBinding, RepositoryRef} from '../../contracts/types.js';
import {createWatchtowerError} from '../../contracts/errors.js';
import {canonicalizePath, safePathTarget} from '../paths/index.js';

const MAX_BINDING_BYTES = 256 * 1024;
const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/u;

/** Narrow read-only boundary for local repository and Git inspection. */
export interface RepositoryBindingInspector {
    readText(path: string): string;
    canonicalize(path: string): string;
    isDirectory(path: string): boolean;
    hasAccess(path: string, access: 'read' | 'write'): boolean;
    worktreeRoot(path: string): string | undefined;
    branch(path: string): string | undefined;
}

/**
 * Reads and validates only the closed schema/identity contract of a lane's
 * local bindings against the manifest's expected repository set: schema
 * version, allowed keys, duplicate JSON members, the byte bound, slug
 * grammar, canonical-path identity, and the exact `read`/`write` access
 * vocabulary. Performs no filesystem/Git observation. This is the sole
 * validated identity projection; callers that need real access/worktree/
 * branch observation call `validateObservedBinding` against the same
 * returned array rather than re-parsing, so identity and observed state can
 * never diverge from independently re-reading the file.
 */
export function readRepositoryBindingIdentity(
    bindingsPath: string, expected: readonly RepositoryRef[], inspector: RepositoryBindingInspector = nodeRepositoryBindingInspector
): readonly RepositoryBinding[] {
    const bindings = parseBindings(bindingsPath, inspector);
    validateExpectedBindings(bindings, expected, bindingsPath);
    return Object.freeze(bindings.map(binding => Object.freeze(binding)));
}

/** Reads, validates, and observes the local bindings for one lane. */
export function readRepositoryBindings(
    bindingsPath: string, expected: readonly RepositoryRef[], inspector: RepositoryBindingInspector = nodeRepositoryBindingInspector
): readonly RepositoryBinding[] {
    const bindings = readRepositoryBindingIdentity(bindingsPath, expected, inspector);
    for (const binding of bindings) validateObservedBinding(binding, inspector);
    return bindings;
}

function parseBindings(path: string, inspector: RepositoryBindingInspector): RepositoryBinding[] {
    let text: string;
    try { text = inspector.readText(path); } catch { throw invalidBindings(path); }
    if (text.length > MAX_BINDING_BYTES || hasDuplicateMember(text)) throw invalidBindings(path);
    let value: unknown;
    try { value = JSON.parse(text); } catch { throw invalidBindings(path); }
    if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.repositories) ||
        !onlyKeys(value, ['schemaVersion', 'repositories'])) throw invalidBindings(path);
    const bindings = value.repositories.map(item => normalizeBinding(item, path, inspector));
    if (bindings.length === 0 || new Set(bindings.map(binding => binding.id)).size !== bindings.length ||
        new Set(bindings.map(binding => binding.path)).size !== bindings.length) throw invalidBindings(path);
    return bindings;
}

function normalizeBinding(value: unknown, source: string, inspector: RepositoryBindingInspector): RepositoryBinding {
    const keys = ['id', 'path', 'branch', 'worktreeMode', 'role', 'access'] as const;
    if (!isRecord(value) || !onlyKeys(value, keys) || !hasKeys(value, keys) ||
        !isSlug(value.id) || !isText(value.path) || !isText(value.branch) || !isText(value.role) ||
        (value.worktreeMode !== 'dedicated' && value.worktreeMode !== 'shared') ||
        (value.access !== 'read' && value.access !== 'write')) throw invalidBindings(source);
    let path: string;
    try { path = inspector.canonicalize(value.path); } catch { throw invalidBindings(source); }
    if (path !== value.path) throw invalidBindings(source);
    return {id: value.id, path, branch: value.branch, role: value.role,
        worktreeMode: value.worktreeMode, access: value.access};
}

function validateExpectedBindings(bindings: readonly RepositoryBinding[], expected: readonly RepositoryRef[], path: string): void {
    if (bindings.length !== expected.length) throw invalidBindings(path);
    for (const repository of expected) {
        const binding = bindings.find(item => item.id === repository.id);
        if (binding === undefined || binding.role !== repository.role || binding.access !== repository.access) throw invalidBindings(path);
    }
}

/** Observes real filesystem/Git state for one already schema-validated binding. */
export function validateObservedBinding(binding: RepositoryBinding, inspector: RepositoryBindingInspector): void {
    if (!inspector.isDirectory(binding.path) || !inspector.hasAccess(binding.path, 'read') ||
        (binding.access === 'write' && !inspector.hasAccess(binding.path, 'write'))) throw preflight(binding.path, 'Restore the declared repository and its required local access.');
    if (inspector.worktreeRoot(binding.path) !== binding.path) {
        throw preflight(binding.path, 'Use the canonical root of the declared Git worktree.');
    }
    const branch = inspector.branch(binding.path);
    if (branch === undefined) throw preflight(binding.path, 'Check out the declared branch; detached HEAD is not supported.');
    if (branch !== binding.branch) throw preflight(binding.path, 'Check out the branch declared in repositories.local.json.');
}

function onlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
    return Object.keys(value).every(key => keys.includes(key));
}

function hasKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
    return keys.every(key => Object.hasOwn(value, key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function isSlug(value: unknown): value is string { return typeof value === 'string' && SLUG.test(value); }
function isText(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && !/[\u0000-\u001f\u007f]/u.test(value); }
function invalidBindings(path: string) {
    return createWatchtowerError('ERR_INVALID_LANE_CONFIG', {operation: 'read repository bindings', target: safePathTarget(path),
        remediation: 'Restore a complete schemaVersion 1 repositories.local.json file.'});
}

function preflight(path: string, remediation: string) {
    return createWatchtowerError('ERR_PREFLIGHT_FAILED', {operation: 'verify repository binding', target: safePathTarget(path), remediation});
}

function hasDuplicateMember(json: string): boolean {
    const levels: Set<string>[] = [];
    for (let index = 0; index < json.length; index += 1) {
        if (json[index] === '{') levels.push(new Set<string>());
        if (json[index] === '}') levels.pop();
        if (json[index] !== '"') continue;
        const end = stringEnd(json, index + 1);
        if (end === undefined) return false;
        let key: unknown;
        try { key = JSON.parse(json.slice(index, end + 1)); } catch { return false; }
        index = end;
        let next = index + 1;
        while (/\s/u.test(json[next] ?? '')) next += 1;
        if (json[next] !== ':' || typeof key !== 'string' || levels.length === 0) continue;
        if (levels.at(-1)?.has(key)) return true;
        levels.at(-1)?.add(key);
    }
    return false;
}

function stringEnd(json: string, start: number): number | undefined {
    for (let index = start; index < json.length; index += 1) {
        if (json[index] === '\\') index += 1;
        else if (json[index] === '"') return index;
    }
    return undefined;
}

/** Named adapter for local inspection; Git is invoked through Nirvana's command facade. */
export const nodeRepositoryBindingInspector: RepositoryBindingInspector = Object.freeze({
    readText(path: string): string { return readFileSync(path, 'utf8'); },
    canonicalize(path: string): string { return canonicalizePath(path); },
    isDirectory(path: string): boolean { try { return lstatSync(path).isDirectory(); } catch { return false; } },
    hasAccess(path: string, access: 'read' | 'write'): boolean {
        try { accessSync(path, access === 'read' ? constants.R_OK : constants.W_OK); return true; } catch { return false; }
    },
    worktreeRoot(path: string): string | undefined {
        try {
            const value = cmd.execSync({command: 'git', args: ['rev-parse', '--show-toplevel'],
                options: {cwd: path, stdio: ['ignore', 'pipe', 'ignore']}});
            return canonicalizePath(String(value).trim());
        } catch { return undefined; }
    },
    branch(path: string): string | undefined {
        try {
            const value = cmd.execSync({command: 'git', args: ['symbolic-ref', '--quiet', '--short', 'HEAD'],
                options: {cwd: path, stdio: ['ignore', 'pipe', 'ignore']}});
            return String(value).trim() || undefined;
        } catch { return undefined; }
    }
});
