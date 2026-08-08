import {cmd} from '@nirvana/base/terminal';
import {RelevantLaneDiscovery, selectLane} from '../discovery/index.js';
import type {LaneDiscoveryFileSystem} from '../discovery/index.js';
import {nodeLaneDiscoveryFileSystem} from '../discovery/index.js';
import {nodeRepositoryBindingInspector, readRepositoryBindingIdentity, validateObservedBinding} from '../bindings/index.js';
import type {RepositoryBindingInspector} from '../bindings/index.js';
import {buildLaneFilePath} from '../paths/index.js';
import {WatchtowerError} from '../../contracts/index.js';
import type {DoctorCheck, DoctorReport, RepositoryBinding} from '../../contracts/index.js';
import type {DoctorBindingsResolution, DoctorCheckProvider, DoctorLaneContext} from './DoctorCheckProvider.js';
import {composeDoctorCheckProviders, laneLocalCheckProviders} from './laneLocalCheckProviders.js';

export interface DoctorQuery {
    readonly cwd: string;
    readonly workspace?: string;
    readonly lane?: string;
    readonly environment?: NodeJS.ProcessEnv;
    readonly home?: string;
}

export interface DoctorKernelOptions {
    readonly discovery?: RelevantLaneDiscovery;
    readonly fileSystem?: LaneDiscoveryFileSystem;
    readonly bindingInspector?: RepositoryBindingInspector;
    readonly gitIgnored?: (controlHome: string) => boolean;
}

/** Composes the immutable lane-local check providers into one `doctorReport`. */
export class DoctorKernel {
    private readonly providers: readonly DoctorCheckProvider[];
    private readonly discovery: RelevantLaneDiscovery;
    private readonly fileSystem: LaneDiscoveryFileSystem;
    private readonly bindingInspector: RepositoryBindingInspector;
    private readonly gitIgnored: (controlHome: string) => boolean;

    constructor(
        providers: readonly DoctorCheckProvider[] = laneLocalCheckProviders,
        options: DoctorKernelOptions = {}
    ) {
        this.providers = composeDoctorCheckProviders(providers);
        this.fileSystem = options.fileSystem ?? nodeLaneDiscoveryFileSystem;
        this.discovery = options.discovery ?? new RelevantLaneDiscovery({fileSystem: this.fileSystem});
        this.bindingInspector = options.bindingInspector ?? nodeRepositoryBindingInspector;
        this.gitIgnored = options.gitIgnored ?? nodeGitIgnored;
    }

    run(query: DoctorQuery): DoctorReport {
        const relevant = this.discovery.discover(query);
        const lane = selectLane(relevant.lanes, query);
        const context: DoctorLaneContext = {
            lane,
            markerPath: buildLaneFilePath(lane.laneDir, 'lane.json'),
            configPath: buildLaneFilePath(lane.laneDir, 'lane.config.env'),
            statePath: buildLaneFilePath(lane.laneDir, 'state/coordinator-lane-state.txt'),
            bindingsPath: buildLaneFilePath(lane.laneDir, 'repositories.local.json'),
            bindings: resolveBindings(lane, this.bindingInspector),
            fileSystem: this.fileSystem,
            bindingInspector: this.bindingInspector,
            gitIgnored: this.gitIgnored
        };
        const checks = this.providers.map(provider => provider.run(context));
        return {
            schemaVersion: 1,
            lane: {id: lane.laneId, slug: lane.slug},
            checks,
            summary: summarize(checks)
        };
    }
}

/**
 * Resolves the closed identity projection and its observed access/worktree/
 * branch state from exactly one file read (`readRepositoryBindingIdentity`
 * parses once; `validateObservedBinding` observes the same returned array),
 * so `identity` and `observed` can never diverge from independently
 * re-reading `repositories.local.json` under changed/stale/replayed input.
 */
function resolveBindings(lane: DoctorLaneContext['lane'], inspector: RepositoryBindingInspector): DoctorBindingsResolution {
    const bindingsPath = buildLaneFilePath(lane.laneDir, 'repositories.local.json');
    let identity: readonly RepositoryBinding[];
    try {
        identity = readRepositoryBindingIdentity(bindingsPath, lane.manifest.repositories, inspector);
    } catch (error) {
        if (!(error instanceof WatchtowerError)) throw error;
        return {identity: null, observed: {ok: false, error}};
    }
    try {
        for (const binding of identity) validateObservedBinding(binding, inspector);
        return {identity, observed: {ok: true, bindings: identity}};
    } catch (error) {
        if (!(error instanceof WatchtowerError)) throw error;
        return {identity, observed: {ok: false, error}};
    }
}

function summarize(checks: readonly DoctorCheck[]) {
    return {
        pass: checks.filter(check => check.status === 'pass').length,
        warn: checks.filter(check => check.status === 'warn').length,
        fail: checks.filter(check => check.status === 'fail').length,
        skip: checks.filter(check => check.status === 'skip').length
    };
}

function nodeGitIgnored(controlHome: string): boolean {
    try {
        cmd.execSync({command: 'git', args: ['check-ignore', '--quiet', '.watchtower/'], options: {cwd: controlHome, stdio: 'ignore'}});
        return true;
    } catch {
        return false;
    }
}
