import type {ReadModelLaneLifecycle} from '../contracts/index.js';

export function normalizeLaneStatus(rawState: Record<string, string>): ReadModelLaneLifecycle {
    const status = rawState.lane_status;
    return status === 'bootstrap' || status === 'active' || status === 'paused' || status === 'complete' ? status : 'unknown';
}

export function detectContradictions(state: Record<string, string>, lifecycle: ReadModelLaneLifecycle): string[] {
    const hasActiveBatch = state.active_batch !== undefined && state.active_batch.trim() !== '';
    const watcherRunning = state.watcher_status === 'running';
    const contradictions: string[] = [];
    if (lifecycle === 'complete' && hasActiveBatch) contradictions.push('Complete lanes cannot declare an active batch.');
    if (lifecycle === 'complete' && watcherRunning) contradictions.push('Complete lanes cannot declare a running watcher.');
    if (lifecycle === 'paused' && watcherRunning) contradictions.push('Paused lanes cannot declare a running watcher.');
    if (lifecycle === 'bootstrap' && hasActiveBatch) contradictions.push('Bootstrap lanes cannot declare an active batch.');
    return contradictions;
}
