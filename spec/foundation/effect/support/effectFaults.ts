/**
 * Shared fault-injection and journal-inspection helpers for the CA-10 failure
 * and recovery specs.
 *
 * These wrap the *real* `nodeEffectFileSystem` and fail exactly one named
 * operation, so every untouched operation still hits the real filesystem. That
 * matters for this batch's claims: a fully mocked port would prove the
 * executor's control flow but say nothing about whether a real partial artifact
 * is actually removed from disk.
 */
import {readFileSync} from 'node:fs';
import {EffectExecutor} from '../../../../src/foundation/effect/EffectExecutor.js';
import {effectJournalPath} from '../../../../src/foundation/effect/effectJournal.js';
import {nodeEffectFileSystem} from '../../../../src/foundation/effect/nodeEffectFileSystem.js';
import type {EffectFileSystem} from '../../../../src/foundation/effect/effectPorts.js';
import {scenario} from './effectFixtures.js';

export type FaultOperation = 'createExclusive' | 'createThenFail' | 'remove' | 'syncDirectory' | 'appendLine';

/**
 * `createExclusive` fails *before* touching the disk. `createThenFail`
 * reproduces the correction-03 case instead: the file is genuinely created and
 * only then does the operation fail, exactly as a write or `fsync` fault inside
 * the adapter would leave an empty or partial envelope behind.
 */
export function faultingFileSystem(
    fault: {op: FaultOperation; match: (path: string) => boolean},
    ...also: {op: FaultOperation; match: (path: string) => boolean}[]
): EffectFileSystem {
    return also.length === 0 ? singleFault(fault) : combinedFault([fault, ...also]);
}

/**
 * Compose several independent faults into one port — the correction-04 case,
 * where a create/fsync/directory-sync failure is followed by a *cleanup*
 * failure. Proving that combination needs both faults live at once; either one
 * alone leaves the recoverable path that hides the defect.
 */
function combinedFault(faults: readonly {op: FaultOperation; match: (path: string) => boolean}[]): EffectFileSystem {
    const active = (op: FaultOperation, path: string) => faults.some((fault) => fault.op === op && fault.match(path));
    return {
        ...nodeEffectFileSystem,
        createExclusive(path, content, mode) {
            if (active('createExclusive', path)) throw new Error('injected create failure');
            if (active('createThenFail', path)) {
                nodeEffectFileSystem.createExclusive(path, '', mode);
                throw new Error('injected post-create write/fsync failure');
            }
            return nodeEffectFileSystem.createExclusive(path, content, mode);
        },
        appendLine(path, line) {
            if (active('appendLine', path)) throw new Error('injected journal append failure');
            nodeEffectFileSystem.appendLine(path, line);
        },
        syncDirectory(path) {
            if (active('syncDirectory', path)) throw new Error('injected directory sync failure');
            nodeEffectFileSystem.syncDirectory(path);
        },
        remove(path) {
            if (active('remove', path)) throw new Error('injected remove failure');
            nodeEffectFileSystem.remove(path);
        }
    };
}

function singleFault(fault: {op: FaultOperation; match: (path: string) => boolean}): EffectFileSystem {
    return {
        ...nodeEffectFileSystem,
        createExclusive(path, content, mode) {
            if (fault.op === 'createExclusive' && fault.match(path)) throw new Error('injected create failure');
            if (fault.op === 'createThenFail' && fault.match(path)) {
                nodeEffectFileSystem.createExclusive(path, '', mode);
                throw new Error('injected post-create write/fsync failure');
            }
            return nodeEffectFileSystem.createExclusive(path, content, mode);
        },
        appendLine(path, line) {
            if (fault.op === 'appendLine' && fault.match(path)) throw new Error('injected journal append failure');
            nodeEffectFileSystem.appendLine(path, line);
        },
        syncDirectory(path) {
            if (fault.op === 'syncDirectory' && fault.match(path)) throw new Error('injected directory sync failure');
            nodeEffectFileSystem.syncDirectory(path);
        },
        remove(path) {
            if (fault.op === 'remove' && fault.match(path)) throw new Error('injected remove failure');
            nodeEffectFileSystem.remove(path);
        }
    };
}

/** Exact current journal bytes, or `null` when no journal exists yet. */
export function journalBytes(laneDir: string): string | null {
    const path = effectJournalPath(laneDir);
    return nodeEffectFileSystem.fileExists(path) ? readFileSync(path, 'utf8') : null;
}

/**
 * Run one effect to completion so the journal holds real settled history.
 *
 * Byte-preservation claims are only meaningful against a non-empty journal: an
 * "the file does not exist" assertion passes trivially on a fresh lane, which
 * is exactly where a stray compensating record would hide.
 */
export async function seedSettledHistory(laneDir: string): Promise<string> {
    const seeded = scenario(laneDir, {request: {cycleId: 'cycle-seed'}});
    const outcome = await new EffectExecutor(seeded.deps).apply({
        ...seeded.request,
        proposal: {...seeded.proposal, proposalId: 'prop-seed'} as typeof seeded.proposal
    });
    if (outcome.status !== 'applied') throw new Error(`seed effect did not apply: ${outcome.status}`);
    return journalBytes(laneDir) ?? '';
}
