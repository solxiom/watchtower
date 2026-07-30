# Agent Launch Prompt — Review Batch LC-05

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6` with high-reasoning configuration, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high for policy seeding verification, provenance traceability, deterministic index construction, and seal validation`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6` with high-reasoning configuration, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying every seeded policy value against the
contracts, proving deterministic index reproduction, and confirming no model
or full-pack fallback exists. The reviewer must be capable of byte-level
diff verification across rebuilds.

You are assigned **review batch LC-05** for the Watchtower v1 wt-lane-lifecycle
delivery lane. You are the independent acceptance authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-lane-lifecycle/review-batches/LC-05-review-coordinator-session-baselines-and-pack-index.md`
2. `docs/spec/implementation/wt-lane-lifecycle/review-batches/README.md`
3. `docs/spec/implementation/wt-lane-lifecycle/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-lane-lifecycle/work-batches/LC-05-coordinator-session-baselines-and-pack-index.md` (paired work brief)
5. `.local/agent-reports/wt-lane-lifecycle/LC-05-coordinator-session-baselines-and-pack-index.md` (implementation report)
6. `docs/spec/v1-contracts.md` — §7 (shipping policy), §4 (routing policy — all 15 rules), operator-session policy defaults
7. `docs/spec/v1.md` — §9 (coordinator baselines), §10 (pack index)
8. `docs/spec/implementation/wt-lane-lifecycle/implementation-quality-and-agent-rules.md`
9. the actual changed source files:
    - `src/foundation/coordinator-baseline.ts`
    - `src/foundation/pack-index-bootstrap.ts`
    - `spec/foundation/coordinator-baseline.spec.ts`
    - `spec/foundation/pack-index-bootstrap.spec.ts`

## Your Review Mission

Independently verify that policy baselines are correctly seeded, pack indexes
are deterministically built, and no model or full-pack fallback exists:

1. **Shipping-policy seed audit**: extract every seeded key and value from the shipping-policy baseline. Compare against v1-contracts.md §7. Every value must match exactly. Verify no extra keys. Verify no missing required keys. Document any deviation.
2. **Routing policy seed audit**: enumerate all 15 routing rules from v1-contracts.md §4. For each rule, verify: rule ID, capability floor, classification, and route. Verify rule order matches the contract — routing is first-match, so order matters. Verify no extra rules beyond the contract.
3. **Operator-session policy seed audit**: verify all defaults from the operator-session contract are present. Verify session count limits, turn budgets, hold constraints, and timeout defaults match exactly.
4. **Provenance marker audit**: each policy file must reference the exact spec section and version from which the policy was derived. Verify every provenance reference is correct. Verify provenance markers are structured consistently.
5. **Pack index — seal matching**: build the pack index from a known-good pack. Verify the index seal digest matches the active pack seal. Verify every sealed file entry in the index has a correct path, digest, and byte count.
6. **Pack index — deterministic reproduction**: build the index twice from the same pack (clean between builds). Compute SHA-256 of both index outputs. Verify they are byte-for-byte identical. Verify no timestamp, process ID, random value, or nondeterministic ordering appears.
7. **Model-free audit**: search `coordinator-baseline.ts` and `pack-index-bootstrap.ts` for any model import or invocation. Search for `ai`, `model`, `llm`, `gpt`, `claude`, `openai`, `anthropic`, and similar strings in source and dependencies. Verify zero results.
8. **Full-pack fallback audit**: search code paths for conditions where a full-pack scan is used instead of or in addition to the sealed index. Verify such fallback does not exist — the index is the sole authority.
9. **Seal mismatch rejection**: attempt to build an index with a seal that does NOT match the pack seal. Verify rejection with clear error.
10. **Hard-reject checklist**: run the quality-and-agent-rules reviewer hard-reject checklist. Reject immediately if any item flags.
11. **Build and test**: run `nvb build` and `nvb test` independently. Record exact output.

## What You Must Not Do

- Do not trust the implementation report; rerun every proof independently.
- Do not accept if any policy value differs from the contract.
- Do not accept if index builds are not byte-for-byte identical.
- Do not accept if model invocation or full-pack fallback exists.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`. Record output.
- Independently compare every seeded policy value against the contracts.
- Independently build the index twice and verify byte-identical output.
- Independently search for model invocations and full-pack fallback paths.
- Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

The batch is accepted only when:
- All hard-reject checklist items are clear.
- Every policy value matches the contract exactly.
- All 15 routing rules seeded with correct order.
- Provenance markers reference correct spec sections.
- Pack index seal matches active seal.
- Index builds are byte-for-byte identical across rebuilds.
- Zero model invocations.
- No full-pack fallback path.
- Build and tests pass independently.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Rejection Correction Brief Rule

If rejected, create a numbered correction brief in
`review-batches/corrections/LC-05-correction-01.md` with exact required fixes.
The correction brief must include: rejection reasons with source locations,
expected corrected state, required additional proof, exact files to change,
and reference to this review.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

After acceptance or rejection, update:
- `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
- `docs/spec/implementation/wt-lane-lifecycle/implementation-roadmap.md`

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`

## Non-Negotiable Rules

- the reviewer is the acceptance authority; independent proof is mandatory
- accept only when all criteria are satisfied
- if rejecting, create a correction brief with exact required fixes
- do not add `.local` artifacts to git
- the reviewer owns the acceptance commit; the implementation agent never commits
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one review report to:
- `.local/agent-reports/wt-lane-lifecycle/reviews/LC-05-coordinator-session-baselines-and-pack-index-review.md`

Include: documents studied, independent proof reruns and outcomes, policy seed
verification table (every value against contract reference), routing rule
verification table (all 15 rules), deterministic reproduction evidence (SHA-256
before/after rebuild), model-free and fallback-free audit results, structural
verification, acceptance/rejection decision, final git status, and if accepting,
create the acceptance commit with a descriptive message.

## If accepted, create the acceptance commit

The acceptance commit message should follow the pattern:
```
LC-05: Coordinator/session baselines and initial pack index accepted

[one-paragraph summary of what was verified and the key outcomes]
```

## Always plan and make task lists

## Leave a helpful handoff message for the next reviewer

Record the acceptance outcome, verified policy seeds and routing rules,
deterministic index proof, and any limitations noted. Confirm that LC-06
may now be reviewed (LC-05 accepted) and that LC-07 is partially unblocked.
