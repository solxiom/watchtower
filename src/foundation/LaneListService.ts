import {createHash} from 'node:crypto';
import type {
    LaneListItem, LaneListPage, LaneListWarning, RepositoryBinding
} from '../contracts/index.js';
import {filterRelevantLanes, selectLane} from './discovery/index.js';
import {buildLaneFilePath} from './paths/index.js';
import {LaneInstallIdentityReader} from './LaneInstallIdentityReader.js';
import {
    digestLaneListQuery, paginateLaneList, validateLaneListPageInput
} from './LaneListCursor.js';
import {LaneStateProjectionReader} from './LaneStateProjectionReader.js';
import {RelevantLaneDiscovery} from './discovery/index.js';
import {readRepositoryBindings} from './repositoryBindings.js';
import type {ActiveLaneClaims, WritableConflict} from './writableConflicts.js';
import {inspectWritableConflicts} from './writableConflicts.js';

export interface LaneListQuery {
    readonly cwd: string;
    readonly workspace?: string;
    readonly lane?: string;
    readonly initiative?: string;
    readonly limit?: number;
    readonly cursor?: string;
    readonly verbose?: boolean;
    readonly environment?: NodeJS.ProcessEnv;
    readonly home?: string;
}

export interface LaneListServiceOptions {
    readonly discovery?: RelevantLaneDiscovery;
    readonly installReader?: LaneInstallIdentityReader;
    readonly stateReader?: LaneStateProjectionReader;
    readonly bindingReader?: typeof readRepositoryBindings;
}

export class LaneListService {
    private readonly discovery: RelevantLaneDiscovery;
    private readonly installReader: LaneInstallIdentityReader;
    private readonly stateReader: LaneStateProjectionReader;
    private readonly bindingReader: typeof readRepositoryBindings;

    constructor(options: LaneListServiceOptions = {}) {
        this.discovery = options.discovery ?? new RelevantLaneDiscovery();
        this.installReader = options.installReader ?? new LaneInstallIdentityReader();
        this.stateReader = options.stateReader ?? new LaneStateProjectionReader();
        this.bindingReader = options.bindingReader ?? readRepositoryBindings;
    }

    list(query: LaneListQuery): LaneListPage {
        validateLaneListPageInput(query.limit, query.cursor);
        const relevant = this.discovery.discover(query);
        const filtered = filterRelevantLanes(relevant.lanes, query.initiative);
        const lanes = query.lane === undefined ? filtered : [selectLane(filtered, {cwd: query.cwd, lane: query.lane})];
        const bindings = new Map<string, readonly RepositoryBinding[]>();
        for (const lane of relevant.lanes) {
            bindings.set(lane.laneId, this.bindingReader(
                buildLaneFilePath(lane.laneDir, 'repositories.local.json'), lane.manifest.repositories
            ));
        }
        const conflicts = inspectWritableConflicts(activeClaims(relevant.lanes, bindings));
        const warnings: LaneListWarning[] = relevant.warnings.map(warning => ({
            laneId: warning.laneId,
            reason: warning.reason
        }));
        const allItems = lanes.map(lane => this.item(lane, conflicts));
        const projectionRevision = revision(allItems, warnings);
        const page = paginateLaneList({
            items: allItems, limit: query.limit, cursor: query.cursor, revision: projectionRevision,
            queryDigest: digestLaneListQuery({
                workspace: relevant.workspace.workspace, lane: query.lane, initiative: query.initiative,
                verbose: query.verbose
            })
        });
        const result: LaneListPage = {...page, revision: projectionRevision, warnings, diagnostics: null};
        return query.verbose ? {...result, diagnostics: {
            workspaceResolution: relevant.workspace.resolution,
            relevantLaneCount: relevant.lanes.length,
            matchedLaneCount: allItems.length,
            pageItemCount: page.items.length,
            warningCount: warnings.length,
            conflictCount: conflicts.length
        }} : result;
    }

    private item(lane: ReturnType<RelevantLaneDiscovery['discover']>['lanes'][number],
        conflicts: readonly WritableConflict[]): LaneListItem {
        const state = this.stateReader.read(lane.laneDir);
        const install = this.installReader.read(lane.laneDir);
        const laneConflicts = conflicts.filter(conflict => conflict.lanes.includes(lane.laneId));
        return {
            laneId: lane.laneId, slug: lane.slug, initiativeId: lane.initiativeId, kind: lane.kind,
            controlHome: lane.controlHome, repositoryCount: lane.manifest.repositories.length,
            lifecycle: state.lifecycle, activeBatch: state.activeBatch, runtimeVersion: install.runtimeVersion,
            conflictState: laneConflicts.length === 0 ? 'none' : 'detected',
            conflicts: laneConflicts.map(conflict => conflict.kind).sort()
        };
    }
}

function activeClaims(
    lanes: ReturnType<RelevantLaneDiscovery['discover']>['lanes'],
    bindings: ReadonlyMap<string, readonly RepositoryBinding[]>
): ActiveLaneClaims[] {
    return lanes.filter(lane => lane.lifecycle !== 'unknown').map(lane => ({
        laneId: lane.laneId,
        lifecycle: lane.lifecycle === 'unknown' ? 'bootstrap' : lane.lifecycle,
        repositories: bindings.get(lane.laneId) ?? [],
        claims: lane.manifest.claims ?? []
    }));
}

function revision(items: readonly LaneListItem[], warnings: readonly LaneListWarning[]): string {
    return `sha256:${createHash('sha256').update(JSON.stringify({items, warnings})).digest('hex')}`;
}
