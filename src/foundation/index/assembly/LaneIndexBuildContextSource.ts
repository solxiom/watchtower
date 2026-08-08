import {join} from 'node:path';
import type {ConsumedPack} from '../../../contracts/pack.js';
import type {IndexBuildRequest} from '../../../contracts/indexBuild.js';
import type {LaneRuntimeContext} from '../../../contracts/taskRuntime.js';
import {createWatchtowerError} from '../../../contracts/index.js';
import {isJsonValue} from '../../schemaComposition/jsonCanonicalizer.js';
import {RelevantLaneDiscovery} from '../../discovery/RelevantLaneDiscovery.js';
import {selectLane, type LaneSelectionContext} from '../../discovery/LaneSelector.js';
import type {DiscoveredLane} from '../../discovery/laneDiscovery.js';
import {LaneInstallIdentityReader} from '../../read/LaneInstallIdentityReader.js';
import {readRepositoryBindings} from '../../bindings/index.js';
import {buildLaneFilePath, resolveWatchtowerDataHome} from '../../paths/index.js';
import {RuntimeCatalog} from '../../runtime/index.js';
import {DurableIndexBuildAuthorizationSource, type IndexBuildAuthorizationSource} from './IndexBuildAuthorizationSource.js';
export interface IndexBuildSelectionOptions {
    readonly runtime: boolean; readonly dryRun: boolean;
    readonly workspace?: string; readonly lane?: string; readonly initiative?: string;
}
export interface IndexBuildRequestSource {
    resolve(cwd: string, options: IndexBuildSelectionOptions): Promise<IndexBuildRequest>;
}

export interface AcceptedPackSource {resolve(lane: DiscoveredLane): Promise<ConsumedPack>;}

export interface LaneIndexBuildContextOptions {
    readonly acceptedPack: AcceptedPackSource;
    readonly environment?: NodeJS.ProcessEnv;
    readonly home?: string;
    readonly baseEnvironment: {readonly path: string; readonly home: string};
    readonly discovery?: RelevantLaneDiscovery;
    readonly runtime?: RuntimeCatalog;
    readonly runtimeIndexes?: (lane: DiscoveredLane) => readonly {readonly databasePath: string; readonly journalPath: string}[];
    readonly authorization?: IndexBuildAuthorizationSource;
}

/** Resolves all lane facts before the sole effect executor is invoked. */
export class LaneIndexBuildContextSource implements IndexBuildRequestSource {
    private readonly discovery: RelevantLaneDiscovery;
    private readonly runtime: RuntimeCatalog;

    constructor(private readonly options: LaneIndexBuildContextOptions) {
        this.discovery = options.discovery ?? new RelevantLaneDiscovery();
        this.runtime = options.runtime ?? new RuntimeCatalog({
            dataRoot: () => resolveWatchtowerDataHome(options.environment, options.home)
        });
    }

    async resolve(cwd: string, options: IndexBuildSelectionOptions): Promise<IndexBuildRequest> {
        const discovered = this.discovery.discover({cwd, workspace: options.workspace, environment: this.options.environment, home: this.options.home});
        const selection: LaneSelectionContext = {cwd, lane: options.lane, initiative: options.initiative};
        const lane = selectLane(discovered.lanes, selection);
        const install = new LaneInstallIdentityReader().read(lane.laneDir);
        const runtimeRoot = this.runtime.getRuntimeRoot(install.runtimeVersion);
        const knowledgeRoot = this.runtime.getKnowledgeRoot(install.knowledgeVersion);
        const repositoriesFile = buildLaneFilePath(lane.laneDir, 'repositories.local.json');
        const bindings = readRepositoryBindings(repositoriesFile, lane.manifest.repositories);
        const packRef = lane.manifest.implementationPack;
        const packBinding = packRef === undefined ? undefined : bindings.find((binding) => binding.id === packRef.repository);
        const packRoot = packRef === undefined || packBinding === undefined ? undefined : join(packBinding.path, packRef.path);
        const acceptedPack = options.runtime || packRef === undefined ? undefined : await this.options.acceptedPack.resolve(lane);
        const runtimeIndexes = options.runtime ? this.options.runtimeIndexes?.(lane) : undefined;
        if (options.runtime && runtimeIndexes === undefined) throw createWatchtowerError('ERR_MISSING_DEPENDENCY', {
            operation: 'resolve runtime index inputs', target: lane.laneId,
            remediation: 'Provide the lane runtime index registry before requesting a runtime rebuild.'
        });
        const taskInput = this.taskInput(options, lane, packRoot, packRef?.path, acceptedPack, runtimeIndexes);
        const context: LaneRuntimeContext = {
            workspace: lane.controlHome, laneId: lane.laneId, initiativeId: lane.initiativeId, laneSlug: lane.slug,
            laneDir: lane.laneDir, homeRepositoryId: lane.manifest.controlHomeRepository, repositoriesFile,
            runtimeRoot, runtimeVersion: install.runtimeVersion, knowledgeRoot,
            baseEnvironment: this.options.baseEnvironment
        };
        const authorization = options.dryRun ? undefined : (this.options.authorization ?? new DurableIndexBuildAuthorizationSource()).read(lane.laneDir);
        return {context, taskInput, authorization};
    }

    private taskInput(options: IndexBuildSelectionOptions, lane: DiscoveredLane, packRoot: string | undefined,
        packPath: string | undefined, acceptedPack: ConsumedPack | undefined,
        runtimeIndexes: readonly {readonly databasePath: string; readonly journalPath: string}[] | undefined) {
        const value: Record<string, unknown> = {schemaVersion: 1, runtime: options.runtime, dryRun: options.dryRun,
            laneDir: lane.laneDir, laneId: lane.laneId,
            indexRoot: buildLaneFilePath(lane.laneDir, options.runtime ? 'coordinator/index/runtime' : 'coordinator/index/pack')};
        if (packRoot !== undefined) value.packRoot = packRoot;
        if (packPath !== undefined) value.packPath = packPath;
        if (acceptedPack !== undefined) value.acceptedPack = JSON.parse(JSON.stringify(acceptedPack));
        if (runtimeIndexes !== undefined) value.runtimeIndexes = runtimeIndexes;
        if (!isJsonValue(value)) throw new TypeError('index-build task input was not JSON-serializable');
        return value;
    }
}
