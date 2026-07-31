# Review Batch CA-09 — Typed proposals and current-state validator

## Synchronized batch execution matrix

- **Accepted-map title:** Typed proposals and current-state validator
- **Dependencies:** `CA-05`, `CA-07`, `CA-08`
- **Exclusive ownership/interface:** proposal contracts/validator
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory batch proof:** All 14 proposal types; specification-resolution authority/seal/independence checks; stale/illegal/invalid cases
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-09-typed-proposals-and-current-state-validator.md`
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-09-typed-proposals-and-current-state-validator-review.md`
- **Correction report:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-09-typed-proposals-and-current-state-validator-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ⏳ Awaiting review
Reasoning: `R5`
Paired work brief: `work-batches/CA-09-typed-proposals-and-current-state-validator.md`
Implementation report: `.local/agent-reports/coordinator-automation/CA-09-typed-proposals-and-current-state-validator.md`

## Scope Verification

- [ ] `src/contracts/proposals.ts` created with all 14 proposal types and discriminated union
- [ ] `src/foundation/ProposalValidator.ts` created with `ProposalValidator`
- [ ] All 12 validation preconditions implemented
- [ ] Permitted origin/class/effect enforcement per proposal type
- [ ] Stale state invalidates
- [ ] Idempotency key prevents double-commit
- [ ] Failed proposals recorded, never partially applied

## Required Independent Proof

1. Independently enumerate all 14 proposal types from `v1-contracts.md §5`. Verify each has a valid, invalid, stale, illegal-transition, and idempotency-conflict fixture.
2. Test `select-ready-batch`: valid selection from ready set, invalid batch not in ready set, stale (state changed), wrong class origin.
3. Test `classify-reject`: valid classification, invalid classification, stale state.
4. Test `open-correction`: valid with preserve-session, invalid target batch, stale.
5. Test `escalate`: valid escalation, invalid reason, stale.
6. Test idempotency: submit equivalent proposal twice → second rejected with idempotency key conflict.
7. Test stale state: validate proposal, change lane state, re-validate → rejected.
8. Test illegal transition: propose effect not in the permitted mapped effects for the proposal type → rejected.
9. Test reviewer independence: proposal that would weaken reviewer independence → rejected.
10. Test all preconditions independently: verify each of the 12 checks can independently reject.
11. Verify failed proposals are recorded with reason codes and never partially applied.
12. Run `nvb build` and `nvb test`. Record output.
13. Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

- All hard-reject checklist items are clear.
- All 14 proposal types have valid and invalid fixtures.
- Permitted origin/class/effect enforced.
- Stale state invalidates proposals.
- Idempotency keys prevent double-commit.
- Failed proposals recorded, never partially applied.
- `nvb build` and `nvb test` pass.
- Tracker and roadmap updated.

## Reject Conditions

- Proposal type missing from registry.
- Validation bypass (partial validation, missing precondition check).
- Stale state not detected.
- Idempotency key not enforced.
- Failed proposal partially applied.
- Stale tracker/roadmap.
- Implementation agent committed changes.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **proposal contracts/validator**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/reviews/CA-09-typed-proposals-and-current-state-validator-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`CA-05`, `CA-07`, `CA-08`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **All 14 proposal types; specification-resolution authority/seal/independence checks; stale/illegal/invalid cases**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **proposal contracts/validator** and **All 14 proposal types; specification-resolution authority/seal/independence checks; stale/illegal/invalid cases**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-09-typed-proposals-and-current-state-validator-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-coordinator-automation/reviews/CA-09-typed-proposals-and-current-state-validator-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
