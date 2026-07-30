# UK-05 Review: Version Reporting And Upgrade Conformance — Review Brief

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

Review batch ID: `UK-05-review`
Reviews work batch: `UK-05` — Version reporting and upgrade conformance
Reviewer reasoning class: R4 (deep repository reasoning — reviewer class is one
level above R3 implementor)

## Review Scope

Independently verify version reporting from all four component sources,
end-to-end upgrade conformance (two-version coexistence, collision, failed
migration), help fragment correctness, and pack documentation closure.

## Governing Specs

- `docs/spec/v1.md` — §10.3, §11.10
- `docs/spec/v1-contracts.md` — §8
- `docs/spec/schemas/v1.schema.json` — `versionReport`

## Review Items

### 1. Source ownership verification

- [ ] `VersionCommand.ts` delegates to foundation services for manifest reading
- [ ] No hardcoded version strings in any source file
- [ ] Help fragments match implemented behavior
- [ ] No product logic in `src/cli.ts`

### 2. Version report components

- [ ] `cliVersion` from `package.json` — independently read and verify
- [ ] `runtimeVersion` from lane's `install.json` when lane selected
- [ ] `knowledgeVersion` from lane's `install.json` when lane selected
- [ ] `schemaVersion` from lane's `lane.json` when lane selected
- [ ] No lane: report highest available staged/packaged versions
- [ ] Lane selected: `availableRuntimes` and `availableKnowledge` arrays present and correct

### 3. Two-version coexistence fixture (independently reproduce)

- [ ] Stage two different runtime versions in the data store
- [ ] `wt version` reports both as available
- [ ] Create a lane bound to version A
- [ ] `wt version --lane=<slug>` reports A as installed, both as available
- [ ] Upgrade lane to version B (`wt upgrade --apply --to=<version-b>`)
- [ ] `wt version --lane=<slug>` reports B as installed, both still available
- [ ] Version A directory remains intact and checksums valid

### 4. Collision fixture (independently reproduce)

- [ ] Create lane, replace a managed-path file with unrecognized content
- [ ] `wt upgrade` preview reports the collision (exit 5)
- [ ] `wt upgrade --apply` refuses with exit 5
- [ ] `install.json` unchanged (compare before and after bytes)
- [ ] Old runtime links still intact

### 5. Failed migration fixture (independently reproduce)

- [ ] Simulate a failing migration step
- [ ] `wt upgrade --apply` invokes migration chain, migration fails
- [ ] Upgrade stops; staging artifacts cleaned
- [ ] Old `install.json` authoritative (compare before and after bytes)
- [ ] Old runtime links intact, checksums valid
- [ ] `wt version --lane=<slug>` still reports old runtime version

### 6. Help fragments

- [ ] `wt help upgrade` renders correct usage, options, and description
- [ ] `wt help skill-install` renders correct usage, options, and description
- [ ] `wt help version` renders correct usage, options, and description
- [ ] All fragments registered in `help/help.json`
- [ ] No scaffold-only content or placeholder text

### 7. JSON output

- [ ] `wt version --json` validates against `versionReport` schema
- [ ] `wt upgrade --json` validates against `upgradePlan` schema
- [ ] `wt upgrade --apply --json` validates against `mutationResult` schema

### 8. Documentation and status

- [ ] `docs/spec/v1.md` §10.3 status markers updated
- [ ] `docs/spec/v1-implementation-map.md` §7 pack status updated if needed
- [ ] Implementation tracker and roadmap updated to ⏳
- [ ] All UK-01 through UK-04 regression passing

### 9. Full test suite

- [ ] `nvb build` passes
- [ ] Full Jasmine suite passes (all UK-01 through UK-05 specs)
- [ ] No spec failures unrelated to this pack

## Acceptance Decision

Accept only when ALL independently verified. This batch is the pack integration
gate. If rejected, create `corrections/UK-05-correction-01.md`.

The reviewer acceptance of UK-05 completes the wt-upgrade-knowledge pack.
After acceptance, update `docs/spec/v1-implementation-map.md` §7 pack status
to ✅ and `docs/spec/v1.md` §10.3 command statuses to ✅.

---
---

# UK-05 Review: Version Reporting And Upgrade Conformance — Agent Launch Prompt

## Recommended agent/model class for forwarding:

**Reasoning level:** R4 — independent verification of integration fixtures
that exercise three foundation modules end-to-end, plus full pack regression.

**Primary suitability:** A reviewer agent capable of independently reproducing
multi-step integration fixtures (two-version coexistence, collision, failed
migration), validating help fragments, and running the complete pack test suite.

**Alternatives:** Any R4-capable agent with integration-testing and
help-verification experience.

**Prohibited final-pass classes:** R1, R2, R3 — reviewer must be R4 because
independent verification of end-to-end upgrade fixtures requires reasoning
about the interaction of UK-01, UK-02, and UK-03 modules.

**Context requirements:** The reviewer needs the complete spec, all five UK
work briefs, all five implementation reports, all changed source files, the
schema bundle, and the full Jasmine test suite.

**Final-authority limits:** The reviewer owns acceptance and commit. This
review completes the pack.

### Complete forwarding profile — mandatory

- **Class:** R4 (review, one level above R3 implementor)
- **Primary models:** any strongest coding agent meeting R4
- **Good alternatives:** any agent with integration testing and help
  verification experience
- **Steering-only tools:** agents that cannot run full test suites or
  validate multiple JSON schemas are unsuitable
- **Prohibited final-pass classes:** R1, R2, R3
- **Context retention:** reviewer must retain all four version component
  sources and all three integration fixture scenarios
- **Final-authority limits:** reviewer owns acceptance and commit; this
  review completes the pack

## Capability-Based Agent Selection Rule

This review requires R4 reasoning because:

- Integration fixtures exercise three foundation modules (UK-01 planner,
  UK-02 migration, UK-03 apply/recovery) end-to-end — independent verification
  requires understanding their interactions
- Two-version coexistence tests both runtime staging and lane binding across
  version changes — a multi-step system scenario
- The reviewer must independently determine whether a fixture failure is
  caused by the UK-05 wiring or a bug in UK-01/UK-02/UK-03
- Help-fragment verification requires checking that documented behavior
  matches implemented behavior exactly

## Context Assignment

You are the independent reviewer for batch UK-05 (Version reporting and
upgrade conformance) in the wt-upgrade-knowledge pack. This is the pack
integration gate. Your acceptance completes the pack. Your rejection of any
fixture blocks the entire wt-upgrade-knowledge delivery. You are the final
gate.

## Read In This Order

1. `AGENTS.md`
2. Pack README, roadmap, tracker, quality rules — 16-item hard-reject checklist
3. `docs/spec/v1.md` — §10.3, §11.5, §11.8, §11.10
4. `docs/spec/v1-contracts.md` — §8
5. `docs/spec/schemas/v1.schema.json` — `versionReport`, `upgradePlan`, `mutationResult`
6. All five UK work briefs (for context on module APIs)
7. All five UK implementation reports
8. All changed source and spec files
9. `help/help.json` and all help fragments

## Your Review Mission

1. Run the 16-item hard-reject checklist first. Stop on any "yes."
2. Independently verify all four version components from source files.
3. Independently reproduce the two-version coexistence fixture end-to-end.
4. Independently reproduce the collision fixture: verify no mutation occurred.
5. Independently reproduce the failed-migration fixture: verify recovery.
6. Independently verify all three help fragments render correctly.
7. Independently validate all three JSON output formats against schemas.
8. Run the complete Jasmine suite; verify no regression in UK-01–UK-04 specs.
9. Verify `nvb build` passes.
10. Audit `docs/spec/v1.md` §10.3 and `docs/spec/v1-implementation-map.md` §7
    for correct status.

## What You Must Not Do

- Trust the implementation report's fixture results without independent
  reproduction
- Accept a batch where any version component is hardcoded
- Accept a batch where a fixture fails but the code is otherwise "correct"
- Accept a batch where help fragments describe behavior not implemented
- Accept a batch with spec-status markers stale or incorrect
- Accept a batch with UK-01–UK-04 regression failures

## Required Independent Proof

- Version report with and without lane: all four components independently verified
- Two-version coexistence fixture fully reproduced
- Collision fixture: no-mutation verified by byte comparison of install.json
- Failed-migration fixture: recovery verified, old runtime usable
- All three help fragments rendered and checked
- `versionReport`, `upgradePlan`, `mutationResult` JSON validated against schemas
- Complete Jasmine suite passes
- `nvb build` passes

## Acceptance Gate

- [ ] Hard-reject checklist: zero "yes"
- [ ] All version components from source files, not hardcoded
- [ ] Two-version coexistence fixture independently reproduced
- [ ] Collision fixture independently reproduced; no mutation confirmed
- [ ] Failed-migration fixture independently reproduced; recovery confirmed
- [ ] All help fragments correct
- [ ] All JSON outputs validate against schemas
- [ ] Full Jasmine suite passes (UK-01 through UK-05)
- [ ] `nvb build` passes
- [ ] Spec-status markers updated correctly
- [ ] Tracker and roadmap updated to ✅

## Required Disk Report

Write a complete independent review report at `.local/agent-reports/wt-upgrade-knowledge/reviews/UK-05-review-version-reporting-and-upgrade-conformance.md`
containing: every fixture verification result, version-component verification,
help-fragment verification, schema-validation results, full test-suite output,
spec-status audit, and final pack-completion verdict.

## Pack Completion Handoff

If accepting, the report must also serve as the pack completion handoff:
- Summarize the pack's delivered capabilities
- List any known limitations or deferred items
- Note the acceptance commits for all five batches
- Confirm the pack exit product: operators can preview and apply compatible
  managed upgrades and install matching knowledge adapters without overwriting
  lane-owned data.
