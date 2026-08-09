/**
 * Resolves every lane fact one mutating coordinator command needs before the
 * sole effect authority is reached (CA-25).
 *
 * Lane discovery, selection, install identity, and the immutable runtime root
 * all come from their accepted owners; this source composes them and reads the
 * durable authorization capsule. It performs no write on any path, dry run or
 * not — the capsule read is the only lane I/O a preview ever causes.
 */
import type {
    CoordinatorMutationFailure, CoordinatorMutationOperation, CoordinatorMutationRequest
} from '../../../../contracts/coordinatorMutation.js';
import type {LaneRuntimeContext} from '../../../../contracts/taskRuntime.js';
import {RelevantLaneDiscovery} from '../../../discovery/RelevantLaneDiscovery.js';
import {selectLane, type LaneSelectionContext} from '../../../discovery/LaneSelector.js';
import {LaneInstallIdentityReader} from '../../../read/LaneInstallIdentityReader.js';
import {buildLaneFilePath, resolveWatchtowerDataHome} from '../../../paths/index.js';
import {RuntimeCatalog} from '../../../runtime/index.js';
import {
    DurableCoordinatorAuthorizationSource, type CoordinatorAuthorizationSource
} from './coordinatorAuthorizationCapsule.js';

export interface CoordinatorMutationSelection {
    readonly operation: CoordinatorMutationOperation;
    readonly subject: string;
    readonly reason?: string;
    readonly dryRun: boolean;
    readonly workspace?: string;
    readonly lane?: string;
    readonly initiative?: string;
}

export type CoordinatorMutationResolution =
    | {readonly ok: true; readonly request: CoordinatorMutationRequest}
    | CoordinatorMutationFailure;

export interface CoordinatorMutationContextOptions {
    readonly baseEnvironment: {readonly path: string; readonly home: string};
    readonly environment?: NodeJS.ProcessEnv;
    readonly home?: string;
    readonly discovery?: RelevantLaneDiscovery;
    readonly runtime?: RuntimeCatalog;
    readonly authorization?: CoordinatorAuthorizationSource;
}

export interface CoordinatorMutationRequestSource {
    resolve(cwd: string, selection: CoordinatorMutationSelection): CoordinatorMutationResolution;
}

export class LaneCoordinatorMutationContextSource implements CoordinatorMutationRequestSource {
    private readonly discovery: RelevantLaneDiscovery;
    private readonly runtime: RuntimeCatalog;
    private readonly authorization: CoordinatorAuthorizationSource;

    constructor(private readonly options: CoordinatorMutationContextOptions) {
        this.discovery = options.discovery ?? new RelevantLaneDiscovery();
        this.runtime = options.runtime ?? new RuntimeCatalog({
            dataRoot: () => resolveWatchtowerDataHome(options.environment, options.home)
        });
        this.authorization = options.authorization ?? new DurableCoordinatorAuthorizationSource();
    }

    resolve(cwd: string, selection: CoordinatorMutationSelection): CoordinatorMutationResolution {
        const discovered = this.discovery.discover({
            cwd, workspace: selection.workspace, environment: this.options.environment, home: this.options.home
        });
        const context: LaneSelectionContext = {cwd, lane: selection.lane, initiative: selection.initiative};
        const lane = selectLane(discovered.lanes, context);
        const install = new LaneInstallIdentityReader().read(lane.laneDir);
        const runtimeContext: LaneRuntimeContext = {
            workspace: lane.controlHome, laneId: lane.laneId, initiativeId: lane.initiativeId, laneSlug: lane.slug,
            laneDir: lane.laneDir, homeRepositoryId: lane.manifest.controlHomeRepository,
            repositoriesFile: buildLaneFilePath(lane.laneDir, 'repositories.local.json'),
            runtimeRoot: this.runtime.getRuntimeRoot(install.runtimeVersion), runtimeVersion: install.runtimeVersion,
            knowledgeRoot: this.runtime.getKnowledgeRoot(install.knowledgeVersion),
            baseEnvironment: this.options.baseEnvironment
        };
        const capsule = this.authorization.read(lane.laneDir, selection.operation);
        if (capsule.kind === 'invalid') {
            return {ok: false, reason: 'COORDINATOR_MUTATION_AUTHORIZATION_INVALID', target: capsule.path, detail: capsule.detail};
        }
        return {ok: true, request: {
            context: runtimeContext, operation: selection.operation, subject: selection.subject, dryRun: selection.dryRun,
            ...(selection.reason === undefined ? {} : {reason: selection.reason}),
            ...(capsule.kind === 'missing' ? {} : {authorization: capsule.value})
        }};
    }
}
