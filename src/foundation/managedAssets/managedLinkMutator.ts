/**
 * The one authorized write effect for a managed link, run only after
 * `managedLinkValidator.ts` has approved the exact action. Never decides
 * whether an action is safe; it only performs it.
 */
import type {ManagedLinkFileSystem} from './managedLinkFileSystem.js';
import type {ManagedLinkPlan} from './managedLinkPlanner.js';

export function createLink(fileSystem: ManagedLinkFileSystem, plan: ManagedLinkPlan): void {
    fileSystem.ensureContainingDirectory(plan.sourcePath);
    fileSystem.createSymlink(plan.targetPath, plan.sourcePath);
}

export function removeLink(fileSystem: ManagedLinkFileSystem, plan: ManagedLinkPlan): void {
    fileSystem.removeSymlink(plan.sourcePath);
}
