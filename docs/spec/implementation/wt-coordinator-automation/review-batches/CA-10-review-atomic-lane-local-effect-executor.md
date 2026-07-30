# Review Batch CA-10 — Atomic Lane-Local Effect Executor

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

Status: ⏳ Awaiting review
Reasoning: `R5`
Paired work brief: `work-batches/CA-10-atomic-lane-local-effect-executor.md`
Implementation report: `.local/agent-reports/coordinator-automation/CA-10-atomic-lane-local-effect-executor.md`

## Scope Verification

- [ ] `src/foundation/EffectPlan.ts` created with `EffectPlanner`
- [ ] `src/foundation/EffectExecutor.ts` created with `EffectExecutor`
- [ ] Complete effect registry matching `v1-contracts.md §5`
- [ ] Lock acquisition before any mutation
- [ ] Current-state revalidation before commit
- [ ] Idempotency key verification
- [ ] All-or-nothing execution with rollback on partial failure
- [ ] External effects use prepare/attempt/verify journal states
- [ ] Effect preview without mutation
- [ ] No raw mutation commands exposed through public CLI

## Mandatory Task-Boundary Proof

Independently verify that mutating packaged TaskHandlers are reachable only from
the sole executor through a CA-10 single-use invocation envelope. Reproduce
forged, expired, reused, wrong-action/effect, stale-snapshot, tampered, and
concurrent-double-consumption failures. Verify the envelope contains no
arbitrary task/config/module/path/command/environment and structured NVB
events/results remain attempt evidence rather than authority or journal truth.

## Required Independent Proof

1. Test lock acquisition: two concurrent effect attempts → second is blocked until first completes.
2. Test lock release: after completion or rollback, lock is released.
3. Test current-state revalidation: validate proposal, change lane state externally, attempt effect → rejected.
4. Test idempotency key: execute effect with key X, retry with same key X → rejected.
5. Test all-or-nothing: execute effect plan with 3 effects; fail the 2nd → all lane-local effects rolled back, external effects not attempted.
6. Test lane-local atomic commit: all effects succeed → projections and journals updated atomically.
7. Test external-effect journal: tmux launch effect → prepare recorded, attempt recorded, verify recorded. Verify recovery reads journal rather than repeating unknown effect.
8. Test crash recovery: simulate crash during effect execution → restart → recovery reads journal and determines next safe action.
9. Test effect preview: `previewEffectPlan` produces correct human-readable output without any mutation.
10. Verify the public CLI has no `wt state set` or arbitrary mutation commands.
11. Run `nvb build` and `nvb test`. Record output.
12. Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

- All hard-reject checklist items are clear.
- Exactly one effect authority for a lane (lock enforces).
- Current-state revalidation blocks stale effects.
- Idempotency keys prevent duplicate execution.
- All-or-nothing: partial failure → complete lane-local rollback.
- External effects have prepare/attempt/verify journals.
- Crash recovery reads journal, never repeats unknown effects.
- No raw mutation commands in public CLI.
- `nvb build` and `nvb test` pass.
- Tracker and roadmap updated.

## Reject Conditions

- Concurrent mutation allowed (lock bypass).
- Stale state not detected before commit.
- Idempotency key not enforced.
- Partial failure leaves lane-local state partially mutated.
- External effect executed without prepare/attempt/verify journal.
- Crash recovery repeats an unknown effect.
- Raw mutation command exposed in CLI.
- Stale tracker/roadmap.
- Implementation agent committed changes.
