import {join} from 'node:path';
import type {
    ConfigResolutionSources, RepositoryBinding, RepositoryBindingView, ResolvedConfigV1
} from '../contracts/index.js';
import {buildLaneFilePath} from './canonicalPaths.js';
import {LaneConfigProjectionReader} from './LaneConfigProjectionReader.js';
import {LaneInstallIdentityReader} from './LaneInstallIdentityReader.js';
import {selectLane} from './LaneSelector.js';
import {RelevantLaneDiscovery} from './RelevantLaneDiscovery.js';
import {readRepositoryBindings} from './repositoryBindings.js';

export interface ResolvedConfigQuery {
    readonly cwd: string;
    readonly workspace?: string;
    readonly lane?: string;
    readonly initiative?: string;
    readonly verbose?: boolean;
    readonly environment?: NodeJS.ProcessEnv;
    readonly home?: string;
}

export interface ResolvedConfigServiceOptions {
    readonly discovery?: RelevantLaneDiscovery;
    readonly configReader?: LaneConfigProjectionReader;
    readonly installReader?: LaneInstallIdentityReader;
    readonly bindingReader?: typeof readRepositoryBindings;
}

export class ResolvedConfigService {
    private readonly discovery: RelevantLaneDiscovery;
    private readonly configReader: LaneConfigProjectionReader;
    private readonly installReader: LaneInstallIdentityReader;
    private readonly bindingReader: typeof readRepositoryBindings;

    constructor(options: ResolvedConfigServiceOptions = {}) {
        this.discovery = options.discovery ?? new RelevantLaneDiscovery();
        this.configReader = options.configReader ?? new LaneConfigProjectionReader();
        this.installReader = options.installReader ?? new LaneInstallIdentityReader();
        this.bindingReader = options.bindingReader ?? readRepositoryBindings;
    }

    show(query: ResolvedConfigQuery): ResolvedConfigV1 {
        const relevant = this.discovery.discover(query);
        const lane = selectLane(relevant.lanes, {cwd: query.cwd, lane: query.lane, initiative: query.initiative});
        const repositories = this.bindingReader(
            buildLaneFilePath(lane.laneDir, 'repositories.local.json'), lane.manifest.repositories
        );
        const config = this.configReader.read(lane.laneDir, lane.controlHome, lane.manifest);
        const install = this.installReader.read(lane.laneDir);
        const result: ResolvedConfigV1 = {
            laneId: lane.laneId, slug: lane.slug, initiativeId: lane.initiativeId, kind: lane.kind,
            controlHome: lane.controlHome,
            logicalRepositories: lane.manifest.repositories.map(repository => ({...repository})),
            repositories: repositories.map(repositoryView), laneDir: lane.laneDir,
            runtimeRoot: join(relevant.dataHome, 'runtimes', install.runtimeVersion),
            knowledgeRoot: join(relevant.dataHome, 'knowledge', install.knowledgeVersion),
            runtimeVersion: install.runtimeVersion, knowledgeVersion: install.knowledgeVersion,
            config: config.config, redactedKeys: config.redactedKeys,
            sources: resolutionSources(query, relevant.workspace.resolution),
            paths: {
                config: buildLaneFilePath(lane.laneDir, 'lane.config.env'),
                install: buildLaneFilePath(lane.laneDir, 'install.json'),
                repositories: buildLaneFilePath(lane.laneDir, 'repositories.local.json')
            },
            diagnostics: null
        };
        return query.verbose ? {...result, diagnostics: {
            workspaceResolution: relevant.workspace.resolution,
            relevantLaneCount: relevant.lanes.length,
            membershipWarningCount: relevant.warnings.length,
            logicalRepositoryCount: lane.manifest.repositories.length,
            localRepositoryCount: repositories.length,
            configKeyCount: Object.keys(config.config).length,
            redactedKeyCount: config.redactedKeys.length
        }} : result;
    }
}

function repositoryView(binding: RepositoryBinding): RepositoryBindingView {
    return {id: binding.id, role: binding.role, access: binding.access, path: binding.path,
        branch: binding.branch, worktreeMode: binding.worktreeMode};
}

function resolutionSources(query: ResolvedConfigQuery,
    workspace: ConfigResolutionSources['workspace']): ConfigResolutionSources {
    return {
        workspace,
        lane: query.lane === undefined ? 'selection-precedence' : 'explicit',
        dataHome: query.environment?.WATCHTOWER_DATA_HOME ? 'WATCHTOWER_DATA_HOME' :
            query.environment?.XDG_DATA_HOME ? 'XDG_DATA_HOME' : 'default'
    };
}
