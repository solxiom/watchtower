# Batch RM-03 — Canonical paths and workspace resolution

## Synchronized batch execution matrix

- **Accepted-map title:** Canonical paths and workspace resolution
- **Dependencies:** `RM-01`
- **Exclusive ownership/interface:** path/workspace foundation
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** Resolution precedence; symlink/case/path-escape fixtures; missing explicit workspace
- **Implementation report:** `.local/agent-reports/wt-read-model/RM-03-canonical-paths-and-workspace-resolution.md`
- **Review report:** `.local/agent-reports/wt-read-model/reviews/RM-03-canonical-paths-and-workspace-resolution-review.md`
- **Correction report:** `.local/agent-reports/wt-read-model/reviews/corrections/RM-03-canonical-paths-and-workspace-resolution-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ✅ Accepted after correction 03
Correction: `../review-batches/corrections/RM-03-correction-03.md`
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

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **path/workspace foundation**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-read-model/RM-03-canonical-paths-and-workspace-resolution.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-01`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Resolution precedence; symlink/case/path-escape fixtures; missing explicit workspace**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **path/workspace foundation** and **Resolution precedence; symlink/case/path-escape fixtures; missing explicit workspace**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-read-model/RM-03-canonical-paths-and-workspace-resolution.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
