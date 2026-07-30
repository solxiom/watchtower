# Agent Launch Prompt — Work Batch RM-03

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for path resolution with security boundaries`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent that
can load the complete brief/spec/source context, inspect and edit the repository
with tools, reason across security boundaries, and run the required proof.

You are assigned **implementation work batch RM-03** for the Watchtower v1
wt-read-model delivery lane.

This batch implements resolution precedence for `WATCHTOWER_DATA_HOME`,
symlink/case/path-escape safety, and missing explicit workspace handling.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-read-model/work-batches/RM-03-canonical-paths-and-workspace-resolution.md`
2. `docs/spec/implementation/wt-read-model/work-batches/README.md`
3. `docs/spec/implementation/wt-read-model/work-batches/00-work-batch-index.md`
4. `docs/spec/v1.md` (especially §7.1 — Global runtime store, §9.1 — Repository/worktree resolution)
5. `docs/spec/v1-contracts.md`
6. `docs/spec/architecture.md`
7. `docs/spec/implementation/wt-read-model/implementation-roadmap.md`
8. `docs/spec/implementation/wt-read-model/implementation-tracker.md`
9. `docs/spec/implementation/wt-read-model/implementation-quality-and-agent-rules.md`
10. the canonical source owners you will actually change:
    - `src/foundation/xdg.ts` (create)
    - `src/foundation/workspace.ts` (create)
    - `src/foundation/paths.ts` (create)
    - `src/contracts/types.ts` (may need `WorkspaceContext` if not in RM-01)

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for path resolution with security boundaries`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

1. Build a dependency and ownership map from the governing specs to the exact
   contracts, paths, workspace, XDG, tests, and status artifacts affected.
2. Inspect the current source and the accepted RM-01 output.
3. Enumerate every resolution path (data home, workspace, lane dirs) and every
   escape class (symlink, `..`, null byte, control char, loop).
4. Use counterexamples: a path that passes `realpath` but contains `..` in
   the input, a symlink to outside the workspace, a missing `--workspace`.
5. When a spec and current source disagree, stop and record the contradiction.
6. Treat predecessor reports as leads, not proof.

## Structural Design And Module-Size Gate

- Front doors target 160 lines or fewer. 161-220 requires cohesion justification.
  Over 220 is rejectable; 300 is the absolute ceiling.
- Focused implementation modules target 220 lines or fewer. 221-300 requires
  responsibility inventory. 301-350 requires source-backed split rationale.
  Above 350 is rejected.
- Four hundred lines is the absolute ceiling for any hand-maintained JS/TS module.
- Do not create `helpers`, `utils`, `common`, or `misc` bags.
- Record physical line counts.

## Your Mission

Implement canonical path and workspace resolution:

1. Create `src/foundation/xdg.ts`:
   - `resolveWatchtowerDataHome(): string` — resolve in precedence order: `WATCHTOWER_DATA_HOME` env var → `XDG_DATA_HOME`/watchtower → `~/.local/share/watchtower`. Validate the resolved path.
   - `ensureWatchtowerDataHome(): string` — read-only validation that the data home exists and is accessible; throw if missing.
2. Create `src/foundation/workspace.ts`:
   - `resolveWorkspace(explicit?: string): string` — resolve control home: explicit workspace → `git rev-parse --show-toplevel` → ancestor containing `.watchtower/lanes` → cwd. Missing explicit workspace throws `ERR_WORKSPACE_NOT_FOUND`.
   - `resolveRepositoryRoot(cwd?: string): string` — resolve the nearest Git repository root.
3. Create `src/foundation/paths.ts`:
   - `canonicalizePath(input: string): string` — resolve through `realpath`, reject path escapes.
   - `isPathSafe(input: string): boolean` — reject `..` segments, null bytes, control characters, symlink escapes.
   - `buildLanePath(controlHome: string, slug: string): string` — construct `.watchtower/lanes/<slug>/` path.
   - `buildLaneFilePath(laneDir: string, file: string): string` — construct a path within a lane directory, with escape checking.
4. Write focused Jasmine specs:
   - XDG resolution: env var set → use; XDG set → use; none set → `~/.local/share/watchtower`.
   - Workspace resolution: explicit provided → use; git toplevel found → use; ancestor found → use; cwd → use; explicit missing → `ERR_WORKSPACE_NOT_FOUND`.
   - Path escape rejection: `..` rejected, symlink to outside rejected, null byte rejected, control char rejected.
   - Path canonicalization: symlink resolved, case normalized, trailing slashes stripped.

## What You Must Not Do

- Do not create directories during resolution; return the computed path only.
- Do not write to the filesystem outside test fixture setup/teardown.
- Do not import command classes or CLI rendering into foundation paths.
- Do not commit.

## Required Proof

- Resolution precedence for all data-home and workspace paths.
- Path-escape rejection for all attack classes.
- Missing workspace error.
- `nvb build` and `nvb test` pass.
- final `git status --short`.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep updated: `implementation-tracker.md`, `implementation-roadmap.md`.

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`

## Non-Negotiable Rules

- all path resolution must fail closed on escape attempts
- missing explicit workspace is an error, not an implicit create
- paths must be canonicalized before comparison
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write to: `.local/agent-reports/wt-read-model/RM-03-canonical-paths-and-workspace-resolution.md`

Include: documents studied, exact files changed, line counts, proof commands
and outcomes, final `git status --short`, proposed commit message.

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the resolved `WATCHTOWER_DATA_HOME` path, the workspace resolution
precedence, and the available path construction functions. RM-06 consumes
workspace resolution and lane-path construction. RM-07 consumes data-home
resolution for membership-index loading. Every consumer must path-check
through `isPathSafe` before operating.
