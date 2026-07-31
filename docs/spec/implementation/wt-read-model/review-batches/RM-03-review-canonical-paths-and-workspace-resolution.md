# Review Batch RM-03 — Canonical paths and workspace resolution

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

Status: ⏳ Awaiting review
Reasoning: `R4`
Paired work brief: `work-batches/RM-03-canonical-paths-and-workspace-resolution.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-03-canonical-paths-and-workspace-resolution.md`

## Scope Verification

- [ ] `src/foundation/dataHomeResolver.ts` created with `resolveWatchtowerDataHome`, `validateWatchtowerDataHome`
- [ ] `src/foundation/workspaceResolver.ts` created with `resolveWorkspace`, `resolveRepositoryRoot`
- [ ] `src/foundation/canonicalPaths.ts` created with `canonicalizePath`, `isPathSafe`, `buildLanePath`, `buildLaneFilePath`

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

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **path/workspace foundation**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-read-model/reviews/RM-03-canonical-paths-and-workspace-resolution-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-01`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Resolution precedence; symlink/case/path-escape fixtures; missing explicit workspace**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **path/workspace foundation** and **Resolution precedence; symlink/case/path-escape fixtures; missing explicit workspace**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-read-model/reviews/corrections/RM-03-canonical-paths-and-workspace-resolution-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-read-model/reviews/RM-03-canonical-paths-and-workspace-resolution-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
