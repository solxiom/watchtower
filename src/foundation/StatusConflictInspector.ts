import type {RepositoryBinding, StatusConflictView, StatusWarningCode} from '../contracts/index.js';
import {inspectWritableConflicts} from './bindings/index.js';
import {StatusLaneInputReader} from './StatusLaneInputReader.js';
import type {StatusLane} from './statusLaneTypes.js';

export interface StatusProofConflictSource {
    inspect(lanes: readonly StatusLane[]): StatusProofConflictObservation;
}

export interface StatusProofConflictObservation {
    readonly available: boolean;
    readonly conflicts: readonly StatusConflictView[];
}

export interface StatusConflictObservation {
    readonly complete: boolean;
    readonly proofResourcesAvailable: boolean;
    readonly conflicts: readonly StatusConflictView[];
}

export interface StatusConflictInspectorOptions {
    readonly laneInputs?: StatusLaneInputReader;
    readonly proofConflicts?: StatusProofConflictSource;
}

export class StatusConflictInspector {
    private readonly laneInputs: StatusLaneInputReader;
    private readonly proofConflicts: StatusProofConflictSource;

    constructor(options: StatusConflictInspectorOptions = {}) {
        this.laneInputs = options.laneInputs ?? new StatusLaneInputReader();
        this.proofConflicts = options.proofConflicts ?? {inspect: () => ({available: false, conflicts: []})};
    }

    inspect(lanes: readonly StatusLane[], selected: StatusLane,
        selectedBindings: readonly RepositoryBinding[]): StatusConflictObservation {
        const bindings = this.bindingMap(lanes, selected.laneId, selectedBindings);
        const repositories = inspectWritableConflicts(activeClaims(lanes, bindings.values))
            .filter(conflict => conflict.lanes.includes(selected.laneId))
            .map(conflict => ({kind: conflict.kind, lanes: [...conflict.lanes],
                repository: conflict.repository, paths: [...(conflict.paths ?? [])]} as const));
        const tmux = this.tmuxPrefixConflicts(lanes, selected);
        const proof = this.proofConflicts.inspect(lanes);
        return {complete: bindings.complete && tmux.complete, proofResourcesAvailable: proof.available,
            conflicts: [...repositories, ...tmux.conflicts,
                ...proof.conflicts.filter(conflict => conflict.lanes.includes(selected.laneId))]};
    }

    private bindingMap(lanes: readonly StatusLane[], selectedId: string,
        selected: readonly RepositoryBinding[]): BindingMapObservation {
        const result = new Map<string, readonly RepositoryBinding[]>();
        let complete = true;
        for (const lane of lanes) {
            if (lane.laneId === selectedId) { result.set(lane.laneId, selected); continue; }
            const warnings: StatusWarningCode[] = [];
            try {
                const bindings = this.laneInputs.readBindings(lane, warnings);
                if (warnings.length === 0) result.set(lane.laneId, bindings); else complete = false;
            } catch { complete = false; }
        }
        return {complete, values: result};
    }

    private tmuxPrefixConflicts(lanes: readonly StatusLane[], selected: StatusLane): ConflictListObservation {
        const selectedPrefix = this.laneInputs.readTmuxPrefix(selected);
        if (selectedPrefix === null || selected.lifecycle !== 'active') return {complete: true, conflicts: []};
        const conflicts: StatusConflictView[] = []; let complete = true;
        for (const lane of lanes.filter(item => item.laneId !== selected.laneId && item.lifecycle === 'active')) {
            const warnings: StatusWarningCode[] = [];
            try {
                if (this.laneInputs.readTmuxPrefix(lane, warnings) === selectedPrefix && warnings.length === 0) {
                    conflicts.push({kind: 'tmux-prefix', lanes: [selected.laneId, lane.laneId], prefix: selectedPrefix});
                } else if (warnings.length > 0) complete = false;
            } catch { complete = false; }
        }
        return {complete, conflicts};
    }
}

interface BindingMapObservation {
    readonly complete: boolean;
    readonly values: ReadonlyMap<string, readonly RepositoryBinding[]>;
}
interface ConflictListObservation {readonly complete: boolean; readonly conflicts: readonly StatusConflictView[];}

function activeClaims(lanes: readonly StatusLane[],
    bindings: ReadonlyMap<string, readonly RepositoryBinding[]>) {
    return lanes.filter(lane => lane.lifecycle !== 'unknown' && bindings.has(lane.laneId)).map(lane => ({
        laneId: lane.laneId,
        lifecycle: lane.lifecycle === 'unknown' ? 'bootstrap' as const : lane.lifecycle,
        repositories: bindings.get(lane.laneId) ?? [], claims: lane.manifest.claims ?? []
    }));
}
