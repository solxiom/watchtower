# Review Batch CA-09 — Typed Proposals and Current-State Validator

Status: ⏳ Awaiting review
Reasoning: `R5`
Paired work brief: `work-batches/CA-09-typed-proposals-and-current-state-validator.md`
Implementation report: `.local/agent-reports/coordinator-automation/CA-09-typed-proposals-and-current-state-validator.md`

## Scope Verification

- [ ] `src/contracts/proposals.ts` created with all 11 proposal types and discriminated union
- [ ] `src/foundation/proposal-validator.ts` created with `ProposalValidator`
- [ ] All 12 validation preconditions implemented
- [ ] Permitted origin/class/effect enforcement per proposal type
- [ ] Stale state invalidates
- [ ] Idempotency key prevents double-commit
- [ ] Failed proposals recorded, never partially applied

## Required Independent Proof

1. Independently enumerate all 11 proposal types from `v1-contracts.md §5`. Verify each has a valid, invalid, stale, illegal-transition, and idempotency-conflict fixture.
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
- All 11 proposal types have valid and invalid fixtures.
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
