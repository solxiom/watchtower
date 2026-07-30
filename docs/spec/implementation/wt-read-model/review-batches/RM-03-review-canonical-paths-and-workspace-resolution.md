# Review Batch RM-03 — Canonical Paths And Workspace Resolution

Status: ⏳ Awaiting review
Reasoning: `R4`
Paired work brief: `work-batches/RM-03-canonical-paths-and-workspace-resolution.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-03-canonical-paths-and-workspace-resolution.md`

## Scope Verification

- [ ] `src/foundation/xdg.ts` created with `resolveWatchtowerDataHome`, `ensureWatchtowerDataHome`
- [ ] `src/foundation/workspace.ts` created with `resolveWorkspace`, `resolveRepositoryRoot`
- [ ] `src/foundation/paths.ts` created with `canonicalizePath`, `isPathSafe`, `buildLanePath`, `buildLaneFilePath`

## Required Independent Proof

1. Trace every resolution path through the precedence chain: `WATCHTOWER_DATA_HOME` env → XDG fallback → `~/.local/share/watchtower`.
2. Verify workspace resolution: explicit → git toplevel → ancestor walk → cwd. Missing explicit workspace throws `ERR_WORKSPACE_NOT_FOUND`.
3. Verify every path-escape class: `..`, symlink loops, null bytes, control characters — all rejected.
4. Verify canonicalization via `realpath` before all comparisons.
5. Confirm no directories are created during resolution functions.
6. Run `nvb build` and `nvb test` independently.

## Acceptance Gate

- All resolution precedence tests pass.
- All path-escape attacks rejected.
- Missing workspace is an error, not creation.
- Build and tests pass independently.

## Reject Conditions

- Any path escape accepted.
- Missing workspace silently created.
- Paths compared without canonicalization.
- Stale tracker/roadmap.
- Implementation agent committed.
