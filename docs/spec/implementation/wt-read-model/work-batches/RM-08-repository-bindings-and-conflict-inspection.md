# Batch RM-08 — Repository bindings and writable conflict inspection

## Synchronized batch execution matrix

- **Accepted-map title:** Repository bindings and writable conflict inspection
- **Dependencies:** `RM-03`, `RM-07`
- **Exclusive ownership/interface:** repository/conflict foundation
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** Canonical bindings; branch/worktree/access checks; claim overlap matrix
- **Implementation report:** `.local/agent-reports/wt-read-model/RM-08-repository-bindings-and-conflict-inspection.md`
- **Review report:** `.local/agent-reports/wt-read-model/reviews/RM-08-repository-bindings-and-conflict-inspection-review.md`
- **Correction report:** `.local/agent-reports/wt-read-model/reviews/corrections/RM-08-repository-bindings-and-conflict-inspection-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ❌ Pending
Phase: Bindings
Depends on: RM-03, RM-07 accepted

**Required implementor reasoning class:** `R4`
**Class rationale:** bindings with conflict detection; the claim overlap matrix spans shared-write, path-conflict, and branch-conflict classes. Wrong classification allows unsafe concurrent writes.

## Objective

Compute canonical bindings. Check branch/worktree/access. Detect claim overlap.
Read only.

## Required Work

1. Create `src/foundation/repositoryBindings.ts`: compute canonical repository bindings
   from `repositories.local.json` and current filesystem state. Validate
   branch, worktree mode (dedicated/shared), and access (read/write).
2. Create `src/foundation/writableConflicts.ts`: detect claim overlap between active
   lanes. Classify conflicts: shared-write (two lanes claim write on same
   worktree without shared override), path-conflict (exclusive-write claims
   overlap), branch-conflict (same worktree, different branches).
3. Write focused specs: canonical binding computation, branch/access/ worktree
   validation, claim overlap matrix (all three classes), dedicated vs shared
   classification, missing/unreadable repository handling.

## Expected Ownership

- `src/foundation/repositoryBindings.ts`, `src/foundation/writableConflicts.ts`
- Respective focused specs.

## Tests And Evidence

- Canonical bindings computed correctly from `repositories.local.json`.
- Branch verification against git HEAD.
- Worktree mode classification: dedicated vs shared.
- Access mode validation: read, write.
- Claim overlap — shared-write: detected and reported.
- Claim overlap — path-conflict: detected and reported.
- Claim overlap — branch-conflict: detected and reported.
- Missing/unreadable repository: error with diagnostic.
- `nvb build` and `nvb test` pass.

## Review Procedure Highlights

1. Verify every conflict class has a focused detection test.
2. Confirm dedicated worktree is the default recommendation.
3. Trace binding computation through path canonicalization.
4. Verify missing repositories produce errors, not null bindings.

## Completion And Handoff

Bindings and conflict inspection are accepted. RM-10 consumes bindings for
status display and conflict warnings. No consumer writes binding data.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **repository/conflict foundation**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-read-model/RM-08-repository-bindings-and-conflict-inspection.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-03`, `RM-07`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Canonical bindings; branch/worktree/access checks; claim overlap matrix**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **repository/conflict foundation** and **Canonical bindings; branch/worktree/access checks; claim overlap matrix**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-read-model/RM-08-repository-bindings-and-conflict-inspection.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
