import type {LaneStatusV1, StatusWarningCode} from '../contracts/index.js';
import {LaneStateProjectionReader} from './LaneStateProjectionReader.js';
import {RelevantLaneDiscovery} from './RelevantLaneDiscovery.js';
import {selectLane} from './LaneSelector.js';
import {StatusConflictInspector, type StatusConflictInspectorOptions} from './StatusConflictInspector.js';
import {StatusEventProjection} from './StatusEventProjection.js';
import {StatusLaneInputReader} from './StatusLaneInputReader.js';
import {StatusLiveObserver, type StatusLiveObserverOptions} from './StatusLiveObserver.js';
import {StatusPackIntegrity, type StatusPackIntegritySource} from './StatusPackIntegrity.js';
import {StatusRuntimeInventory, type StatusRuntimeSource} from './StatusRuntimeInventory.js';
import {deriveStatusHealth} from './statusHealth.js';
import {relatedLaneViews, repositoryViews, watcherWarnings, workerSessionViews} from './statusViewProjection.js';

export interface StatusProjectionQuery {
    readonly cwd: string; readonly workspace?: string; readonly lane?: string; readonly initiative?: string;
    readonly verbose?: boolean; readonly environment?: NodeJS.ProcessEnv; readonly home?: string;
}

export interface StatusProjectionOptions extends StatusLiveObserverOptions, StatusConflictInspectorOptions {
    readonly discovery?: RelevantLaneDiscovery; readonly laneInputs?: StatusLaneInputReader;
    readonly live?: StatusLiveObserver; readonly stateReader?: LaneStateProjectionReader;
    readonly conflicts?: StatusConflictInspector; readonly events?: StatusEventProjection;
    readonly packIntegrity?: StatusPackIntegritySource; readonly runtime?: StatusRuntimeSource;
}

export class StatusProjection {
    private readonly discovery: RelevantLaneDiscovery;
    private readonly inputs: StatusLaneInputReader;
    private readonly live: StatusLiveObserver;
    private readonly stateReader: LaneStateProjectionReader;
    private readonly conflictInspector: StatusConflictInspector;
    private readonly eventProjection: StatusEventProjection;
    private readonly packIntegrity: StatusPackIntegritySource;
    private readonly runtime: StatusRuntimeSource;

    constructor(options: StatusProjectionOptions = {}) {
        this.discovery = options.discovery ?? new RelevantLaneDiscovery();
        this.inputs = options.laneInputs ?? new StatusLaneInputReader(options.files);
        this.live = options.live ?? new StatusLiveObserver(options);
        this.stateReader = options.stateReader ?? new LaneStateProjectionReader(options.files);
        this.conflictInspector = options.conflicts ?? new StatusConflictInspector({...options, laneInputs: this.inputs});
        this.eventProjection = options.events ?? new StatusEventProjection();
        this.packIntegrity = options.packIntegrity ?? new StatusPackIntegrity();
        this.runtime = options.runtime ?? new StatusRuntimeInventory();
    }

    async project(query: StatusProjectionQuery): Promise<LaneStatusV1> {
        const relevant = this.discovery.discover(query);
        const lane = selectLane(relevant.lanes, query);
        const warnings: StatusWarningCode[] = [];
        if (relevant.warnings.length > 0) warnings.push('MEMBERSHIP_INDEX_STALE');
        const bindings = this.inputs.readBindings(lane, warnings);
        const state = this.stateReader.read(lane.laneDir);
        if (state.lifecycle === 'unknown') warnings.push('INVALID_LANE_STATE');
        const prefix = this.inputs.readTmuxPrefix(lane, warnings);
        const configuredRuntime = this.inputs.readInstallVersion(lane.laneDir, warnings);
        const reviewEvents = relevant.lanes.flatMap(item => this.inputs.readPackReviewEvents(item.laneDir));
        const packIntegrity = await this.packIntegrity.inspect(lane, bindings, warnings, reviewEvents);
        const conflictObservation = this.conflictInspector.inspect(relevant.lanes, lane, bindings);
        const conflicts = conflictObservation.conflicts;
        if (!conflictObservation.complete) warnings.push('CONFLICT_OBSERVATION_INCOMPLETE');
        if (!conflictObservation.proofResourcesAvailable) warnings.push('PROOF_RESOURCE_CONFLICTS_UNAVAILABLE');
        if (conflicts.length > 0) warnings.push('WRITABLE_CONFLICT');
        if (this.live.isLaneBusy(lane.laneDir)) warnings.push('LANE_BUSY');
        const journal = this.inputs.readEvents(lane.laneDir, warnings);
        const expected = this.live.sessionNames(prefix, lane.slug);
        const event = this.eventProjection.project(journal.records, lane.laneId, expected, warnings);
        const sessions = await this.live.observeSessions(lane.controlHome, query.environment?.PATH, expected, warnings);
        const heartbeat = this.live.observeHeartbeat(lane.laneDir);
        watcherWarnings(state.lifecycle, sessions.watcherPresent, heartbeat.status, warnings);
        this.eventProjection.workerWarnings(state.lifecycle, state.activeBatch, event.latest, sessions, warnings);
        const runtime = this.runtime.observe(configuredRuntime, warnings);
        const result: LaneStatusV1 = {schemaVersion: 1,
            lane: {id: lane.laneId, slug: lane.slug, initiativeId: lane.initiativeId,
                kind: lane.kind, controlHome: lane.controlHome}, repositories: repositoryViews(lane, bindings),
            lifecycle: {status: state.lifecycle, activeBatch: state.activeBatch},
            health: deriveStatusHealth({lifecycle: state.lifecycle, warningCodes: warnings}), packIntegrity,
            workerSessions: workerSessionViews(sessions), watcher: {running: sessions.watcherPresent,
                heartbeatStatus: heartbeat.status, lastHeartbeatAt: heartbeat.lastHeartbeatAt},
            coordinator: {status: 'unavailable'}, latestEvent: event.view,
            batchProgress: {accepted: null, total: null}, relatedLanes: relatedLaneViews(lane),
            conflicts, runtime, diagnostics: null};
        return query.verbose ? {...result, diagnostics: {workspaceResolution: relevant.workspace.resolution,
            relevantLaneCount: relevant.lanes.length, membershipWarningCount: relevant.warnings.length,
            eventWarningCount: journal.warningCount, rejectedEventCount: event.rejectedCount,
            conflictCount: conflicts.length}} : result;
    }
}
