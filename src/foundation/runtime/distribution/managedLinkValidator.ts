/**
 * The single decision owner for what a managed link's *current* on-disk state
 * permits: whether `createLinks` may create/skip it, and whether `removeLinks`
 * may safely remove it. Never mutates; `managedLinkMutator.ts` performs the
 * one authorized effect after this module approves it.
 */
import {ManagedAssetsError} from '../../../contracts/manifests.js';
import type {ManagedLinkPlan} from './managedLinkPlanner.js';
import type {ManagedLinkSourceObservation} from './managedLinkFileSystem.js';

export type CreateDecision = 'create' | 'already-linked';
export type RemoveDecision = 'remove' | 'absent' | 'not-managed';

/** Whether the plan's source is safe to create, already correct, or a collision. */
export function decideCreate(plan: ManagedLinkPlan, observation: ManagedLinkSourceObservation): CreateDecision {
    if (observation.kind === 'missing') return 'create';
    if (observation.kind === 'symlink' && observation.linkTarget === plan.targetPath) return 'already-linked';
    throw new ManagedAssetsError('LINK_SOURCE_COLLISION', plan.assetPath,
        'A non-managed file, directory, or differently targeted symlink already occupies the managed link path.');
}

/** Whether the plan's source is safe to remove: only an exact, matching managed symlink. */
export function decideRemove(plan: ManagedLinkPlan, observation: ManagedLinkSourceObservation): RemoveDecision {
    if (observation.kind === 'missing') return 'absent';
    if (observation.kind === 'symlink' && observation.linkTarget === plan.targetPath) return 'remove';
    return 'not-managed';
}
