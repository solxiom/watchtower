# Agent Launch Prompt — Work Batch LC-02

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
- agent suitability: `very high for cryptographic canonicalization, JSON Schema completeness, and Git-object precision`
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

You are assigned **implementation work batch LC-02** for the Watchtower v1
wt-lane-lifecycle delivery lane.

This batch validates implementation packs against the JSON Schema bundle,
reproduces signed seals using RFC 8785 canonicalization, and classifies drift
between the committed pack and working tree using the drift reason matrix.
All validation is read-only; no mutation.

## Read In This Order

1. `AGENTS.md`
2. `docs/spec/implementation/wt-lane-lifecycle/work-batches/LC-02-pack-acceptance-seal-and-drift-validation.md`
3. `docs/spec/implementation/wt-lane-lifecycle/work-batches/README.md`
4. `docs/spec/implementation/wt-lane-lifecycle/work-batches/00-work-batch-index.md`
5. `docs/spec/v1-contracts.md` — especially §3 (pack consumer contract): §3.1 (required files), §3.2 (paths), §3.3 (acceptance), §3.4 (seal/canonicalization), §3.5 (drift rules)
6. `docs/spec/schemas/v1.schema.json` — every `$defs` entry referenced by pack validation: `implementationPack`, `implementationPackLock`, `packAcceptance`, `sealedFile`, `digest`, `relativePath`, `id`, `repository`, `batch`, `requirement`
7. `docs/spec/v1.md` — §7.3 (lane marker schema for pack path references), §14 (safety: paths escaping declared binding are rejected)
8. `docs/spec/v1-implementation-map.md` — §6 (this pack), §3 (global batch contract), §10-14
9. `docs/spec/architecture.md` — §4.3-4.4 (foundation services, contracts)
10. `docs/spec/implementation/wt-lane-lifecycle/implementation-roadmap.md`
11. `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
12. `docs/spec/implementation/wt-lane-lifecycle/implementation-quality-and-agent-rules.md`
13. `docs/spec/implementation/wt-lane-lifecycle/batch-reasoning-difficulty-ranking.md`
14. the canonical source owners you will create:
    - `src/foundation/PackConsumer.ts` (new)
    - `src/foundation/PackSeal.ts` (new)
15. the dependency modules you must inspect:
    - RM-01: contract/error modules (for error code alignment)
    - RM-08: conflict inspector modules (for drift cross-reference)
    - `src/contracts/` — for public type conventions
    - `docs/spec/schemas/v1.schema.json` — as runtime-loaded schema

## Reasoning / Agent Class

- brief-declared reasoning level: `R5`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `very high for cryptographic canonicalization, JSON Schema completeness, and Git-object precision`
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

Validate implementation packs against the JSON Schema bundle. Reproduce seals
using RFC 8785 canonicalization. Classify drift. No mutation.

1. Create `src/foundation/PackConsumer.ts`:
   - Load and compile the v1 schema (`docs/spec/schemas/v1.schema.json`)
   - `validatePackManifest(root: string)`: read `implementation-pack.json` from
     pack root, validate against `$defs.implementationPack`, check:
     - `schemaVersion` is 1, `kind` is `"implementation"`, `status` is `"accepted"`
     - `packRepository` matches a declared repository in `repositories`
     - all batch IDs are unique
     - every requirement has at least one work batch and one review batch
     - repository IDs in source contributions match declared repositories
     - all relative paths match `$defs.relativePath` pattern
   - `validatePackAcceptance(root: string, gitDir: string)`: read
     `pack-acceptance.json`, validate against `$defs.packAcceptance`, check:
     - `verdict` is `"accept"`
     - all findings with `severity: "critical"` have `disposition` of
       `"closed"` or `"superseded"`
     - `reviewedCommit` is reachable from HEAD in the git directory and
       contains the reviewed candidate sealed files other than the later
       acceptance record and lock
     - the acceptance publication commit descends from `reviewedCommit`
     - the reviewer session differs from the pack-author session identity (as
       recorded in pack metadata)
   - `validatePackFileSet(root: string, gitDir: string)`: use `git ls-files` or
     equivalent to enumerate tracked files, check:
     - every file below pack root is a regular file (not symlink, device, socket)
     - no untracked or ignored files below pack root
     - all paths use `/` separators, no `.` or `..` segments, not absolute
     - paths resolve beneath the declared repository and pack root
   - `verifyPackLock(root: string)`: read `implementation-pack.lock.json`,
     validate against `$defs.implementationPackLock`, check:
     - every file in the lock exists on disk with matching sha256 digest
     - no extra regular file exists in the sealed set that is not in the lock
     - the lock's `sealId` matches a recomputed seal from current bytes

2. Create `src/foundation/PackSeal.ts`:
   - Implement RFC 8785 JSON Canonicalization Scheme (JCS):
     - Serialize JSON objects with keys sorted by Unicode code-point order
     - Numbers: use shortest representation (no leading zeros, no trailing
       zeros after decimal, no exponential notation for integers)
     - Strings: escape only required characters; do not escape `/` (per RFC 8785)
     - Serialize without insignificant whitespace (compact output)
     - Handle nested objects and arrays recursively
   - `canonicalizeSealInput(input: SealInput)`: produce canonical bytes of:
     ```json
     {"schemaVersion":1,"packId":"...","manifestDigest":"sha256:...","acceptanceDigest":"sha256:...","sourceBaselines":{...},"files":[...]}
     ```
     where `files` are sorted by `path` and each file object has sorted keys.
   - `computeSeal(input: SealInput)`: SHA-256 of canonical bytes, return as
     `"sha256:<lowercase 64 hex>"`
   - `computeFileDigest(path: string)`: SHA-256 of raw file bytes
   - `checkDrift(root: string, lock: ImplementationPackLock, conflicts: ...)`:
     - For each sealed file in the lock: read current bytes, compare digest.
       If any differ → `PACK_BYTES_CHANGED`
     - Enumerate current regular files below pack root (excl. lock file).
       If any added, removed, or changed kind (file→symlink etc) → `PACK_FILESET_CHANGED`
     - For each accepted input: compute current HEAD blob digest, compare with
       recorded. If changed → `ACCEPTED_INPUT_CHANGED`
     - For changed tracked paths outside the pack root: use RM-08 to check
       writable-claim intersection. If intersecting → `SOURCE_BASELINE_CRITICAL`.
       If not intersecting → `SOURCE_BASELINE_UNRELATED`.
     - For missing sources: → `SOURCE_BASELINE_UNAVAILABLE` unless repo is
       read-only and proof optional.
   - This is purely mechanical. No model.

3. Write focused specs:
   - `spec/foundation/pack-consumer.spec.ts`:
     - Valid manifest fixture passes validation
     - Invalid manifest: missing `packId` → rejected with specific error
     - Invalid manifest: `kind` not `"implementation"` → rejected
     - Invalid manifest: `status` not `"accepted"` → rejected
     - Invalid manifest: duplicate batch IDs → rejected
     - Invalid manifest: requirement with no work/review batches → rejected
     - Valid acceptance fixture passes
     - Invalid acceptance: verdict not `"accept"` → rejected
     - Invalid acceptance: critical finding not closed → rejected
     - File set: normal passes, each invalid type (symlink/device/socket)
       rejected, untracked rejected, ignored rejected
     - Lock verification: valid passes, missing file detected, digest mismatch
       detected, extra file detected, seal mismatch detected
   - `spec/foundation/pack-seal.spec.ts`:
     - RFC 8785: key ordering test vector (e.g., `{"c":1,"a":2,"b":3}` →
       `{"a":2,"b":3,"c":1}`)
     - RFC 8785: number serialization test vectors (no exponential notation)
     - RFC 8785: Unicode escape normalization
     - Seal reproduction: produce identical seal for identical input
     - Seal: different packId → different seal
     - Seal: different manifestDigest → different seal
     - Seal: extra file → different seal
     - Drift: `PACK_BYTES_CHANGED` when sealed file content changed
     - Drift: `PACK_FILESET_CHANGED` when file added/removed/type-changed
     - Drift: `ACCEPTED_INPUT_CHANGED` when referenced input digest differs
     - Drift: `SOURCE_BASELINE_CRITICAL` when changed path intersects claim
     - Drift: `SOURCE_BASELINE_UNRELATED` when changed path does not intersect
     - Drift: `SOURCE_BASELINE_UNAVAILABLE` when source cannot be accessed

## What You Must Not Do

- Do not mutate any filesystem path — validation is read-only
- Do not import or use any model/AI for drift classification
- Do not implement pack index construction or coordinator baselines
- Do not add product logic to `src/cli.ts` or any command
- Do not modify any dependency module from RM-01 or RM-08
- Do not commit
- Do not add `.local` artifacts to git

## Required Proof

Before finishing, verify and report:

- JSON Schema validation passes for valid manifest/acceptance/lock fixtures
- JSON Schema validation rejects invalid fixtures with specific error codes
- RFC 8785 canonicalization matches known test vectors
- Seal is deterministic: same input → same seal
- Seal detects differences: any input change → different seal
- File-set validation rejects symlinks, devices, sockets, untracked, ignored
- Lock verification detects missing files, mismatched digests, extra files
- All six drift codes produced for representative fixtures
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

- pack validation is read-only; no mutation
- seal canonicalization must match RFC 8785 exactly
- drift classification is mechanical; no model use
- no product logic in `src/cli.ts` or any command
- `nvb build` must pass
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-lane-lifecycle/LC-02-pack-acceptance-seal-and-drift-validation.md`

The report must include:

- documents studied
- exact files created
- pack-consumer public API shape (types and functions)
- pack-seal public API shape (types and functions)
- RFC 8785 implementation approach and test vector results
- Drift matrix: all six codes, when each is produced, representative fixture
- JSON Schema validation comprehensiveness (every `$defs` rule covered)
- proof commands and outcomes
- `nvb build` result
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the final public API of `PackConsumer.ts` and `PackSeal.ts`, the
exact RFC 8785 implementation choices, the drift code matrix with production
conditions, and the JSON Schema validation coverage. Make explicit that LC-03
calls `validatePackManifest` and `verifyPackLock` during init preflight, and
LC-05 calls `computeSeal` during index construction.
