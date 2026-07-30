# Agent Launch Prompt — Work Batch LC-05

## Governing Contract And Precedence — Mandatory

This prompt is an execution aid, not product authority. Resolve conflicts in
this order and stop for a specification amendment rather than inventing
behavior:

1. `docs/spec/v1-contracts.md` and `docs/spec/schemas/v1.schema.json`
2. `docs/spec/v1.md`
3. `docs/spec/nirvana-integration-architecture.md`,
   `docs/spec/coordinator-automation.md`, `docs/spec/operator-session.md`, and
   `docs/spec/cli-session.md` within their scopes
4. `docs/spec/architecture.md`
5. `docs/development/engineering-and-review-standard.md`
6. `AGENTS.md`
7. the accepted implementation map, pack rules, and this batch brief

The implementation/review agent must read the mandatory engineering standard
and Nirvana integration architecture in full. A stale path, module suggestion,
or technical mechanism in this prompt must be corrected to the governing
contract while preserving the batch objective and proof obligations.

## Nirvana-First And NVB Execution Gate — Mandatory

- Complete and report the required Nirvana API usage audit before introducing
  infrastructure or bare Node behavior.
- Commands use Nirvana command, argument, pretty, and terminal-view APIs and
  remain thin.
- Public reason codes, exit mappings, event names, and schema identifiers remain
  owned by accepted RM-01 contracts and `docs/spec/schemas/v1.schema.json`. A
  batch-local symbolic name is not automatically public; reconcile it with the
  registry, and update the owning contract/schema in the same batch when a new
  public identifier is genuinely required.
- Use the Nirvana storage facade for ordinary managed-root operations only
  after CLI-safe root/bootstrap semantics are proved. Atomic durability,
  canonical path security, locking, append-only journals, ownership/modes, and
  SQLite stay behind focused adapters when the facade lacks required semantics.
- Use the Nirvana logger only through the Watchtower logging boundary for
  redacted diagnostics. Logs are never command output, lifecycle events,
  acceptance evidence, or authoritative journals.
- Substantial deterministic workflows use the immutable packaged Watchtower
  NVB catalog, focused TaskHandlers, and task groups.
- `LaneTaskRunner` is the only internal NVB invocation boundary. Task selection
  is an allowlisted Watchtower action mapping, never an arbitrary user/agent
  task name or parent-project discovery.
- Never create or modify a participating repository's root `nvb.json`.
- Shell is restricted to checksum-manifested leaf adapters for tmux, Git, or
  external tools when no conforming Nirvana API exists. Workflow-level shell is
  a hard reject.
- Mutating tasks do not gain authority from NVB. They require the normal
  Watchtower effect executor, current-state validation, locks, idempotency, and
  a valid single-use invocation envelope.

## Project-Wide Structural And Size Gate — Mandatory

Apply the exact limits in
`docs/development/engineering-and-review-standard.md`; pack-local numbers may
be stricter but may never relax them:

- CLI entry, command, or NVB task: preferred at most 120 lines, warning at
  121–160, hard reject over 180.
- Orchestrator, controller, or renderer shell: preferred at most 140 lines,
  warning at 141–180, hard reject over 200.
- Foundation service, planner, validator, adapter, or store: preferred at most
  200 lines, warning at 201–260, hard reject over 300.
- Contract/type/schema registry: preferred at most 240 lines, warning at
  241–320, hard reject over 400.
- Test/spec module: preferred at most 300 lines, warning at 301–420, hard reject
  over 500.
- Function: target at most 40 lines, justification at 41–60, reject over 80.
- Constructor: target at most 25 lines, warning at 26–40, reject over 50.

Passing a line limit never excuses mixed responsibilities, a god object,
generic helper bag, hidden cycle, foreign API laundering, or layer violation.
Use `PascalCase` for classes/class-owning files, `lowerCamelCase` for non-class
modules and directories, and never introduce dashed or underscored backend
source/spec names.

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `very high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `very high for exact policy-seed correctness, deterministic index compilation, and seal-bound provenance`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent
  re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing
  specs, current source, predecessor handoff, and proof output in context; if it
  cannot do so, escalate the agent rather than shortening or partitioning away
  safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help
  with bounded exploration, but it cannot issue the final implementation or
  acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Product names above are only
non-normative examples and may become unavailable or stale. Select a currently
available agent that can load the complete brief/spec/source context, inspect
and edit the repository with tools, reason across package boundaries, and run
the required proof without replacing evidence with narrative confidence.

- For `R3`, require reliable bounded repository reasoning and focused regression
  work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path
  design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient
  context for state machines, concurrency, graph/planner logic, driver behavior,
  destructive migration safety, or cross-package closure evidence.
- If the assigned agent cannot retain the governing context, independently
  inspect the source, or execute the proof, escalate to a stronger agent or
  split only along the existing brief's ownership boundaries. Never reduce the
  contract to fit a weaker model.

You are assigned **implementation work batch LC-05** for the Watchtower v1
wt-lane-lifecycle delivery lane.

This batch seeds finite coordinator routing policies and operator-session
policies from the shipping-policy baseline, bootstraps the deterministic
seal-bound pack index, and ensures correct provenance on every value.
No model, no full-pack fallback.

## Read In This Order

1. `AGENTS.md`
2. `docs/spec/implementation/wt-lane-lifecycle/work-batches/LC-05-coordinator-session-baselines-and-pack-index.md`
3. `docs/spec/implementation/wt-lane-lifecycle/work-batches/README.md`
4. `docs/spec/implementation/wt-lane-lifecycle/work-batches/00-work-batch-index.md`
5. `docs/spec/v1-contracts.md` — especially §4 (routing policy: every rule, guard, class, result), §7 (shipping policy baseline: every numeric default)
6. `docs/spec/v1-contracts.md` — especially §3.4 (seal for index binding), §3.5 (drift — referenced by index freshness)
7. `docs/spec/schemas/v1.schema.json` — `$defs.implementationPack`, `$defs.batch`, `$defs.requirement` for index compilation
8. `docs/spec/v1.md` — §7.2 (coordinator/ layout), §11.1 (init steps 11-13)
9. `docs/spec/architecture.md` — §4.8 (coordinator decision plane services), §6.4 (coordinator cycle flow)
10. `docs/spec/implementation/wt-lane-lifecycle/implementation-roadmap.md`
11. `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
12. `docs/spec/implementation/wt-lane-lifecycle/implementation-quality-and-agent-rules.md`
13. `docs/spec/implementation/wt-lane-lifecycle/batch-reasoning-difficulty-ranking.md`
14. the canonical source owners you will create:
    - `src/foundation/CoordinatorBaseline.ts` (new)
    - `src/foundation/PackIndexBootstrap.ts` (new)
15. the dependency modules you must inspect:
    - LC-02: `src/foundation/PackSeal.ts` (for seal verification)
    - LC-03: `src/foundation/LaneStore.ts` (for lane directory structure)
    - RT-02: runtime manifest validation
    - `src/contracts/` — for public type conventions

## Reasoning / Agent Class

- brief-declared reasoning level: `R5`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `very high for exact policy-seed correctness, deterministic index compilation, and seal-bound provenance`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent
  re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing
  specs, current source, predecessor handoff, and proof output in context; if it
  cannot do so, escalate the agent rather than shortening or partitioning away
  safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help
  with bounded exploration, but it cannot issue the final implementation or
  acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   contracts, factories, lower-layer capsules, front doors, tests, and status
   artifacts affected by this batch.
2. Inspect the current source and accepted predecessor-batch output. Do not infer
   behavior from filenames, the implementation report, or the launch prompt.
3. Enumerate public invariants, invalid states, failure precedence, concurrency
   or re-entrancy risks, compatibility constraints, and deliberately unsupported
   behavior before choosing or evaluating a design.
4. Use counterexamples: identify at least one plausible shortcut that would pass
   a happy-path test while violating ownership, safety, boundedness, or public
   result semantics, then ensure focused proof rejects it.
5. When a spec and current source disagree, stop that line of implementation,
   record the contradiction precisely, and resolve it through the correction
   process. Do not silently choose the easier interpretation.
6. Treat predecessor reports as leads, not proof. Re-open the actual changed
   files and reproduce all acceptance-critical evidence from the current tree.

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

## Your Mission

Seed finite coordinator routing and session policies. Bootstrap the
deterministic seal-bound pack index. Correct provenance. No model.

1. Create `src/foundation/CoordinatorBaseline.ts`:
   - `seedRoutingBaseline(laneDir, policyHash)`:
     - Construct routing policy with all 15 rules from v1-contracts.md §4.
       Each rule MUST have the exact guard description, decision class,
       and permitted results from the spec table:
       1. `safety-integrity-v1`: contradictory state/unapproved effects/
          journal discontinuity → D3 + system hold → `propose-reconciliation`,
          `escalate`
       2. `pack-semantic-drift-v1`: critical pack/source drift → D3 →
          `request-pack-amendment`, `escalate`
       3. `review-reject-repeated-v1`: reject with 2+ prior corrections → D3
          → reject/correction proposals, amendment, escalation
       4. `review-reject-v1`: valid reviewer reject → D2 → reject/correction
          proposals, escalation
       5. `worker-blocked-unique-v1`: valid blocked, one dependency owner,
          one legal route → M0 → unique preauthorized notification/reroute
       6. `worker-blocked-v1`: other valid blocked → D2 →
          correction/reroute/escalation
       7. `review-accept-v1`: complete valid reviewer commit set → M0 →
          record acceptance and prepare publication
       8. `ready-unique-v1`: exactly one ready candidate or total-priority
          rule selects one → M0 → dispatch that candidate
       9. `ready-ambiguous-critical-v1`: multiple candidates, any R4/R5 or
          cross-repository → D2 → select batch or escalate
       10. `ready-ambiguous-v1`: multiple equally valid → D1 → select or escalate
       11. `projection-query-v1`: exact registered structured query → M0 →
           bounded projection answer
       12. `operator-complex-v1`: cross-repo/redesign/integrity/drift/repeated
           failure/safety → D3 → advisory response/escalation
       13. `operator-bounded-v1`: exact single-subject non-semantic registered
           form → D1 → advisory response/escalation
       14. `operator-default-v1`: other natural language → D2 → advisory
           response/escalation
       15. `no-work-v1`: no unhandled trigger → M0 → no effect
     - Include capability floors: D1→C2, D2→C3, D3→C5
     - Include routing evaluation rule: first match wins, policy may raise
       class or lower thresholds but cannot lower floors
     - Set provenance: `"v1-contracts.md §4"`
     - Write to `{laneDir}/coordinator/routing-policy.json`:
       temp write → fsync → atomic rename
   - `seedSessionBaseline(laneDir, policyHash)`:
     - Construct session policy with EXACT numeric defaults from v1-contracts.md §7:
       - D1 limits: input={soft:12000, hard:24000}, output=2000,
         brokerRequests=4, wallClockSec=120
       - D2 limits: input={soft:20000, hard:40000}, output=4000,
         brokerRequests=8, wallClockSec=300
       - D3 limits: input={soft:40000, hard:80000}, output=8000,
         brokerRequests=16, wallClockSec=600
       - Session per-turn: input=40000, output=4000
       - Session: maxTurns=50, maxTokens=500000, maxRetainedTextBytes=33554432
         (32 MiB), maxOpenSessions=16, maxConcurrentTurns=2
       - Lane-wide: maxSessionTokens=2000000, escalationReservePercent=20
       - Working set: recentTurns=8, maxPins=16, maxCapsules=4,
         capsuleBytes=65536 (64 KiB), brokerRequests=8, brokerBytes=262144
         (256 KiB)
       - Retention: closedSessionDays=30, laneStorageBytes=268435456 (256 MiB)
       - Holds: defaultExpiryMinutes=60, maxExpiryHours=24
     - Set provenance: `"v1-contracts.md §7"`
     - Set provenanceDigest: SHA-256 of the spec §7 text content
     - Write to `{laneDir}/coordinator/session-policy.json`:
       temp write → fsync → atomic rename
   - `seedEmptyStores(laneDir)`: create empty initial state files:
     - `{laneDir}/coordinator/journal/coordinator-events.jsonl` (empty JSONL)
     - `{laneDir}/coordinator/journal/effect-events.jsonl` (empty JSONL)
     - `{laneDir}/coordinator/projections/` (directory, empty state.json)
     - `{laneDir}/state/coordinator-lane-state.txt` (initial `bootstrap` state)
     - `{laneDir}/state/worker-events.jsonl` (empty JSONL)
     - `{laneDir}/coordinator/operator-sessions/` (directory)
     - `{laneDir}/coordinator/amendment-requests/` (directory)
     - `{laneDir}/coordinator/holds/` (directory)

2. Create `src/foundation/PackIndexBootstrap.ts`:
   - `buildPackIndex(packRoot, sealId)`:
     - Read `{packRoot}/implementation-pack.json`
     - Validate against `$defs.implementationPack` schema
     - For each batch in `batches[]`:
       - Extract: id, title, dependsOn, primaryRepository,
         implementationReasoning, workload, proofClasses
       - Also extract: workBrief, reviewBrief (path refs)
     - For each requirement in `requirements[]`:
       - Extract: id, repository, source, workBatches[], reviewBatches[]
     - Build dependency DAG from `dependsOn`:
       - Verify no cycles
       - Compute topological order
       - Store adjacency list
     - Build cross-references:
       - requirement → batches (forward)
       - batch → requirements (reverse)
       - requirement → source paths
     - Build batch proof-class matrix
     - Compile `PackIndex`:
       - `schemaVersion: 1`
       - `sealId`: the active pack seal
       - `packId`: from manifest
       - `compiledAt`: current ISO timestamp
       - `batches`: sorted by batch ID, each with full entry
       - `requirements`: sorted by requirement ID
       - `dependencies`: `{topological: string[][], adjacency: Record<string, string[]>}`
       - `crossReferences`: sorted list of `{from, to, kind}` entries
     - THIS IS PURELY MECHANICAL. No model. No full-pack prose scan.
       Only structural JSON fields are read.
   - `writePackIndex(laneDir, index)`:
     - Write to `{laneDir}/coordinator/pack-index.json`:
       temp → fsync → atomic rename
   - `verifyPackIndex(index, sealId)`: return `index.sealId === sealId`
     - If mismatch: index is stale/corrupt, do not write

3. Write focused specs:
   - `spec/foundation/coordinator-baseline.spec.ts`:
     - Routing policy contains all 15 rules with correct guard/class/results
     - Routing policy: capability floors D1/C2, D2/C3, D3/C5 present
     - Routing policy: first-match evaluation rule documented
     - Session policy: every numeric default matches v1-contracts.md §7 exactly
     - Session policy: all soft/hard limits, turn/session/lane limits
     - Session policy: escalation reserve 20%
     - Session policy: retention and hold values
     - Provenance markers reference correct spec sections
     - Provenance digest: matches precomputed spec digest
     - Files written to correct coordinator/ paths with correct content
     - All empty stores created at correct paths
   - `spec/foundation/pack-index-bootstrap.spec.ts`:
     - Index built from valid pack fixture: all batches present
     - Batch entries: id, title, dependsOn, reasoning, workload, proofClasses
     - Requirement entries: id, batches, source paths
     - Dependency DAG: correct adjacency, no cycles
     - Cross-references: requirement→batch and batch→requirement correct
     - Seal verification: matching seal passes
     - Seal verification: mismatched seal fails
     - Determinism: same pack root + same seal → identical index
     - No full-pack prose read (verify via mock/spy)
     - No model invocation (verify via mock/spy)

## What You Must Not Do

- Do not use a model for policy seeding, index construction, or any computation
- Do not restate semantic coordinator judgment in TypeScript code
- Do not fall back to full-pack scanning when index is unavailable
- Do not add coordinator cycle execution or watcher logic
- Do not add operator-session lifecycle management (beyond seeding defaults)
- Do not add product logic to `src/cli.ts` or any command
- Do not commit
- Do not add `.local` artifacts to git

## Required Proof

Before finishing, verify and report:

- Routing policy: all 15 rules from v1-contracts.md §4 present with correct
  guard/class/results
- Capability floors: D1/C2, D2/C3, D3/C5 present
- Session policy: every numeric value matches v1-contracts.md §7 exactly
  (spot-check 10+ values for exact match)
- Provenance markers: correct spec section references
- Provenance digest: SHA-256 of spec content computed correctly
- All files written to correct coordinator/ subdirectory paths
- Pack index: all batch entries complete with correct metadata
- Pack index: dependency DAG correct, no cycles
- Pack index: requirement cross-references correct
- Pack index: seal verification passes and fails correctly
- Determinism: same input → same index
- No model invocation anywhere in baseline or index code
- No full-pack prose scanning
- `nvb build` passes from tracked-only checkout
- Final `git status --short`
- Proof that `.local/` is not staged

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep all trackers and status docs updated if this batch changes concrete shape
or accepted status:

- `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
- `docs/spec/implementation/wt-lane-lifecycle/implementation-roadmap.md`
- `docs/spec/implementation/wt-lane-lifecycle/work-batches/00-work-batch-index.md`

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`
- agent reports must never be included in a commit

## Non-Negotiable Rules

- no model use for any computation in this batch
- policy values must match v1-contracts.md §4 and §7 exactly
- pack index is deterministic, model-free, and seal-bound
- no full-pack fallback path
- no coordinator cycle execution
- no product logic in `src/cli.ts`
- `nvb build` must pass
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-lane-lifecycle/LC-05-coordinator-session-baselines-and-pack-index.md`

The report must include:

- documents studied
- exact files created
- coordinator-baseline public API shape (types and functions)
- pack-index-bootstrap public API shape (types and functions)
- complete routing policy: all 15 rules enumerated with guard/class/results
- complete session policy: all numeric defaults enumerated with exact values
- pack index structure: batch entries, requirement entries, dependency DAG
- proof that no model was used
- proof that index is deterministic
- proof commands and outcomes
- `nvb build` result
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the exact seeded policy values (every routing rule and session default),
the pack index structure, the provenance digest mechanism, and the seal-bound
verification contract. Make explicit that LC-06 (watch) reads
`coordinator/routing-policy.json` and `coordinator/pack-index.json` for
preflight validation, and LC-07 (doctor) reads all baselines for integrity checks.
