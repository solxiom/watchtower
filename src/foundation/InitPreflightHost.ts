import {accessSync, constants, existsSync, lstatSync, readFileSync, realpathSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {isAbsolute, join, resolve} from 'node:path';
import {cmd} from '@nirvana/base/terminal';
import type {RepositoryBinding, WorktreeMode} from '../contracts/types.js';
import type {StatusWarningCode} from '../contracts/statusModels.js';
import {RuntimeCatalog} from './RuntimeCatalog.js';
import {RuntimeCatalogError} from '../contracts/runtimeCatalog.js';
import {buildLanePath, canonicalizePath, safePathTarget} from './canonicalPaths.js';
import {discoverHomeLanes} from './homeLaneDiscovery.js';
import {StatusLaneInputReader} from './StatusLaneInputReader.js';
import {inspectWritableConflicts} from './writableConflicts.js';
import {resolveRepositoryRoot, resolveWorkspace} from './workspaceResolver.js';
import type {CoordinatorRoutingPolicy, InitConflict, InitWarning} from './InitContracts.js';
import type {InitPreflightPort, ScopeReadResult} from './InitPorts.js';
import {validateRoutingPolicy} from './InitRoutingValidator.js';
import {createWatchtowerError} from '../contracts/errors.js';

const MAX_JSON_BYTES = 256 * 1024;
const BINDING_KEYS = ['id', 'path', 'branch', 'worktreeMode', 'role', 'access'];
const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/u;

export class InitPreflightHost implements InitPreflightPort {
    resolveWorkspace(explicit: string | undefined, cwd: string): string {
        const workspace = resolveWorkspace(explicit, cwd);
        if (resolveRepositoryRoot(workspace) !== workspace) unavailable(workspace, 'Use the canonical root of a Git worktree.');
        return workspace;
    }

    resolvePack(path: string, controlHome: string): string {
        const target = isAbsolute(path) ? path : resolve(controlHome, path);
        return this.regularPath(target, 'directory', '--impl-pack');
    }

    readScope(path: string | undefined, controlHome: string): ScopeReadResult {
        if (path === undefined) return {bindings: [this.defaultBinding(controlHome)], warnings: []};
        const target = this.regularPath(isAbsolute(path) ? path : resolve(controlHome, path), 'file', '--scope');
        const value = parseJson(target, '--scope');
        if (!record(value) || value.schemaVersion !== 1 || !Array.isArray(value.repositories) || value.repositories.length === 0) invalid('--scope');
        const warnings = unknownWarnings(value, ['schemaVersion', 'repositories'], 'scope');
        const bindings = value.repositories.map((item, index) => this.binding(item, target, warnings, index));
        if (unique(bindings.map(item => item.id)) === false || unique(bindings.map(item => item.path)) === false) invalid('--scope');
        return {bindings: Object.freeze(bindings), warnings: Object.freeze(warnings)};
    }

    readRouting(path: string, controlHome: string): CoordinatorRoutingPolicy {
        const target = this.regularPath(isAbsolute(path) ? path : resolve(controlHome, path), 'file', '--coordinator-routing');
        return validateRoutingPolicy(parseJson(target, '--coordinator-routing'));
    }

    destinationExists(controlHome: string, slug: string): boolean { return existsSync(buildLanePath(controlHome, slug)); }
    gitIgnored(controlHome: string): boolean {
        try { cmd.execSync({command: 'git', args: ['check-ignore', '--quiet', '.watchtower/'], options: {cwd: controlHome, stdio: 'ignore'}}); return true; }
        catch { return false; }
    }
    runtimeRoot(version: string): string {
        try { return new RuntimeCatalog().getRuntimeRoot(version); }
        catch (error) {
            if (error instanceof RuntimeCatalogError) unavailable(version, 'Install a compatible immutable runtime version before init.');
            throw error;
        }
    }
    laneId(): string { return randomUUID(); }

    inspectConflicts(controlHome: string, bindings: readonly RepositoryBinding[], tmuxPrefix: string):
        {readonly complete: boolean; readonly conflicts: readonly InitConflict[]} {
        try {
            const lanes = discoverHomeLanes(controlHome);
            const inputs = new StatusLaneInputReader();
            let complete = true;
            const claims = lanes.map(lane => {
                const warnings: StatusWarningCode[] = [];
                const repositories = inputs.readBindings(lane, warnings);
                if (warnings.length > 0 || lane.lifecycle === 'unknown') complete = false;
                return {laneId: lane.laneId, lifecycle: lane.lifecycle === 'unknown' ? 'bootstrap' as const : lane.lifecycle,
                    repositories, claims: lane.manifest.claims ?? []};
            });
            const candidate = {laneId: '<candidate>', lifecycle: 'active' as const, repositories: bindings,
                claims: bindings.filter(item => item.access === 'write').map(item => ({repository: item.id,
                    paths: ['**'], mode: 'exclusive-write' as const}))};
            const conflicts: InitConflict[] = inspectWritableConflicts([...claims, candidate])
                .filter(item => item.lanes.includes('<candidate>'))
                .map(item => ({kind: item.kind, laneId: item.lanes.find(id => id !== '<candidate>') ?? '<unknown>', detail: item.repository}));
            for (const lane of lanes.filter(item => item.lifecycle === 'active')) {
                const warnings: StatusWarningCode[] = [];
                if (inputs.readTmuxPrefix(lane, warnings) === tmuxPrefix) conflicts.push({kind: 'tmux-prefix', laneId: lane.laneId, detail: tmuxPrefix});
                if (warnings.length > 0) complete = false;
            }
            return {complete, conflicts};
        } catch { return {complete: false, conflicts: []}; }
    }

    qualifyRouting(policy: CoordinatorRoutingPolicy) {
        const adapters = [...new Set(policy.endpoints.map(endpoint => endpoint.adapterId))];
        if (adapters.some(adapter => adapter !== 'opencode-cli' && adapter !== 'hermes-cli' && adapter !== 'codex-cli')) {
            unavailable('--coordinator-routing', 'Use an adapter declared by the installed shipping policy.');
        }
        return {policyVersion: 'shipping-v1' as const, adapters: Object.freeze(adapters), reserves: Object.freeze([
            'routine-cycles', 'reject-correction', 're-review', 'complex-escalation', 'operator-session'
        ])};
    }

    private defaultBinding(controlHome: string): RepositoryBinding {
        return {id: 'control-home', path: controlHome, branch: branch(controlHome), role: 'control-home', access: 'write', worktreeMode: 'dedicated'};
    }

    private binding(value: unknown, source: string, warnings: InitWarning[], index: number): RepositoryBinding {
        if (!record(value) || !text(value.id) || !SLUG.test(value.id) || !text(value.path) || !isAbsolute(value.path) ||
            !text(value.branch) || !text(value.role) || (value.access !== 'read' && value.access !== 'write') ||
            (value.worktreeMode !== 'dedicated' && value.worktreeMode !== 'shared')) invalid('--scope');
        warnings.push(...unknownWarnings(value, BINDING_KEYS, `repositories[${index}]`));
        const path = this.regularPath(value.path, 'directory', '--scope');
        if (path !== value.path || resolveRepositoryRoot(path) !== path || branch(path) !== value.branch) unavailable(source, 'Use canonical worktree paths on their currently checked-out branches.');
        try { accessSync(path, value.access === 'write' ? constants.W_OK : constants.R_OK); } catch { unavailable(path, 'Restore declared repository access.'); }
        if (value.access === 'write' && value.worktreeMode === 'shared') unavailable(path, 'Use a dedicated writable worktree.');
        return {id: value.id, path, branch: value.branch, role: value.role, access: value.access, worktreeMode: value.worktreeMode as WorktreeMode};
    }

    private regularPath(path: string, kind: 'file' | 'directory', flag: string): string {
        try {
            const stat = lstatSync(path);
            if (stat.isSymbolicLink() || (kind === 'file' ? !stat.isFile() : !stat.isDirectory())) throw new Error();
            return canonicalizePath(realpathSync(path));
        } catch { unavailable(safePathTarget(path), `Provide an accessible regular ${kind} for ${flag}.`); }
    }
}

function parseJson(path: string, flag: string): unknown {
    try { const text = readFileSync(path, 'utf8'); if (Buffer.byteLength(text) > MAX_JSON_BYTES) invalid(flag); return JSON.parse(text); }
    catch (error) { if (isWt(error)) throw error; invalid(flag); }
}
function branch(path: string): string { try { return String(cmd.execSync({command: 'git', args: ['symbolic-ref', '--quiet', '--short', 'HEAD'], options: {cwd: path, stdio: ['ignore', 'pipe', 'ignore']}})).trim(); } catch { unavailable(path, 'Check out a branch; detached HEAD is unsupported.'); } }
function unknownWarnings(value: Record<string, unknown>, keys: readonly string[], location: string): InitWarning[] { return Object.keys(value).filter(key => !keys.includes(key)).map(key => ({code: 'SCOPE_UNKNOWN_FIELD', message: `Ignored unknown ${location}.${key}.`})); }
function unique(values: readonly string[]): boolean { return new Set(values).size === values.length; }
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype; }
function text(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && value.length <= 1024 && !/[\u0000-\u001f\u007f]/u.test(value); }
function isWt(value: unknown): boolean { return typeof value === 'object' && value !== null && 'code' in value && typeof value.code === 'string' && value.code.startsWith('ERR_'); }
function invalid(target: string): never { throw createWatchtowerError('ERR_INVALID_ARGUMENT', {operation: 'parse init input', target, remediation: 'Provide closed version 1 JSON with required fields and no duplicate identities.'}); }
function unavailable(target: string, remediation: string): never { throw createWatchtowerError('ERR_PREFLIGHT_FAILED', {operation: 'inspect init preflight', target: safePathTarget(target), remediation}); }
