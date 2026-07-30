# Agent Launch Prompt — Work Batch LC-05

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
    - `src/foundation/coordinator-baseline.ts` (new)
    - `src/foundation/pack-index-bootstrap.ts` (new)
15. the dependency modules you must inspect:
    - LC-02: `src/foundation/pack-seal.ts` (for seal verification)
    - LC-03: `src/foundation/lane-store.ts` (for lane directory structure)
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

The batch must preserve focused ownership and must not produce a ball of mud,
god object, giant coordinator, or overflow helper module.

- Front doors, factories, registries, directors, commands, renderers, and public
  barrels target 160 lines or fewer. Files from 161 through 220 lines require an
  explicit cohesion justification. A hand-maintained front door over 220 lines
  is rejectable without a narrow pre-existing constraint, and no front door may
  exceed 300 lines.
- Focused implementation modules target 220 lines or fewer. Files from 221
  through 300 lines require a responsibility inventory and independent reviewer
  scrutiny. Files from 301 through 350 lines are expected to split; acceptance
  requires a source-backed reason why splitting would reduce ownership clarity.
  New or materially rewritten implementation modules above 350 lines are
  rejected.
- Four hundred physical lines is the absolute ceiling for every hand-maintained
  JS/TS source or spec module touched by this lane. The ceiling does not make a
  mixed-responsibility file acceptable.
- Split a module below those thresholds when it owns three or more independently
  nameable concerns or combines state policy, I/O, normalization, planning,
  error translation, or rendering.
- Coordinators sequence focused collaborators; they do not absorb collaborator
  algorithms. Barrels expose a local capsule; they do not launder foreign APIs.
- Do not create generic `helpers`, `utils`, `common`, or `misc` overflow bags.
  Use feature-local capsules with explicit owner names.
- Record physical line counts for every new or materially rewritten file. The
  reviewer must independently verify warning-band files and reject unjustified
  growth in an existing oversized module.

## Your Mission

Seed finite coordinator routing and session policies. Bootstrap the
deterministic seal-bound pack index. Correct provenance. No model.

1. Create `src/foundation/coordinator-baseline.ts`:
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

2. Create `src/foundation/pack-index-bootstrap.ts`:
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
