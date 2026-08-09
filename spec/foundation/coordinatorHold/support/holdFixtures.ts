import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {nodeQueueFileSystem} from '../../../../src/foundation/lane/coordinator/queue/nodeQueueFileSystem.js';
import {nodeLaneMutationLock, type LaneMutationLock} from '../../../../src/foundation/lane/coordinator/queue/laneMutationLock.js';
import type {QueueClock, QueueFileSystem} from '../../../../src/foundation/lane/coordinator/queue/queuePorts.js';
import {ScopedHoldService} from '../../../../src/foundation/lane/coordinator/hold/ScopedHoldService.js';
import type {HoldIdFactory} from '../../../../src/foundation/lane/coordinator/hold/holdIdFactory.js';

export const LANE_ID = '11111111-2222-4333-8444-555555555556';
export const NOW = '2026-08-08T00:00:00.000Z';

export function makeLaneDir(): string {
    return mkdtempSync(join(tmpdir(), 'wt-ca27-hold-'));
}

export function removeLaneDir(laneDir: string): void {
    rmSync(laneDir, {recursive: true, force: true});
}

export const files: QueueFileSystem = nodeQueueFileSystem;

export function lockFor(laneDir: string): LaneMutationLock {
    return nodeLaneMutationLock(laneDir);
}

export function fixedClock(at = NOW): QueueClock {
    return {now: () => new Date(at)};
}

export function countingHoldIds(prefix = 'hold'): HoldIdFactory {
    let count = 0;
    return {nextHoldId: () => `${prefix}-${++count}`};
}

export function serviceFor(laneDir: string, at = NOW, ids: HoldIdFactory = countingHoldIds()): ScopedHoldService {
    return new ScopedHoldService({laneDir, laneId: LANE_ID, files, lock: lockFor(laneDir), clock: fixedClock(at), ids});
}
