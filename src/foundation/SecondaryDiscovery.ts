import type {MembershipIndexResult} from '../contracts/index.js';
import {canonicalizePath} from './paths/index.js';
import {readMembershipIndex, type MembershipIndexFileSystem} from './membershipIndex.js';

/** Finds only validated advisory memberships for the current secondary worktree. */
export function discoverSecondaryLanes(
    workspace: string, dataHome: string, fileSystem?: MembershipIndexFileSystem
): MembershipIndexResult {
    const canonicalWorkspace = canonicalizePath(workspace);
    const index = readMembershipIndex(dataHome, fileSystem);
    return {
        memberships: index.memberships.filter(membership => membership.worktreePath === canonicalWorkspace),
        warnings: index.warnings.filter(warning => warningMatchesWorkspace(warning.worktreePath, canonicalWorkspace))
    };
}

function warningMatchesWorkspace(worktreePath: string, workspace: string): boolean {
    try { return canonicalizePath(worktreePath) === workspace; } catch { return worktreePath === workspace; }
}
