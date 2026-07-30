# Batch RM-03 — Canonical Paths And Workspace Resolution

## Mandatory Governing References

This draft brief is subordinate to:

- `AGENTS.md`
- `docs/development/engineering-and-review-standard.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/schemas/v1.schema.json`
- `docs/spec/v1.md`
- `docs/spec/nirvana-integration-architecture.md`
- `docs/spec/architecture.md`
- `docs/spec/v1-implementation-map.md`
- `docs/spec/coordinator-automation.md`
- `docs/spec/operator-session.md`
- `docs/spec/cli-session.md`
- this pack's `implementation-quality-and-agent-rules.md`

Only the references relevant to the batch's accepted scope need drive its
product logic, but the engineering and Nirvana/NVB architecture standards
always apply. If this brief names a stale path, title, size threshold, or
mechanism, follow the governing source and correct the brief/report rather than
implementing the stale claim. Stop for a specification amendment when the
governing sources leave a product decision unresolved.

## Mandatory Cross-Cutting Acceptance

- Include a Nirvana API usage audit with inspected packages/symbols, comparable
  Nira usage, selected APIs, and any proven `NIRVANA_API_GAP`.
- Keep commands as thin Nirvana front doors and place behavior in
  capability-oriented foundation owners.
- Use the packaged immutable NVB task catalog for substantial mechanical
  workflows. `LaneTaskRunner` is the sole task invocation boundary; project
  `nvb.json` files are never modified or trusted as Watchtower authority.
- Retain shell only as a manifest-declared leaf adapter. Workflow-level shell,
  arbitrary task selection, and direct raw subprocess use are hard rejects.
- Apply the exact module/function/constructor limits and reviewer matrix from
  the mandatory engineering standard. A pack-local statement cannot relax
  those limits.
- Reconcile every reason code, exit mapping, event name, and schema identifier
  with accepted RM-01 contracts and `docs/spec/schemas/v1.schema.json`; a local
  illustrative name does not silently create a public identifier.

Status: ❌ Pending
Phase: Path resolution
Depends on: RM-01 accepted

**Required implementor reasoning class:** `R4`
**Class rationale:** path resolution with symlink/case/path-escape security boundaries — wrong path logic silently operates on the wrong directory.

## Objective

Implement resolution precedence for `WATCHTOWER_DATA_HOME`, symlink/case/
path-escape safety, and missing explicit workspace handling.

## Required Work

1. Create `src/foundation/dataHomeResolver.ts`: resolve `WATCHTOWER_DATA_HOME` with
   precedence: env var → `XDG_DATA_HOME` → `~/.local/share/watchtower`.
   Validate resolved path exists and is writable.
2. Create `src/foundation/workspaceResolver.ts`: resolve control home via
   `--workspace` → `git rev-parse --show-toplevel` → ancestor with
   `.watchtower/lanes` → cwd. Missing explicit `--workspace` is an error.
3. Create `src/foundation/canonicalPaths.ts`: canonicalize via `realpath`, reject
   path escapes (`..`, symlink loops, null bytes, control characters),
   construct lane paths beneath control home or data root.
4. Write focused specs: resolution precedence for each path, symlink/case
   safety, path-escape rejection matrix, missing workspace error.

## Expected Ownership

- `src/foundation/dataHomeResolver.ts`, `src/foundation/workspaceResolver.ts`, `src/foundation/canonicalPaths.ts`
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

Line count is a design alarm, never permission to accumulate unrelated work.
Count physical lines, including comments and blanks, in new and materially
rewritten hand-maintained files. Generated artifacts are excluded only when
their generator ownership is explicit and they contain no hand-maintained
behavior.

Use the exact project-wide matrix:

| Category | Preferred maximum | Warning band | Hard reject |
| --- | ---: | ---: | ---: |
| CLI command, NVB TaskHandler/front door, registry, renderer, public barrel | 120 | 121–160 | over 180 |
| Orchestrator, controller, coordinator, presenter | 140 | 141–180 | over 200 |
| Foundation service, planner, validator, adapter, store | 200 | 201–260 | over 300 |
| Contract/type-only module | 240 | 241–320 | over 400 |
| Test/spec module | 300 | 301–420 | over 500 |

Functions target 40 lines, warn at 41–60, and reject above 80. Constructors
target 25 lines, warn at 26–40, and reject above 50. Warning-band owners require
a responsibility inventory and explicit reviewer judgment.

Every module has one primary responsibility and one cohesive reason to change.
Commands and TaskHandlers validate, normalize, delegate, and map results.
Orchestrators sequence collaborators without absorbing their algorithms.
Storage, validation, rendering, subprocess/leaf I/O, and state-machine policy do
not accumulate in one owner. Three independently nameable responsibilities
require a split even below a preferred maximum.

Class-owning TypeScript modules use PascalCase filenames; function/value modules
use lowerCamelCase. New source filenames do not use dashes or underscores.
Generic `helpers`, `utils`, `common`, and `misc` overflow bags are rejected.

Any size exception must be approved before implementation and name the exact
file, proposed maximum, cohesion reason, reviewer, and expiry/follow-up batch.
Existing oversized files are not precedent: when touched they become smaller,
split, or remain line-count neutral under an approved extraction plan.

The implementation report records categorized line counts for every new or
materially rewritten file plus warning-band functions/constructors. The
reviewer reproduces those counts and independently judges cohesion. Passing a
line-count check never overrides the responsibility gate.

# Agent Launch Prompt — Work Batch RT-05

## Required Review Packet

Include: changed files and ownership, line counts, responsibility inventories,
exact proof commands and outcomes, git status, `.local/` not staged.

## Completion And Handoff

Path resolution, workspace discovery, and XDG handling are accepted. RM-06,
RM-07, and RM-08 consume these services. Every path operation fails closed on
escape attempts. The resolved XDG data root path is available for later batches
that stage runtimes or read membership indexes.
