# Review Batch LC-05 — Coordinator Session Baselines and Pack Index

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
Paired work brief: `work-batches/LC-05-coordinator-session-baselines-and-pack-index.md`
Implementation report: `.local/agent-reports/wt-lane-lifecycle/LC-05-coordinator-session-baselines-and-pack-index.md`

## Scope Verification

- [ ] `src/foundation/CoordinatorBaseline.ts` created with finite policy seeding, correct provenance markers, and deterministic output
- [ ] `src/foundation/PackIndexBootstrap.ts` created with sealed index construction, deterministic reproduction, and seal matching
- [ ] Shipping-policy baseline seed: exact values from v1-contracts.md §7
- [ ] Routing policy baseline seed: every rule from v1-contracts.md §4, all 15 rules present
- [ ] Operator-session policy baseline seed: all defaults present
- [ ] Provenance markers reference correct spec sections
- [ ] Sealed pack index build: matches active pack seal digest
- [ ] Deterministic reproduction: two independent builds produce identical index bytes
- [ ] No full-pack fallback path
- [ ] No model invocation
- [ ] No product logic in `src/cli.ts`

## Required Independent Proof

1. **Shipping-policy baseline**: extract the seeded values. Compare against v1-contracts.md §7. Every value must match exactly. No invented defaults. No missing required keys. No extra keys not in the contract.
2. **Routing policy baseline**: verify all 15 routing rules from v1-contracts.md §4 are present. Each rule must have: rule ID, capability floor, classification, and route. Verify rule order is preserved. Verify no extra rules beyond the contract.
3. **Operator-session policy baseline**: verify all defaults from v1-contracts.md operator-session section are present. Verify session count limits, turn budgets, and hold constraints match.
4. **Provenance markers**: each policy file must include a `_provenance` field or equivalent marker referencing the exact spec section and version from which the policy was derived. Verify every provenance reference is correct.
5. **Sealed pack index build**: build the pack index from a known-good pack. Verify the index seal matches the active pack seal. Verify index entries for every pack file with correct paths, digests, and byte counts.
6. **Deterministic reproduction**: build the index twice from the same pack. Verify byte-for-byte identical output (same SHA-256 of index file). Verify no timestamp, process ID, or random value appears in the output.
7. **Model-free verification**: search all source code, imports, and function bodies in `CoordinatorBaseline.ts` and `PackIndexBootstrap.ts`. Verify zero model imports or invocations.
8. **No full-pack fallback**: search code paths for any condition where a full-pack scan replaces the sealed index. Verify no such fallback exists.
9. **Seal mismatch rejection**: build an index with a seal that does NOT match the pack seal. Verify the index construction rejects the mismatch.
10. **Index tampering resistance**: verify the index digest is deterministic — any change to pack content produces a different digest. Verify index validation catches digest mismatch.
11. Run `nvb build` and `nvb test` independently. Confirm focused specs pass.

## Required Reasoning Posture

The reviewer must independently verify every seeded policy value against the
contracts. Seed correctness is the foundation for all later coordinator behavior
— a single wrong default or missing rule cascades into incorrect routing
decisions. Verify deterministic reproduction — the index must be absolutely
identical across rebuilds. Prove that no model invocation or full-pack fallback
exists in any code path.

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

The review report must include: independently rerun proof commands and outcomes,
policy seed verification table (every key/value against contract reference),
deterministic reproduction evidence (hash before/after rebuild), model-free audit
results, structural verification results, line-count verification, tracker/roadmap
sync status, and the acceptance or rejection decision.

## Acceptance Gate

- All hard-reject checklist items are clear.
- Every policy value matches the contract exactly.
- All 15 routing rules seeded correctly.
- Provenance markers reference correct spec sections.
- Pack index seal matches active pack seal.
- Index builds are byte-for-byte identical across rebuilds.
- Zero model invocations.
- No full-pack fallback path.
- `nvb build` and `nvb test` pass with zero failures.
- Tracker and roadmap updated.
- No `.local/` artifacts staged.

## Reject Conditions

- Any policy value that does not match the contract.
- Missing routing rule.
- Incorrect routing rule order.
- Non-deterministic index output (timestamps, PIDs, random values).
- Model invocation for policy seeding or index construction.
- Full-pack fallback when index is available or should be built.
- Index seal mismatch silently accepted.
- Missing provenance markers.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.
