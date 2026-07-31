# Review Batch CA-04 — Ready set and resource-claim projection

## Synchronized batch execution matrix

- **Accepted-map title:** Ready set and resource-claim projection
- **Dependencies:** `RM-08`, `CA-01`, `CA-03`
- **Exclusive ownership/interface:** scheduling projection
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory batch proof:** DAG/dependency/claim/capacity blockers; no arbitrary winner
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-04-ready-set-and-resource-claim-projection.md`
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-04-ready-set-and-resource-claim-projection-review.md`
- **Correction report:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-04-ready-set-and-resource-claim-projection-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ⏳ Awaiting review
Reasoning: `R5`
Paired work brief: `work-batches/CA-04-ready-set-and-resource-claim-projection.md`
Implementation report: `.local/agent-reports/coordinator-automation/CA-04-ready-set-and-resource-claim-projection.md`

## Scope Verification

- [ ] `src/foundation/ResourceClaims.ts` created with `ResourceClaimStore`, `evaluateClaimConflict`, `registerBatchClaims`, `checkWorktreeConflict`, `checkWritableOverlap`
- [ ] `src/foundation/ReadySet.ts` created with `computeReadySet`
- [ ] Ready-set formula: pending batch + all deps accepted + pack baseline admissible + claims non-conflicting + endpoint route active + capacity reserved = ready candidate
- [ ] No arbitrary winner selection when multiple candidates are ready
- [ ] All claim conflict kinds detected: worktree, branch, path, capacity
- [ ] Entirely model-free

## Required Independent Proof

1. Independently compute ready set from a 30-batch fixture pack. Verify correct ready candidates.
2. Verify all dependency blockers correctly identified.
3. Verify worktree conflict detection for shared-write, branch, and path overlap.
4. Verify capacity blockers when no eligible endpoint available.
5. Prove deterministic output: same inputs → identical `ReadySetResult`.
6. Prove no arbitrary winner: multiple ready candidates → all reported individually.
7. Run `nvb build` and `nvb test`. Record output.
8. Verify no model/AI imports.
9. Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

- All hard-reject checklist items are clear.
- Ready set correctly computed for all fixture scenarios.
- No arbitrary winner selection.
- Every blocker has a specific kind and source reference.
- Deterministic output from identical inputs.
- `nvb build` and `nvb test` pass with zero failures.
- Tracker and roadmap updated.

## Reject Conditions

- Arbitrary winner selection (implementation accident as policy).
- Non-deterministic output.
- Missing blocker classification.
- Model/AI imports.
- Stale tracker/roadmap.
- Implementation agent committed changes.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **scheduling projection**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/reviews/CA-04-ready-set-and-resource-claim-projection-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-08`, `CA-01`, `CA-03`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **DAG/dependency/claim/capacity blockers; no arbitrary winner**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **scheduling projection** and **DAG/dependency/claim/capacity blockers; no arbitrary winner**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-04-ready-set-and-resource-claim-projection-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-coordinator-automation/reviews/CA-04-ready-set-and-resource-claim-projection-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
