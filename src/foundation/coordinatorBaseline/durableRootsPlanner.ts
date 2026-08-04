/**
 * Plans the empty durable coordinator roots LC-05 exclusively owns:
 * zero-byte journal files (`docs/spec/coordinator-automation.md` §17/§18)
 * and the `coordinator/cycles/` directory. `coordinator/queue.json`,
 * `cursor.json`, and every `projections/*.json` file are coordinator-cycle
 * *output* the wt-coordinator-automation pack (CA-01/CA-04) owns and first
 * writes; materializing placeholder content for them here would invent
 * foreign-batch schema, so this module deliberately stops at the directory
 * and empty-log boundary. `coordinator/operator-sessions`,
 * `coordinator/amendment-requests`, and `coordinator/holds` are already
 * created by LC-03's `buildLaneLayout`.
 */
import {join} from 'node:path';
import type {LaneFile} from '../laneStore/laneStoreContracts.js';

const JOURNAL_FILES = ['coordinator-events.jsonl', 'effect-events.jsonl', 'usage-ledger.jsonl'] as const;

export function buildDurableRoots(laneDir: string): {readonly directories: readonly string[]; readonly files: readonly LaneFile[]} {
    const journalDir = join(laneDir, 'coordinator', 'journal');
    const files = JOURNAL_FILES.map((name): LaneFile => Object.freeze({path: join(journalDir, name), content: ''}));
    const directories = [join(laneDir, 'coordinator', 'cycles')];
    return Object.freeze({directories: Object.freeze(directories), files: Object.freeze(files)});
}
