/**
 * REL-02 correction-01 finding #4 — copied-template discovery proof from the
 * discovery contract's actually-relevant locations
 * (`docs/spec/v1.md` §9.1 resolution order, §9.2 lane discovery).
 *
 * Workspace resolution prefers `git rev-parse --show-toplevel` (step 2) over
 * an ancestor `.watchtower/lanes` search (step 3) — see
 * `src/foundation/paths/workspaceResolver.ts`'s `resolveWorkspaceContext`.
 * A copied-template nested *inside* a real Git repository (the sibling
 * `control/copied-template` fixture in `multi-repo.spec.ts`) is therefore
 * structurally unreachable from any cwd inside that repository:
 * `RelevantLaneDiscovery.discover` always calls `discoverHomeLanes` on the
 * *resolved workspace* (the Git toplevel), and `discoverHomeLanes` only walks
 * upward from there — it never descends into a subdirectory such as
 * `copied-template`. Step 3's ancestor walk-up only governs discovery when no
 * enclosing Git repository exists, so this module stages a second
 * copied-template *outside* any Git worktree and exercises cwds both above it
 * (a true ancestor, where it is provably never reached) and inside/below it
 * (where the real ancestor walk-up in `laneDiscovery.ts`'s
 * `discoverHomeLanes` does reach it, empirically confirmed here to fail
 * closed with `ERR_INVALID_LANE_CONFIG` rather than silently accept or
 * repair it).
 */
import {chmodSync, mkdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

export interface DetachedCopiedTemplate {
    readonly dir: string;
    readonly nestedDir: string;
    readonly marker: string;
    readonly beforeBytes: string;
    readonly beforeMode: number;
}

/** A copied-template marker rooted outside any Git worktree, plus a nested descendant directory inside it. */
export function makeDetachedCopiedTemplate(root: string): DetachedCopiedTemplate {
    const dir = join(root, 'detached-copied-template');
    const nestedDir = join(dir, 'nested-child');
    const templateDir = join(dir, '.watchtower', 'lanes', 'old-lane');
    mkdirSync(templateDir, {recursive: true});
    mkdirSync(nestedDir, {recursive: true});
    const marker = join(templateDir, 'lane.json');
    writeFileSync(marker, '{"not": "a valid lane.json"}\n');
    chmodSync(marker, 0o444);
    return {dir, nestedDir, marker, beforeBytes: readFileSync(marker, 'utf8'), beforeMode: statSync(marker).mode & 0o777};
}

/** Fails loudly (not a silent Jasmine matcher) if the marker's bytes or permission mode drifted at all. */
export function assertMarkerUntouched(template: DetachedCopiedTemplate): void {
    const bytes = readFileSync(template.marker, 'utf8');
    if (bytes !== template.beforeBytes) throw new Error(`copied-template marker bytes changed: ${template.marker}`);
    const mode = statSync(template.marker).mode & 0o777;
    if (mode !== template.beforeMode) throw new Error(`copied-template marker permissions changed: ${template.marker}`);
}
