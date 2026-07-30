# UK-02: Lane/Session/Index Migration Registry — Work Brief

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

Batch ID: `UK-02`
Pack: `wt-upgrade-knowledge` (pack 4 of 6)
Reasoning class: R5 (highest available reasoning)
Depends on: UK-01 (upgrade compatibility planner) accepted, LC-05 (coordinator/session baselines) accepted

## Scope

Implement a pure version-steps migration registry that transforms lane schema,
session indexes, and policy baselines across version boundaries while
preserving every lane-owned value and historical artifact.

## Governing Specs

- `docs/spec/v1.md` — §11.5 (upgrade migration requirements), §6 (ownership model classes), §7.3 (lane marker schema), §7.4 (local repository bindings)
- `docs/spec/v1-contracts.md` — §11 (locking, transactions, and recovery)
- `docs/spec/schemas/v1.schema.json`

## Files Owned By This Batch

- `src/foundation/MigrationRegistry.ts` — NEW: version-step registry, dependency ordering, step composition
- `src/foundation/MigrationSteps.ts` — NEW: individual migration step implementations for v1 schema versions
- `spec/basic/migration-registry.spec.ts` — NEW: unit and integration specs

## What Migration Steps Must Preserve

Every migration step must leave these artifacts byte-identical or truth-equivalent:

| Artifact class | Source | Preservation rule |
|---------------|--------|-------------------|
| Lane config | `lane.config.env` | Byte-identical; never re-format or re-serialize |
| Repository bindings | `repositories.local.json` | Byte-identical; preserve all fields including unknown |
| Lane marker | `lane.json` | Schema version field may advance; all operator-set fields preserved; unknown fields preserved |
| Install manifest | `install.json` | Update version fields only (cliVersion, runtimeVersion, knowledgeVersion); preserve managedAssets map |
| Operator sessions | `coordinator/operator-sessions/` | Full turn text preserved; session IDs, lifecycle states, timestamps preserved |
| Session pins | session journals | Pin references remain valid; pinned turns still exist in journal |
| Scoped holds | `coordinator/holds/` | Hold identity, scope, expiry, and reason preserved |
| Amendment requests | `coordinator/amendment-requests/` | Request identity and handoff evidence preserved |
| Budget grants | `coordinator/` or session store | Grant identity, amount, expiry preserved |
| Lane state | `state/coordinator-lane-state.txt` | Lifecycle state, active batch preserved; new fields may be added |
| Coordinator journal | `coordinator/journal/` | All events preserved with original IDs, sequences, timestamps |
| Effect journal | `coordinator/journal/` | All effect records preserved |

## Implementation Steps

1. **Migration registry** (`src/foundation/MigrationRegistry.ts`):
   - A registry mapping `{sourceSchemaVersion, targetSchemaVersion}` to a migration step function
   - Steps are keyed by exact version pair (e.g., `1 → 2`, `2 → 3`)
   - `resolveMigrationChain(fromVersion, toVersion)`: compute ordered list of steps via shortest path
   - Missing intermediate step: if no path exists from source to target, throw a deterministic `MigrationPathNotFound` error
   - Each step function signature: `(laneDir: string) => Promise<void>` — pure transformation, no external effects
   - The registry is closed for v1; new steps registered only when new schema versions are defined

2. **Migration steps** (`src/foundation/MigrationSteps.ts`):
   - One function per supported version transition
   - Each function:
     a. reads source artifacts from `laneDir`
     b. validates they match expected source schema version
     c. transforms to target schema version
     d. writes transformed artifacts to staging paths adjacent to originals
     e. atomically renames staged versions into place
   - **Staged rebuild**: session indexes and policy baselines are rebuilt from
     the durable source journals and policy definitions, never from the prior
     index files
   - Session-index rebuild: re-read all session journals, rebuild the working-set
     index structure, verify no turn is lost
   - Policy-baseline migration: transform policy definitions to new schema while
     preserving all operator-set values (limits, reserves, profiles, retention)
   - Steps never: execute runtime actions, close sessions, prune session content,
     change lifecycle states, or modify committed implementation packs

3. **Proof** (`spec/basic/migration-registry.spec.ts`):
   - Each individual step tested with synthetic fixture lane directories
   - Chain composition: v1 → v2 → v3 migration preserves all artifact classes
   - Value preservation: byte comparison of config, bindings before/after migration
   - Session preservation: all turns, pins, IDs, lifecycle states survive
   - Index rebuild: rebuilt session index matches freshly built index from source
   - Policy migration: operator-set values unchanged, schema fields updated
   - Missing step: chain with gap produces deterministic error
   - No-runtime-execution proof: migration steps tracked for any subprocess spawn
   - No-session-closure: verify no session lifecycle changes during migration

## Exclusions

- No atomic manifest-last switch (owned by UK-03)
- No crash recovery (owned by UK-03)
- No downgrade guard (owned by UK-03)
- No host adapter integration (owned by UK-04)
- No upgrade command integration beyond what UK-01 already provides
- No `wt upgrade --apply` orchestration (UK-01 parses the flag; UK-03 implements)
- No `doctor` or `status` integration in this batch

## Required Proof

| Proof class | Evidence |
|-------------|----------|
| Unit tests | Each step independently; chain composition; missing step error |
| Value preservation | Byte-exact comparison for config, bindings; field-level for markers, manifests, holds, amendments, grants |
| Session integrity | All session IDs, turns, pins, lifecycle states survive migration |
| Index rebuild | Rebuilt index truth-equivalent to fresh index from source |
| Negative proof | No runtime execution; no session closure; no content pruning; no lifecycle change |
| Build | `nvb build` passes |

## Acceptance Gate

- All Jasmine specs pass
- Every artifact class has preservation proof
- No runtime action, session closure, or content pruning during any migration step
- Migration registry correctly resolves chains and fails on missing intermediate steps
- Module sizes follow the exact category matrix: the registry prefers at most
  120 lines, warns at 121–160, and rejects over 180; each foundation migration
  step module prefers at most 200, warns at 201–260, and rejects over 300; each
  spec prefers at most 300, warns at 301–420, and rejects over 500. Every file
  must remain cohesive below those limits.
- No product logic in `src/cli.ts`

## Implementation Report

Write a durable report at `.local/agent-reports/wt-upgrade-knowledge/UK-02-lane-session-index-migration-registry.md`
containing: files created/modified with line counts, exact test commands and
results, any open questions or intentional limitations.

---
---

# UK-02: Lane/Session/Index Migration Registry — Agent Launch Prompt

## Recommended agent/model class for forwarding:

**Reasoning level:** R5 — highest available reasoning with interacting state
machines, value-preservation proofs, and staged rebuild of complex index
structures.

**Primary suitability:** An agent capable of reasoning about multiple
interacting data artifacts (session journals, policy baselines, index
structures), implementing deterministic pure-function transformations, and
proving preservation through byte-exact and truth-equivalent comparisons.

**Alternatives:** An R4 agent may attempt the simpler migration steps but is
likely to miss edge cases in session-index rebuild or policy-baseline
transformation. R5 is strongly preferred.

**Steering-only tools:** Agents that cannot reliably perform byte-exact file
comparison or walk directory trees are unsuitable.

**Prohibited final-pass classes:** R1, R2, R3 — insufficient for
multi-artifact preservation proofs and staged index rebuild.

**Context requirements:** The agent needs the complete spec (§11.5, §6, §7.3,
§7.4), the session and coordinator journal schemas, existing lane directory
layout documentation, and the UK-01 accepted upgrade plan types.

**Final-authority limits:** The implementation agent may not commit. The
reviewer owns acceptance.

### Complete forwarding profile — mandatory

- **Class:** R5 (highest available reasoning)
- **Primary models:** any currently strongest coding-capable model meeting R5
- **Good alternatives:** any model with strong TypeScript, filesystem
  transformation, and data-preservation proof experience
- **Steering-only tools:** agents that cannot perform byte-exact comparisons
  or walk directory structures are unsuitable
- **Prohibited final-pass classes:** R1, R2, R3
- **Context retention:** the agent must retain all twelve artifact classes and
  their preservation rules across the session
- **Final-authority limits:** implementation agent does not commit; reviewer
  owns acceptance decision

## Capability-Based Agent Selection Rule

This batch requires R5 reasoning because:

- Migration steps interact with twelve distinct artifact classes, each with
  different preservation rules (byte-exact, truth-equivalent, field-level)
- Session-index rebuild requires understanding the canonical source of truth
  (session journals) and reconstructing index structures without inheriting
  prior index corruptions
- Policy-baseline migration transforms versioned policy structures while
  preserving operator-set numeric values, identifiers, and profiles
- The dependency-graph ordering of steps (shortest path through version graph)
  requires correct graph traversal
- A single missed artifact class or incorrect preservation rule corrupts
  operator data silently

## Context Assignment

You are agent UK-02 implementing the migration registry for Watchtower v1.
Your migration steps are the only path through which lane schema, session
indexes, and policy baselines advance across version boundaries. A bug in
your code permanently corrupts operator data. You work in the Watchtower
repository at the current working directory.

## Read In This Order

1. `AGENTS.md`
2. `docs/spec/implementation/wt-upgrade-knowledge/README.md`
3. `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md`
4. `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md`
5. `docs/spec/implementation/wt-upgrade-knowledge/implementation-quality-and-agent-rules.md`
6. `docs/spec/implementation/wt-upgrade-knowledge/batch-reasoning-difficulty-ranking.md`
7. `docs/spec/v1.md` — §11.5 (migration requirements in upgrade), §6 (ownership classes), §7.3 (lane marker), §7.4 (bindings), §7.2 (per-workspace layout), §13 (state and event compatibility)
8. `docs/spec/v1-contracts.md` — §9 (event journal), §11 (locking and recovery)
9. `docs/spec/schemas/v1.schema.json`
10. `docs/spec/architecture.md` — §4.3 (foundation services)
11. UK-01 accepted report: `.local/agent-reports/wt-upgrade-knowledge/UK-01-upgrade-compatibility-and-preview-planner.md`
12. Existing `src/foundation/LaneManifestStore.ts` — lane.json parsing
13. Existing `src/foundation/LanePaths.ts` — lane directory path construction

## Reasoning / Agent Class

- **Class:** R5 (highest available reasoning)
- **Primary suitability:** twelve artifact classes with distinct preservation
  rules; session-index rebuild from source journals; policy-baseline
  transformation; dependency-graph step ordering; byte-exact and
  truth-equivalent comparison proofs
- **Primary models:** any strongest coding agent meeting R5
- **Good alternatives:** any agent with strong data-transformation, graph
  traversal, and preservation-proof experience
- **Steering-only tools:** agents that cannot independently inspect lane
  directory structure or perform byte comparison are unsuitable
- **Prohibited final-pass classes:** R1, R2, R3
- **Context requirements:** agent must retain all artifact classes and
  preservation rules
- **Final-authority limits:** implementation agent does not commit; reviewer
  owns acceptance

## Mandatory Reasoning Protocol

Before writing any implementation code:

1. **Dependency map**: enumerate all artifact classes in the lane directory
   that migration steps may touch. For each, determine the canonical file
   path pattern, the file format (JSON/ENV/text), and the current v1 schema
   version they carry.
2. **Inspect source**: read `lane.json` schema (fields: schemaVersion, laneId,
   kind, slug, etc.), `install.json` schema, `lane.config.env` format,
   session journal locations, policy baseline locations. Do not assume field
   names.
3. **Invariants**: state before coding: (a) every lane-owned byte outside
   the schema version field is preserved; (b) session-index rebuild produces
   truth-equivalent output to a fresh index from source journals;
   (c) migration steps are pure functions of on-disk state — no runtime
   invocation, no session closure, no content pruning, no lifecycle change.
4. **Counterexamples**: for each artifact class, design the counterexample
   test: what happens if the source file is missing? Malformed? Has extra
   unknown fields? Already at the target version?
5. **Spec disagreements**: if v1.md §11.5 migration requirements conflict
   with v1-contracts.md §11 transaction rules, the contract-closure document
   wins.
6. **Predecessor reports**: UK-01 report may note limitations in manifest
   parsing. LC-05 report may note the current baseline schema version.
   Adjust step starting versions accordingly.

## Structural Design And Module-Size Gate

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

## Your Mission

Create the migration registry and version-step implementations:

1. Implement `src/foundation/MigrationRegistry.ts` with version-pair
   registration and chain resolution
2. Implement `src/foundation/MigrationSteps.ts` with all v1→v1.* steps that
   are defined (at minimum, a v1→v1 no-op step proving the registry works;
   additional steps as needed for v1 schema evolution)
3. Write comprehensive Jasmine specs covering every migration step, chain
   composition, value preservation, and negative paths
4. Verify `nvb build` passes
5. Write the implementation report

## What You Must Not Do

- Execute runtime actions, close sessions, or prune session content
- Change lane lifecycle states or modify committed implementation packs
- Implement atomic staging or crash recovery (owned by UK-03)
- Implement `--apply` orchestration or upgrade command integration
- Modify the UK-01 `UpgradeCommand` or `UpgradePlanner.ts`
- Add product logic to `src/cli.ts`
- Commit any code

## Required Proof

- Each migration step tested independently with synthetic fixture lanes
- Chain composition: multi-step migration preserving all twelve artifact classes
- Byte-exact preservation for: `lane.config.env`, `repositories.local.json`
- Field-level preservation for: `lane.json` (schemaVersion may change),
  `install.json` (versions may change)
- Session integrity: all IDs, turns, pins, lifecycle states survive
- Index rebuild: rebuilt index content matches fresh index from source
- Policy migration: operator-set limits, reserves, profiles, retention unchanged
- Missing intermediate step produces deterministic `MigrationPathNotFound`
- No runtime execution: verify zero subprocess spawns during any step
- No session closure: verify zero lifecycle state changes
- No content pruning: verify all session bytes survive in journal
- All Jasmine specs pass via `nvb test`

## Trackers and Status Docs

After implementation, update:
- `implementation-tracker.md` — mark UK-02 as ⏳ awaiting review
- `implementation-roadmap.md` — mark UK-02 phase status as ⏳

Do NOT mark as ✅ — only the reviewer does that.

## Local Artifact Git Rule

Write your implementation report to `.local/agent-reports/wt-upgrade-knowledge/UK-02-lane-session-index-migration-registry.md`.
Do not stage or commit `.local/` artifacts.

## Non-Negotiable Rules

- Never commit `dist/`, `build/`, `node_modules/`, `.nira/local/`, `.watchtower/`
- Migration steps are pure functions of on-disk state
- Session content is preserved byte-for-byte
- No runtime invocation, no session lifecycle change, no content pruning
- Keep commands thin; algorithms live in foundation modules
- Match Nirvana CLI patterns — `@nirvana/base/cli`, NVB for build/dist

## Required Disk Report

Write a complete implementation report at `.local/agent-reports/wt-upgrade-knowledge/UK-02-lane-session-index-migration-registry.md`
containing:

- Files created and modified with before/after line counts
- Exact test commands run and their output (pass/fail counts)
- Per-artifact-class preservation verification summary
- Any open questions or intentional limitations
- A handoff summary for the UK-03 agent and the reviewer

## Always plan and make task lists

Before writing code, produce a task list covering: registry implementation,
step implementations (one per version pair), spec writing (one spec group per
artifact class), build verification, and report writing. Work through the list
methodically.

## Leave a helpful handoff message for the next agent

After completing implementation, write a concise handoff message summarizing:
the migration registry API, the registered version pairs, which artifact
classes were proven preserved, any edge cases discovered, and the exact
command to run tests.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.
