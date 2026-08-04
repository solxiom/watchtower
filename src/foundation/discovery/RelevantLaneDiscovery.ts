import type {
    MembershipWarning, WorkspaceContext
} from '../../contracts/index.js';
import {createWatchtowerError} from '../../contracts/index.js';
import {safePathTarget} from '../paths/index.js';
import {resolveWatchtowerDataHome} from '../paths/index.js';
import {discoverHomeLanes} from './homeLaneDiscovery.js';
import type {DiscoveredLane} from './laneDiscovery.js';
import type {LaneDiscoveryFileSystem} from './LaneDiscoveryFileSystem.js';
import {nodeLaneDiscoveryFileSystem} from './LaneDiscoveryFileSystem.js';
import {discoverSecondaryLanes} from './SecondaryDiscovery.js';
import {resolveWorkspaceContext} from '../paths/index.js';

export interface RelevantLaneQuery {
    readonly cwd: string;
    readonly workspace?: string;
    readonly environment?: NodeJS.ProcessEnv;
    readonly home?: string;
}

export interface RelevantLaneSet {
    readonly workspace: WorkspaceContext;
    readonly dataHome: string;
    readonly lanes: readonly DiscoveredLane[];
    readonly warnings: readonly MembershipWarning[];
}

export interface RelevantLaneDiscoveryOptions {
    readonly fileSystem?: LaneDiscoveryFileSystem;
    readonly workspaceResolver?: typeof resolveWorkspaceContext;
    readonly dataHomeResolver?: typeof resolveWatchtowerDataHome;
}

export class RelevantLaneDiscovery {
    private readonly fileSystem: LaneDiscoveryFileSystem;
    private readonly workspaceResolver: typeof resolveWorkspaceContext;
    private readonly dataHomeResolver: typeof resolveWatchtowerDataHome;

    constructor(options: RelevantLaneDiscoveryOptions = {}) {
        this.fileSystem = options.fileSystem ?? nodeLaneDiscoveryFileSystem;
        this.workspaceResolver = options.workspaceResolver ?? resolveWorkspaceContext;
        this.dataHomeResolver = options.dataHomeResolver ?? resolveWatchtowerDataHome;
    }

    discover(query: RelevantLaneQuery): RelevantLaneSet {
        const workspace = this.workspaceResolver(query.workspace, query.cwd);
        const dataHome = this.dataHomeResolver(query.environment, query.home);
        const homeLanes = discoverHomeLanes(workspace.workspace, this.fileSystem);
        const secondary = this.secondary(workspace.workspace, dataHome);
        return {
            workspace,
            dataHome,
            lanes: mergeLanes(homeLanes, secondary.lanes),
            warnings: secondary.warnings
        };
    }

    private secondary(workspace: string, dataHome: string): {
        readonly lanes: readonly DiscoveredLane[];
        readonly warnings: readonly MembershipWarning[];
    } {
        let kind;
        try { kind = this.fileSystem.inspect(dataHome)?.kind; } catch { throw unavailableDataHome(dataHome); }
        if (kind === undefined) return {lanes: [], warnings: []};
        if (kind !== 'directory') throw unavailableDataHome(dataHome);
        const result = discoverSecondaryLanes(workspace, dataHome, this.fileSystem);
        const lanes = result.memberships.map(membership => {
            const lane = discoverHomeLanes(membership.laneHome, this.fileSystem)
                .find(candidate => candidate.laneId === membership.laneId);
            if (lane === undefined) throw duplicateIdentity(membership.laneId);
            return lane;
        });
        return {lanes, warnings: result.warnings};
    }
}

function mergeLanes(home: readonly DiscoveredLane[], secondary: readonly DiscoveredLane[]): DiscoveredLane[] {
    const byId = new Map<string, DiscoveredLane>();
    for (const lane of [...home, ...secondary]) {
        const existing = byId.get(lane.laneId);
        if (existing !== undefined && existing.laneDir !== lane.laneDir) throw duplicateIdentity(lane.laneId);
        byId.set(lane.laneId, lane);
    }
    return [...byId.values()].sort((left, right) => left.controlHome.localeCompare(right.controlHome) ||
        left.slug.localeCompare(right.slug) || left.laneId.localeCompare(right.laneId));
}

function unavailableDataHome(path: string) {
    return createWatchtowerError('ERR_INDEX_UNAVAILABLE', {
        operation: 'discover relevant lanes', target: safePathTarget(path),
        remediation: 'Restore a readable Watchtower data-home directory or remove the invalid override.'
    });
}

function duplicateIdentity(laneId: string) {
    return createWatchtowerError('ERR_INVALID_LANE_CONFIG', {
        operation: 'discover relevant lanes', target: laneId,
        remediation: 'Assign each lane ID to exactly one authoritative lane home.'
    });
}
