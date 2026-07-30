# Agent Launch Prompt — Review Batch RT-01

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

- brief-declared reasoning level: `R4`
- agent suitability: `high to very high`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high to very high`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`
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

You are assigned **review batch RT-01** for the Watchtower `wt-runtime-distribution`
pack.

Your job is to independently verify that every inherited shell runtime script
and coordinator knowledge doc is inventoried with complete provenance, SHA-256
digests match, the behavioral inventory is complete, and no asset was modified,
executed, or newly created during audit.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-runtime-distribution/review-batches/RT-01-review-runtime-and-knowledge-asset-audit-import.md`
2. `docs/spec/implementation/wt-runtime-distribution/review-batches/README.md`
3. `docs/spec/implementation/wt-runtime-distribution/work-batches/RT-01-runtime-and-knowledge-asset-audit-import.md`
4. The implementation report: `.local/agent-reports/wt-runtime-distribution/RT-01-runtime-and-knowledge-asset-audit-import.md`
5. Changed source: `src/foundation/RuntimeAssets.ts`, `src/foundation/AssetAudit.ts`, `src/contracts/manifests.ts`
6. `docs/spec/coordinator-automation.md` — the canonical coordinator action vocabulary
7. `docs/spec/implementation/wt-runtime-distribution/implementation-quality-and-agent-rules.md`

## Reasoning / Reviewer Class

- brief-declared reasoning level: `R4`
- perform an independent source and completeness audit; do not treat implementation
  report conclusions as accepted facts

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high to very high`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`
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
   audit records, behavioral inventory, and provenance record.
2. Inspect the current source and accepted predecessor-batch output. Do not infer
   behavior from filenames, the implementation report, or the launch prompt.
3. Enumerate the complete set of coordinator actions from
   `docs/spec/coordinator-automation.md` and cross-reference against the
   inventory. Every action must map to at least one script or doc.
4. Use counterexamples: a script omitted from the audit, a SHA-256 that doesn't
   match the inherited source, an action with no inventory entry.
5. When the audit and the inherited source disagree, stop and record the
   contradiction. Do not silently accept the audit.
6. Treat the implementation report as a lead, not proof. Independently enumerate
   the inherited assets and recompute digests.

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

## Your Review Mission

Verify the complete asset audit and behavioral inventory:

1. Independently enumerate every shell runtime script and knowledge doc in the
   inherited `implementation-lane-coordinator` source. Compare counts with the
   audit records.
2. For every recorded asset, independently recompute SHA-256 of the inherited
   source content. Compare with the recorded digest.
3. Cross-reference the behavioral inventory against
   `docs/spec/coordinator-automation.md`. Verify no action is orphaned and no
   asset is unassigned.
4. Verify the import provenance record (source URI, commit hash, import date).
5. Verify every script has inputs/outputs, mutation/authority assumptions,
   external tools, and exactly one defensible migration class. Reject workflow
   shell as a leaf and temporary wrappers without TaskHandler owner, removal
   batch, compatibility reason, and expiry.
6. Confirm no inherited content was modified, no script executed, no shell
   execution or subprocess logic introduced.

## Required Independent Proof

- Exact count of inherited scripts and knowledge docs compared with audit
- SHA-256 verification for every recorded asset
- Behavioral inventory completeness: every action has at least one asset, every
  asset maps to at least one action
- Complete, correct shell migration classification with no unowned wrapper or
  workflow-level leaf
- Import provenance is complete and verifiable
- No shell execution, subprocess, or catalog logic introduced
- Architecture checks pass
- Exact commands and outcomes recorded

## Acceptance Gate

Accept only if enumeration and classification are complete, SHA-256 digests
match inherited source, the behavioral inventory has no orphans, provenance is
recorded, every retained leaf is truly bounded, every wrapper has removal
ownership, and no shell execution or subprocess logic was introduced.

## Rejection Correction Brief Rule

If you reject the batch, create a correction brief under:

- `docs/spec/implementation/wt-runtime-distribution/review-batches/corrections/RT-01-correction-<N>.md`

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

- `docs/spec/implementation/wt-runtime-distribution/implementation-tracker.md`
- `docs/spec/implementation/wt-runtime-distribution/implementation-roadmap.md`
- `docs/spec/v1-implementation-map.md` (section 5)

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`

## What You Must Not Do

- do not accept an incomplete inventory (missing scripts or docs)
- do not accept SHA-256 mismatches
- do not accept behavioral inventory with orphan actions or assets
- do not accept prose-only proof claims
- do not commit unrelated dirty-worktree changes

## Required Disk Report

Write exactly one review report to:

- `.local/agent-reports/wt-runtime-distribution/reviews/RT-01-runtime-and-knowledge-asset-audit-import-review.md`

If accepted, create the acceptance commit.

## Always plan and make task lists
