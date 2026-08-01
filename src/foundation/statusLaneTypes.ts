import type {RelevantLaneDiscovery} from './RelevantLaneDiscovery.js';

export type StatusLane = ReturnType<RelevantLaneDiscovery['discover']>['lanes'][number];
