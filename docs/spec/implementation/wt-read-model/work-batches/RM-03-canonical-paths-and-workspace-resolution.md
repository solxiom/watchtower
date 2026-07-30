# Batch RM-03 — Canonical Paths And Workspace Resolution

Status: ❌ Pending
Phase: Path resolution
Depends on: RM-01 accepted

**Required implementor reasoning class:** `R4`
**Class rationale:** path resolution with symlink/case/path-escape security boundaries — wrong path logic silently operates on the wrong directory.

## Objective

Implement resolution precedence for `WATCHTOWER_DATA_HOME`, symlink/case/
path-escape safety, and missing explicit workspace handling.

## Required Work

1. Create `src/foundation/xdg.ts`: resolve `WATCHTOWER_DATA_HOME` with
   precedence: env var → `XDG_DATA_HOME` → `~/.local/share/watchtower`.
   Validate resolved path exists and is writable.
2. Create `src/foundation/workspace.ts`: resolve control home via
   `--workspace` → `git rev-parse --show-toplevel` → ancestor with
   `.watchtower/lanes` → cwd. Missing explicit `--workspace` is an error.
3. Create `src/foundation/paths.ts`: canonicalize via `realpath`, reject
   path escapes (`..`, symlink loops, null bytes, control characters),
   construct lane paths beneath control home or data root.
4. Write focused specs: resolution precedence for each path, symlink/case
   safety, path-escape rejection matrix, missing workspace error.

## Expected Ownership

- `src/foundation/xdg.ts`, `src/foundation/workspace.ts`, `src/foundation/paths.ts`
- Respective focused specs.

## Tests And Evidence

- Resolution precedence fixtures for all four `WATCHTOWER_DATA_HOME` paths.
- Control-home resolution: explicit workspace, git toplevel, ancestor walk, cwd.
- Path-escape rejection: `..`, symlink loops, null bytes, control characters.
- Missing workspace error: `--workspace` pointing to nonexistent directory.
- `nvb build` and `nvb test` pass.

## What Must Not Change

- Do not create directories during read operations.
- Do not write to the filesystem outside test fixture setup.
- Do not import command classes.

## Review Procedure Highlights

1. Trace every resolution path through the precedence chain.
2. Verify path-escape rejection for each attack class.
3. Confirm missing workspace is an error, not an implicit create.
4. Verify canonicalization before all path comparisons.

## Required Reasoning Posture

The assigned agent must reason from the governing specifications and current
source, not from the batch title alone. Inspect the current tree before planning.
Enumerate every resolution path and escape class. Use counterexamples to prove
failure modes are caught.

## Structural And Module-Size Acceptance

- Front doors target 160 lines; 220-line warning; 300-line ceiling.
- Focused modules target 220 lines; 300-line inventory; 350-line split
  rationale; 400-line hard ceiling.
- No `helpers`/`utils` bags. Record line counts.

## Required Review Packet

Include: changed files and ownership, line counts, responsibility inventories,
exact proof commands and outcomes, git status, `.local/` not staged.

## Completion And Handoff

Path resolution, workspace discovery, and XDG handling are accepted. RM-06,
RM-07, and RM-08 consume these services. Every path operation fails closed on
escape attempts. The resolved XDG data root path is available for later batches
that stage runtimes or read membership indexes.
