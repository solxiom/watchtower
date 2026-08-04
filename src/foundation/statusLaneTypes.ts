import type {RelevantLaneDiscovery} from './discovery/index.js';

export type StatusLane = ReturnType<RelevantLaneDiscovery['discover']>['lanes'][number];
