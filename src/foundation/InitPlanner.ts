import {isAbsolute, relative, sep, join} from 'node:path';
import {createWatchtowerError} from '../contracts/errors.js';
import type {InitPlan, InitRequest} from './InitContracts.js';
import type {InitPreflightPort} from './InitPorts.js';
import {InitPreflightHost} from './InitPreflightHost.js';

const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/u;
const PREFIX = /^[a-z0-9][a-z0-9-]{0,15}$/u;
const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+(?:-.+)?$/u;

export class InitPlanner {
    constructor(private readonly preflight: InitPreflightPort = new InitPreflightHost()) {}

    buildInitPlan(input: InitRequest): InitPlan {
        const request = validateInitRequest(input);
        const controlHome = this.preflight.resolveWorkspace(request.workspacePath, request.cwd);
        const scope = this.preflight.readScope(request.scopePath, controlHome);
        const homeBindings = scope.bindings.filter(binding => binding.path === controlHome);
        if (homeBindings.length !== 1) preflight(controlHome, 'Declare the control home exactly once in --scope.');
        const packPath = this.preflight.resolvePack(request.implPackPath, controlHome);
        const packBindings = scope.bindings.filter(binding => contained(binding.path, packPath));
        if (packBindings.length !== 1) preflight(packPath, packBindings.length === 0
            ? 'Place the pack beneath exactly one declared repository.'
            : 'Remove overlapping repository bindings so the pack has one unambiguous owner.');
        const laneDir = join(controlHome, '.watchtower', 'lanes', request.slug);
        if (this.preflight.destinationExists(controlHome, request.slug)) preflight(laneDir, 'Choose a new lane slug.');
        const ignored = this.preflight.gitIgnored(controlHome);
        if (!ignored && !request.updateGitignore) preflight('.watchtower/', 'Add /.watchtower/ to .gitignore or pass --update-gitignore.');
        const routing = this.preflight.readRouting(request.coordinatorRoutingPath, controlHome);
        const routingProvenance = this.preflight.qualifyRouting(routing);
        const conflict = this.preflight.inspectConflicts(controlHome, scope.bindings, request.tmuxPrefix);
        if (!conflict.complete) preflight(controlHome, 'Restore complete active-lane conflict observations and retry.');
        if (conflict.conflicts.length > 0) preflight(conflict.conflicts[0].laneId, `Resolve the ${conflict.conflicts[0].kind} conflict before init.`);
        const runtimeRoot = request.runtimeVersion === undefined ? null : this.preflight.runtimeRoot(request.runtimeVersion);
        const binding = packBindings[0];
        const warnings = !ignored && request.updateGitignore ? [...scope.warnings, {code: 'GITIGNORE_UPDATE_PENDING' as const,
            message: '.watchtower/ Git-ignore mutation is authorized but deferred to LC-04.'}] : scope.warnings;
        return Object.freeze({schemaVersion: 1, applied: false, lane: {id: this.preflight.laneId(), slug: request.slug, kind: 'implementation' as const},
            controlHome, laneDir, repositories: scope.bindings, implementationPack: {repository: binding.id,
                path: repositoryPath(binding.path, packPath), absolutePath: packPath}, routing, routingProvenance,
            conflictCheck: {complete: true as const, conflicts: [] as const}, runtime: {version: request.runtimeVersion ?? null, root: runtimeRoot},
            directories: directories(laneDir), links: runtimeLinks(laneDir, runtimeRoot), config: {WT_LANE_SLUG: request.slug,
                WT_TMUX_PREFIX: request.tmuxPrefix}, indexEntries: scope.bindings.map(item => ({repository: item.id, worktreePath: item.path})),
            deferred: DEFERRED, warnings});
    }
}

export function validateInitRequest(value: InitRequest): InitRequest {
    if (!text(value.slug) || !SLUG.test(value.slug)) invalid('slug', 'Use the v1 lowercase 1–63 character lane slug.');
    if (!text(value.tmuxPrefix) || !PREFIX.test(value.tmuxPrefix)) invalid('--tmux-prefix', 'Use the v1 lowercase 1–16 character prefix.');
    for (const [flag, path] of [['--impl-pack', value.implPackPath], ['--coordinator-routing', value.coordinatorRoutingPath],
        ['--scope', value.scopePath], ['--workspace', value.workspacePath]] as const) {
        if (path !== undefined && !text(path)) invalid(flag, 'Supply a non-empty path without control characters.');
    }
    if (value.runtimeVersion !== undefined && !VERSION.test(value.runtimeVersion)) invalid('--runtime', 'Use semantic-version syntax.');
    if (typeof value.updateGitignore !== 'boolean' || typeof value.dryRun !== 'boolean' || !isAbsolute(value.cwd)) invalid('init', 'Use documented flags from an absolute invocation directory.');
    return Object.freeze({...value});
}

const DEFERRED = Object.freeze([
    {owner: 'LC-02' as const, artifact: 'pack identity, acceptance, seal, and drift', reason: 'LC-01 does not duplicate pack-consumer authority.'},
    {owner: 'LC-03' as const, artifact: 'lane.json, install.json, task-runtime pin, and managed assets', reason: 'Materialization contracts require accepted pack/runtime inputs.'},
    {owner: 'LC-05' as const, artifact: 'routing/session policy files and knowledge provenance', reason: 'LC-05 materializes verified baselines.'},
    {owner: 'LC-09' as const, artifact: 'seal-bound pack index', reason: 'LC-09 owns index compilation and activation.'}
]);
function directories(root: string): string[] { return ['coordinator', 'coordinator/operator-sessions', 'coordinator/amendment-requests', 'coordinator/holds', 'state', 'logs', 'reports', 'prompts', 'briefs', 'bin', 'budgets'].map(part => join(root, part)); }
function runtimeLinks(root: string, runtime: string | null) { return runtime === null ? [] : [{path: join(root, 'bin', 'runtime-nvb.json'), target: join(runtime, 'runtime-nvb', 'runtime-nvb.json')}, {path: join(root, 'bin', 'runtime-nvb.js'), target: join(runtime, 'runtime-nvb', 'runtime-nvb.js')}]; }
function contained(root: string, path: string): boolean { return path === root || path.startsWith(`${root}${sep}`); }
function repositoryPath(root: string, path: string): string { return relative(root, path).split(sep).join('/'); }
function text(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && value.length <= 1024 && !/[\u0000-\u001f\u007f]/u.test(value); }
function invalid(target: string, remediation: string): never { throw createWatchtowerError('ERR_INVALID_ARGUMENT', {operation: 'validate init arguments', target, remediation}); }
function preflight(target: string, remediation: string): never { throw createWatchtowerError('ERR_PREFLIGHT_FAILED', {operation: 'plan init', target: target.slice(0, 200), remediation}); }
