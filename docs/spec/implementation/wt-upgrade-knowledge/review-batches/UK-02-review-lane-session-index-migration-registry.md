# UK-02 Review: Lane/Session/Index Migration Registry — Review Brief

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

Review batch ID: `UK-02-review`
Reviews work batch: `UK-02` — Lane/session/index migration registry
Reviewer reasoning class: R5 (highest available reasoning)

## Review Scope

Independently verify that migration steps preserve every lane-owned artifact
class, that session indexes are correctly rebuilt from source journals, and
that no step executes runtime actions, closes sessions, or prunes content.

## Governing Specs

- `docs/spec/v1.md` — §11.5, §6, §7.3, §7.4, §13
- `docs/spec/v1-contracts.md` — §9, §11
- `docs/spec/schemas/v1.schema.json`

## Review Items

### 1. Source ownership verification

- [ ] `MigrationRegistry.ts` owns step registration and chain resolution
- [ ] `migrationSteps.ts` owns individual step implementations
- [ ] No migration logic in `UpgradeCommand.ts`
- [ ] No product logic in `src/cli.ts`

### 2. Artifact preservation (verify independently for each class)

- [ ] `lane.config.env` — byte-identical after migration
- [ ] `repositories.local.json` — byte-identical, all fields preserved including unknown
- [ ] `lane.json` — only `schemaVersion` may change; all operator fields unchanged
- [ ] `install.json` — only version fields changed; `managedAssets` map intact
- [ ] Operator sessions — all turn text, IDs, lifecycle states preserved
- [ ] Session pins — pin references remain valid; pinned turns exist in journal
- [ ] Scoped holds — identity, scope, expiry, reason preserved
- [ ] Amendment requests — identity and handoff evidence preserved
- [ ] Budget grants — identity, amount, expiry preserved
- [ ] Lane state — lifecycle state, active batch preserved
- [ ] Coordinator journal — all events with original IDs, sequences, timestamps
- [ ] Effect journal — all records preserved

### 3. Session-index rebuild correctness

- [ ] Independently rebuild session indexes from source journals
- [ ] Compare independently rebuilt index with migration output — must be truth-equivalent
- [ ] Verify no turn is lost in the rebuild

### 4. Policy-baseline migration

- [ ] Operator-set limits, reserves, profiles, retention values unchanged
- [ ] Schema-version fields updated correctly
- [ ] Migrated baseline is truth-equivalent to freshly generated baseline from source

### 5. Negative-path verification

- [ ] Missing intermediate step produces deterministic error
- [ ] No runtime action executed during any step (zero subprocess spawns)
- [ ] No session lifecycle changed (open sessions remain open, closed remain closed)
- [ ] No content pruned (all session bytes survive)
- [ ] Memory usage bounded (no full-history preload)
- [ ] Chain composition correctness: multi-step migration preserves all classes

### 6. Proof independence

- [ ] Rerun all Jasmine specs independently
- [ ] Verify each preservation spec uses byte comparison, not field-level assumptions
- [ ] Verify session-index rebuild spec compares against independently built index
- [ ] Verify migration-step isolation (each step tested independently)

### 7. Documentation and status

- [ ] Implementation report exists and complete
- [ ] Tracker and roadmap updated
- [ ] No `.local/` artifacts staged or committed

## Acceptance Decision

Accept only when:
- All twelve artifact classes independently verified as preserved
- Session-index rebuild independently verified as truth-equivalent
- Policy-baseline operator values unchanged
- No runtime execution, session closure, or content pruning during any step
- All Jasmine specs pass independently
- `nvb build` passes

If rejected, create `corrections/UK-02-correction-01.md`.

---
---

# UK-02 Review: Lane/Session/Index Migration Registry — Agent Launch Prompt

## Recommended agent/model class for forwarding:

**Reasoning level:** R5 — independent verification of twelve artifact-class
preservation proofs, session-index rebuild correctness, and multi-step
state-machine interactions.

**Primary suitability:** A reviewer agent capable of performing byte-exact
file comparisons, independently rebuilding index structures from source
data, and verifying that no runtime execution or content mutation occurs
during any migration step.

**Alternatives:** None. R5 is required. The breadth of artifact classes and
the need for independent index-rebuild verification exceed R4 capacity.

**Steering-only tools:** Agents that cannot perform byte-level file comparison
or independently build index structures from source journals are unsuitable.

**Prohibited final-pass classes:** R1, R2, R3, R4

**Context requirements:** The reviewer needs the complete spec, the UK-02 work
brief, the implementation report, the changed source, the lane directory
layout documentation, and the pack quality rules.

**Final-authority limits:** The reviewer owns acceptance and commit.

### Complete forwarding profile — mandatory

- **Class:** R5 (review, one level above R5 implementor)
- **Primary models:** any strongest coding agent meeting R5
- **Good alternatives:** any agent with data-integrity verification and
  index-rebuild experience
- **Steering-only tools:** agents that cannot perform byte-exact file
  comparison are unsuitable
- **Prohibited final-pass classes:** R1, R2, R3, R4
- **Context retention:** reviewer must retain all twelve artifact classes
  and their preservation rules
- **Final-authority limits:** reviewer owns acceptance and commit

## Capability-Based Agent Selection Rule

This review requires R5 reasoning because:

- Twelve distinct artifact classes each require independent preservation
  verification — a missed class corrupts operator data silently
- Session-index rebuild from source journals requires independently rebuilding
  the index to verify the migration output is truth-equivalent
- Policy-baseline migration must preserve operator-set numeric values while
  updating schema fields — value corruption is catastrophic
- Multi-step chain composition must be proven correct for all supported
  version paths

## Context Assignment

You are the independent reviewer for batch UK-02 (Lane/session/index migration
registry) in the wt-upgrade-knowledge pack. You must independently verify every
preservation claim. A single missed artifact class or corrupted operator value
that passes your review becomes permanent data loss. You are the gate.

## Read In This Order

1. `AGENTS.md`
2. `docs/spec/implementation/wt-upgrade-knowledge/README.md`
3. `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md`
4. `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md`
5. `docs/spec/implementation/wt-upgrade-knowledge/implementation-quality-and-agent-rules.md` — 16-item hard-reject checklist
6. `docs/spec/v1.md` — §11.5, §6, §7.3, §7.4, §7.2, §13
7. `docs/spec/v1-contracts.md` — §9, §11
8. UK-02 work brief and implementation report
9. All changed source and spec files

## Reasoning / Reviewer Class

- **Class:** R5
- **Primary suitability:** independent verification of twelve artifact-class
  preservation, session-index rebuild correctness, policy-baseline migration
  integrity, and negative-path isolation
- **Primary models:** any strongest coding agent meeting R5
- **Good alternatives:** any agent with data-integrity and index-rebuild
  verification experience
- **Steering-only tools:** agents that cannot perform byte-exact comparisons
  are unsuitable
- **Prohibited final-pass classes:** R1, R2, R3, R4
- **Context retention:** reviewer must retain all preservation rules
- **Final-authority limits:** reviewer owns acceptance and commit

## Mandatory Reasoning Protocol

1. **Dependency map**: enumerate all artifact classes and their file paths.
   Verify each is covered by a preservation test.
2. **Inspect source**: read every migration step function. Trace each to
   verify it is pure (no subprocess, no network, no session lifecycle call).
3. **Invariants**: verify: (a) `diff` shows zero changes to lane-owned files;
   (b) session-index rebuild output matches independent rebuild;
   (c) no `child_process` import in migrationSteps.ts.
4. **Counterexamples**: for at least three artifact classes, design a
   counterexample that would break preservation (e.g., changing key order in
   JSON, truncating a journal line). Verify the test catches it.
5. **Spec disagreements**: if v1.md says preserve "operator values" but the
   implementation re-serializes JSON (potentially changing key order or
   whitespace), flag it.
6. **Predecessor reports**: UK-01 accepted report may note the current schema
   version format. Verify migration steps match.

## Your Review Mission

1. Run the 16-item hard-reject checklist first. Stop on any "yes."
2. Independently run every Jasmine spec.
3. For each artifact class: independently verify preservation using `diff`,
   `cmp`, or byte-comparison utilities.
4. Independently rebuild session indexes from source journals. Compare to
   migration output.
5. Independently verify policy-baseline operator values unchanged.
6. Verify zero `child_process` or equivalent imports in `migrationSteps.ts`.
7. Verify no session lifecycle changes during any step.
8. Verify `nvb build` passes independently.

## What You Must Not Do

- Trust the implementation report's preservation claims without independent
  byte comparison
- Accept a batch where any artifact class preservation is unverified
- Accept a batch where migration steps execute runtime actions
- Accept a batch where sessions are closed or content is pruned
- Accept a batch with the hard-reject checklist violated

## Required Independent Proof

- Run all Jasmine specs independently; record output
- Byte-comparison proof for config and bindings
- Field-level verification for markers and manifests
- Independent session-index rebuild and comparison
- Policy-baseline operator-value verification
- Negative proof: no runtime execution, no session closure, no content pruning
- `nvb build` passes

## Acceptance Gate

The batch is accepted only when ALL pass independently:
- [ ] Hard-reject checklist: zero "yes" answers
- [ ] All Jasmine specs pass on independent run
- [ ] All twelve artifact classes independently verified as preserved
- [ ] Session-index rebuild truth-equivalent to independent rebuild
- [ ] Policy-baseline operator values unchanged
- [ ] No runtime execution, session closure, or content pruning
- [ ] `nvb build` passes
- [ ] Tracker and roadmap updated
- [ ] No `.local/` or build artifacts staged

## Rejection Correction Brief Rule

If rejecting, create `corrections/UK-02-correction-01.md`.

## Required Disk Report

Write a complete independent review report at `.local/agent-reports/wt-upgrade-knowledge/reviews/UK-02-review-lane-session-index-migration-registry.md`.
