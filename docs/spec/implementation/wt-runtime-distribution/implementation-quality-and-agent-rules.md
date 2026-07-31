# wt-runtime-distribution Implementation Quality And Agent Rules

> **Dispatch hold.** `../planning-remediation-amendment.md` supersedes any
> conflicting batch contract and the former pack seal. No untouched batch may
> start until synchronized artifacts are independently accepted and resealed.

All implementation/review work uses thin Nirvana command front doors,
capability-owned foundation modules, the immutable packaged NVB task catalog,
`LaneTaskRunner`, diagnostic-only Nirvana logging, appropriately bounded
Nirvana storage adapters, and manifest-declared shell leaves only. Project
`nvb.json` files, workflow-level shell, arbitrary task selection, relaxed module
limits, and acceptance-with-follow-up are forbidden.

## Purpose

These rules govern implementation and review work for the `wt-runtime-distribution`
implementation pack.

They supplement:

- `docs/spec/implementation/wt-runtime-distribution/implementation-roadmap.md`
- `docs/spec/implementation/wt-runtime-distribution/implementation-tracker.md`
- `docs/spec/v1.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/architecture.md`

## Shared Quality Rules

- Keep `LaneTaskRunner` as the sole application NVB invocation boundary.
  Commands and application services cannot invoke NVB, Nirvana `cmd`, or a
  runtime executable directly.
- Keep one lower-layer owner per major concern: asset audit, manifest validation,
  data-root resolution, catalog staging, lane task runner, leaf adapter, managed assets, NVB
  staging automation, and integration smoke proof.
- Never evaluate lane config or state through shell execution in TypeScript.
  Parse strict scalar subsets only.
- Never log secrets or complete environment maps during invocation diagnostics;
  task/leaf-declared key names may be logged only after redaction.
- Never import `node:child_process`. An evidenced facade gap may use one narrow
  Nirvana `cmd` adapter behind `LaneTaskRunner` and the same explicit NVB target.
- Task/leaf environments are explicitly declared and derived from validated
  lane context; a `WT_` prefix alone is insufficient and `process.env` is never
  forwarded wholesale.
- Immutable version roots must not be writable after staging. The catalog must
  fail a write attempt against an existing version root.
- Managed lane links must validate the link target checksum against the runtime
  manifest; untargeted or checksum-mismatched links must fail.
- NVB tasks must not become alternate product commands. Use `nvb dist` for
  packaging; use `wt` commands for lane operations.
- Do not implement product behavior in `src/cli.ts` or `src/run.ts`.
- Do not create generic `helpers`, `utils`, `common`, or `misc` overflow modules.
  Use feature-local capsules with explicit owner names.
- Keep front doors, commands, and public barrels thin.
- Do not add npm convenience scripts. Use `nvb.json` or `runtime-nvb/` task
  surfaces for workflow automation.
- Do not commit `.local/` artifacts.
- Keep async contracts honest. No sync public methods wrapping async internals
  as a cosmetic workaround.
- Architect for injected filesystem/process boundaries so command specs do not
  require real tmux or global user-data mutation.

## Mandatory Core Reference Anchors

Implementation and review work for this pack must explicitly use these spec and
source owners as acceptance anchors.

### Repo-level guidance

- `AGENTS.md`
- `docs/spec/v1.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/architecture.md`
- `docs/spec/v1-implementation-map.md`

### Spec and boundary owners

- `docs/spec/v1.md` — §§7 (filesystem contract), 12 (runtime invocation contract),
  15 (packaging)
- `docs/spec/v1-contracts.md` — §§1 (precedence), 4 (routing), 11 (locking/transactions)
- `docs/spec/architecture.md` — §§4.5 (lane task runtime and leaf adapter),
  5.2 (user data), 6.3
  (runtime execution), 9.1 (trust zones)
- `docs/spec/schemas/v1.schema.json` — JSON Schema bundle

### Foundation and contract owners

- `src/contracts/` — manifest types, public runtime/knowledge shapes
- `src/foundation/` — asset audit, manifest validator, runtime catalog, data-root,
  lane task runner, leaf/foreground invocation, managed assets
- `runtime-nvb/` — distribution staging tasks
- `spec/integration/` — runtime smoke proof

### Build and workflow owners

- `nvb.json` and repository NVB handlers — development build/dist task owners;
  `nira.json` remains ecosystem metadata
- `package.json` — package metadata; no npm script sprawl

## Architectural Non-Negotiables

These are hard acceptance rules for every `wt-runtime-distribution` batch.

- Do not invoke NVB, Nirvana `cmd`, or a runtime leaf from a command/application
  service. Application invocation crosses `LaneTaskRunner`; leaves are reached
  only by their owning TaskHandlers through `LeafRuntimeInvoker`.
- Do not construct shell command strings. Use typed actions, explicit pinned
  NVB targets, and argv-only audited Nirvana command calls for leaves/fallback.
- Do not pass `process.env` wholesale. Supply only task-declared keys from
  validated context and redact all values from diagnostics.
- Do not create a second immutable-catalog owner. One catalog class stages and
  validates version roots.
- Do not create a second application task boundary. `LaneTaskRunner` owns typed
  action/target/result mapping; `LeafRuntimeInvoker` owns only cataloged leaves.
- Do not create a second managed-asset authority. One owner validates link
  targets, checksums, collisions, and escapes.
- Do not import `node:child_process` anywhere.
- Do not import `fs.promises.symlink` without preceding target validation and
  escape checks.
- Do not let a stale or missing runtime manifest produce a silent null-default
  execution path. Fail closed.
- Do not hide new ownership in vague modules such as `helpers`, `utils`,
  `common`, or `misc`.
- Do not launder foreign APIs through barrels or shim modules. Feature barrels
  export only symbols implemented in that feature or its child capsules.
- Do not return `null`, `false`, or empty data for an unsupported runtime state.
  Every path must return a complete component or a deterministic error.
- Do not silently accept a non-Watchtower directory as a runtime root.

## Required Ownership Shape

Every accepted batch must leave these questions answerable in concrete terms.

- Which exact lower-layer module owns the new behavior?
- Which front door validates/normalizes/delegates into that owner?
- Which existing wiring path exposes the capability?
- Which behavior remains explicitly outside that owner?

Reject the batch if the answer is "several places share it", "the adapter does
most of it", "config now knows everything", or "the runtime figures it out
later."

## Front-Door Rejection Rules

Reject any implementation where a top-level entry point becomes the lasting home
of deep behavior.

Examples of hard reject shapes:

- `NirvanaLaneTaskRunner` accumulating catalog/profile verification, context
  construction, event mapping, leaf execution, rendering, and policy in one
  class
- `RuntimeCatalog` owning XDG resolution, atomic staging, checksum validation,
  and version management without delegation
- `ManagedAssets` resolving symlink targets, checking collisions, validating
  checksums, and rendering compatibility names in one method
- a config file retaining imperative path construction or environment selection
  chains

Front doors may validate, normalize shallow input, resolve collaborators,
delegate, and expose prepared state. They must not become the main algorithm
owner.

## One-Owner Rejection Rules

Reject the batch if any important truth is recomputed in multiple layers.

This includes:

- runtime manifest parsing and validation
- knowledge manifest parsing and validation
- XDG data-root resolution and precedence
- atomic staging and content-addressed version roots
- `WT_*` environment construction and allowlisting
- OS account resolution and access checking
- subprocess argv construction and shell-mode prevention
- signal forwarding and exit-status preservation
- managed link target validation and checksum comparison
- symlink escape detection and collision refusal
- compatibility name resolution through the manifest action registry
- NVB dist layout construction and manifest validation

If configs, catalogs, and adapters each rebuild part of the same truth
independently, the batch is not acceptable.

## Module Size And Clean-Code Rules

This pack must not normalize god objects, giant files, or mixed-responsibility
modules.

Line count is a design alarm, not a license to pack unrelated behavior up to a
limit. Count physical source lines, including comments and blank lines, for new
files and materially rewritten files. Generated artifacts are outside these
targets only when their generated ownership is explicit and they contain no
hand-maintained behavior.

The project-wide engineering standard defines these exact size bands:

| Module category | Preferred maximum | Warning band | Hard rejection |
| --- | ---: | ---: | ---: |
| CLI command, NVB task front door, registry, renderer, public barrel | 120 | 121–160 | over 180 |
| Orchestrator, controller, coordinator, presenter | 140 | 141–180 | over 200 |
| Foundation service, planner, validator, adapter, store | 200 | 201–260 | over 300 |
| Contracts and type-only modules | 240 | 241–320 | over 400 |
| Test/spec modules | 300 | 301–420 | over 500 |

Functions target 40 lines or fewer, enter a warning band at 41–60 lines, and
are rejected above 80 lines. Constructors target 25 lines or fewer, enter a
warning band at 26–40 lines, and are rejected above 50 lines. A warning-band
module or function requires a responsibility inventory and explicit reviewer
judgment; reaching a hard limit is not an automatic entitlement to an
exception.

Every module must have one primary responsibility and one cohesive reason to
change. Commands and NVB TaskHandlers validate, normalize, delegate, and map
results; they do not become workflow owners. Orchestrators sequence focused
collaborators without absorbing storage, validation, rendering, subprocess, or
state-machine algorithms. Contracts remain type-only. Human rendering is not
mixed with mutation or persistence.

An exception must be approved before implementation and must identify the exact
file, the proposed maximum, the concrete reason splitting would make ownership
less clear, the approving reviewer, and an expiry or follow-up batch. A
retroactive exception is invalid. Existing oversized files are not precedent:
when touched they must become smaller, be split, or remain line-count neutral
with a recorded extraction plan and reviewer approval.

Naming is part of the structural gate. Class-owning TypeScript modules use
PascalCase filenames, functions and values use lowerCamelCase, and new source
filenames do not use dashes or underscores. Generic overflow owners such as
`helpers`, `utils`, `common`, and `misc` are rejected.

Larger test scenario matrices must be split by contract family, fixture owner,
or acceptance-ID range and share focused fixture builders rather than one giant
test file.
- Existing oversized files are not permission to add more behavior. If a batch
  must touch one, it should leave the file no larger unless the added lines are
  temporary extraction glue removed in the same batch. The report must record
  the before/after line count and the lower-layer owner used for extraction.

Responsibility gates apply independently of line count:

- Three or more independently nameable responsibilities in one module require
  a split, even when the file is below its preferred maximum.
- State transition policy, transport or driver I/O, mapping/normalization, and
  human rendering must not accumulate in one owner.
- A class that owns index compilation, query routing, digest verification, and
  corruption repair is a god object and must be rejected.
- A coordinator may sequence collaborators but must not absorb their algorithms;
  a registry may resolve owners but must not reimplement them.
- A barrel exports the capsule surface only and must not become a forwarding
  layer for foreign APIs.

Additional reject conditions:

- A file mixes unrelated concerns such as index building plus proposal validation
  plus effect journaling.
- A new helper bag (`helpers`, `utils`, `common`, `misc`) becomes the overflow owner.
- A large legacy file grows materially without extracting lower-layer ownership.
- Comments are used to justify mixed responsibility instead of splitting owners.

Every implementation report must include line counts for all new files and
materially rewritten files, categorized against the matrix above. Every review
report must independently reproduce or verify those counts and state whether
each warning-band file and function remains cohesive.
Passing the line-count gate never overrides the responsibility gates above.

## Agent Reasoning Classes And Batch Assignment

Reasoning classes are capability requirements, not vendor or model-version
claims. Operators should select the strongest currently available coding agent
that reliably meets the assigned class, has enough context for the complete
brief/spec/source set, and can execute and inspect repository tools. Named model
examples in launch prompts are non-normative and may become stale; the `R` class
and the work characteristics below are authoritative.

- `R3` — bounded repository reasoning: a narrow build-configuration or
  integration-smoke batch with explicit owners, limited state interaction, and
  focused proof
- `R4` — deep repository reasoning: cross-file contracts, public compatibility,
  ownership-boundary decisions, negative-path design, and independent source
  verification
- `R5` — highest available reasoning: interacting state machines, concurrency,
  security-boundary design, destructive/lock-ordered operations, multi-module
  integration, or final safety-gate authority

The reviewer class is never lower than the implementor class. A reviewer must
reason independently from the patch and implementation report; it is not enough
to confirm that the implementor followed a checklist.

| Batch | Implementor | Reviewer | Reason for the floor |
|-------|-------------|----------|----------------------|

Escalate a nominal `R3` or `R4` task to `R5` if source inspection reveals an
undocumented state machine, concurrency, destructive data behavior, an
ownership conflict across modules, or a required security decision not
settled by the governing specs. Do not lower a class because a prompt looks
short or because an implementation report claims the work is straightforward.

## Prompt Integrity And Non-Compression Rule

Launch prompts and durable briefs are safety artifacts. Their ownership rule,
read order, scope, mission, prohibitions, proof requirements, tracker duties,
machine-local report instructions, correction procedure, reasoning class, and
handoff requirements must not be removed or compressed into ambiguous shorthand.

- Expansion and clarification are encouraged when they make an invariant,
  owner, failure mode, proof obligation, or review procedure more explicit.
- Incorrect paths or claims must be replaced with equally detailed or more
  detailed correct content; deleting the surrounding instruction is not a fix.
- The implementation and reviewer lanes must each stand on their own. A reviewer
  prompt may refer to the paired work brief, but it must still state how to
  independently inspect source, reproduce proof, reject structural defects,
  record corrections, and update lane state.
- Machine-specific ownership instructions in launch prompts are protected
  operator controls. They must be retained verbatim unless the lane owner
  explicitly replaces them with an equally explicit rule.
- A short launch prompt is not acceptable merely because the durable brief is
  detailed. Agents may receive one artifact without prior conversation context,
  so each launch prompt must preserve the complete execution or review method.
- Both the top-level `Recommended agent/model class for forwarding` section and
  any later `Reasoning / Agent Class`, `Reasoning / Reviewer Class`, or
  `Reviewer Class` section must remain independently complete. Do not replace
  the primary-model, good-alternative, steering-only, prohibited-final-pass,
  suitability, context-retention, or final-authority tiers with only an `R`
  label and a one-line rationale.

## File And Module Naming Rules

Apply the Watchtower repo's source naming conventions strictly:

- Class and main module files: PascalCase (for example,
  `NirvanaLaneTaskRunner.ts`)
- Non-class module files: lowerCamelCase (e.g., `runtimeInvoke.ts`)
- Directory names for source/spec: lowerCamelCase or feature-name
- No dash-case or underscore-case in JS/TS source/spec paths
- Forbid directory-shadow sibling module files. If a directory exists at
  `path/<name>/`, do not create `path/<name>.ts`

## Security Rejection Rules

Reject the batch if it introduces any of the following:

- direct `node:child_process`, implicit NVB target discovery, or string-based
  command construction
- complete `process.env` passed to a task or leaf
- secrets or environment values logged at any verbosity level
- runtime entrypoint invocation without cwd, account, or access validation
- a symlink target accepted without checksum comparison against the runtime
  manifest
- a managed link that escapes the lane root after symlink resolution
- a managed link that overwrites a non-managed file without refusal
- an XDG path constructed from unsanitized user input
- a runtime version directory accepted without `^[0-9]+\.[0-9]+\.[0-9]+(-.+)?$`
  validation
- writable permissions left on a staged immutable runtime root

## Compatibility Rejection Rules

Reject the batch if it introduces any of the following:

- a runtime script invoked from a path not validated by the runtime catalog
- a `WT_*` variable leaked from the calling process environment rather than
  constructed from resolved lane context
- a signal forwarding path that swallows SIGINT or SIGTERM
- a non-zero exit status that is silently mapped to zero
- a version root that is writable after the atomic staging commit point
- a managed link that can be created for a non-managed declared path
- a collision that is silently overwritten rather than refused
- a compatibility name that does not appear in the packaged runtime manifest's
  `actions` array

## Documentation And Machine-Local Rules

- Keep normative specifications, public documentation, durable work briefs, and
  durable review briefs machine-neutral.
- Paired `*-agent-launch-prompt.md` files are explicit operator artifacts and
  may retain checkout-specific user/ownership instructions when the lane owner
  intentionally requires them. Do not copy those instructions into normative
  specs, public docs, or durable work/review briefs.
- If a machine-local operator note is needed for a specific checkout, keep it in
  untracked local artifacts under `.local/agent-reports/` or communicate it
  outside committed repo docs.
- Keep committed docs repo-relative and machine-neutral unless a brief
  explicitly requires documenting a local-only artifact, and even then prefer
  anonymized wording.

## Proof And Evidence Requirements

No batch is acceptable on narrative confidence alone.

- A batch must land or update focused specs that exercise the behavior
  introduced in that batch.
- RT-01 must prove every inherited shell script and knowledge doc is inventoried
  with provenance.
- RT-02 must prove manifest validation rejects every expected failure class.
- RT-03 must prove `nvb dist` output matches the packaged manifest with zero
  drift.
- RT-04 must prove XDG precedence, atomic staging, and version coexistence.
- RT-05 must prove argv-only execution, `WT_*` allowlisting, cwd/account/access
  validation, and signal/exit forwarding.
- RT-06 must prove link target checksum validation, collision refusal, and
  path-escape rejection.
- RT-07 must prove relocated package wake output, signal behavior, and worker
  account read-but-cannot-write enforcement.
- Reports must record the real commands run, the actual outcome, and any honest
  limitation.
- "Not run yet", "reviewer can run later", or "covered by existing behavior" is
  not sufficient when the batch changes runtime-distribution truth.

## Reviewer Hard-Reject Checklist

Reject the batch immediately if any answer is "yes."

1. Did a command or application service invoke NVB, Nirvana `cmd`, or a runtime
   leaf without crossing `LaneTaskRunner`, or did a leaf bypass its owning
   TaskHandler and `LeafRuntimeInvoker`?
2. Did a front door become the main owner of catalog/profile validation,
   environment construction, event/result mapping, or leaf execution?
3. Is any important behavior owned by more than one module or layer (e.g., two
   modules independently constructing task environments)?
4. Did the implementation guard only the final invocation while allowing
   unsanitized environment or shell evaluation?
5. Can a caller select an arbitrary task/config/module/leaf, cause implicit
   project `nvb.json` discovery, or reach direct raw subprocess execution?
6. Did the runner or leaf adapter pass complete `process.env`?
7. Are secrets, environment values, or command arguments logged at any verbosity
   level?
8. Was proof omitted, deferred, mis-layered, only narrated, or run through an
   ad hoc script rather than the accepted test surfaces?
9. Were tracker/roadmap/status docs left stale after the batch outcome?
10. Did the patch introduce machine-local committed documentation such as
    username-specific shell instructions?
11. Did the patch choose file naming or module placement contrary to the repo's
    naming conventions?
12. Did the patch bypass the established foundation structure with a parallel
    convenience owner?
13. Did any new module exceed the pack's size/clean-code bar without a narrow,
    source-backed exception?
14. Did the patch modify non-allowlisted package areas or add npm convenience
    scripts for testing or workflow?
15. Did the NVB dist pipeline fail to validate packaged manifests against actual
    files?
16. Did any managed link accept a target without checksum validation, or fail to
    refuse collision/path-escape?

## Required Acceptance Narrative

Every accepted review should state, in concrete terms:

- the exact owner modules for the behavior
- how runtime invocation contracts were proved
- what proof was rerun
- what status/spec docs were synchronized
- any intentionally deferred question that remains deferred rather than guessed

If the reviewer cannot write that summary precisely, the batch is not ready to
accept.

## Batch Hygiene Rules

- Implementation agents do not commit.
- The paired reviewer owns acceptance and commit.
- Every batch needs a durable report in `.local/agent-reports/wt-runtime-distribution/`.
- Every review batch needs a durable review report under
  `.local/agent-reports/wt-runtime-distribution/reviews/`.

## Package-Script Policy Rule

- This is Watchtower/Nirvana: use `nvb` task/group surfaces for workflow
  automation.
- Do not add ad hoc npm scripts in `package.json` for agent convenience,
  temporary fixes, or one-off maintenance flows.
- Keep `package.json` `scripts` minimal and only when there is a clear
  product/runtime requirement.
- If a new packaged workflow is needed, add it to reviewed `runtime-nvb/`
  fragments/handlers and regenerate the catalog. Repository development
  workflows use the actual `nvb.json`/handler surface. Do not use `nira.json`
  as an invented task registry.

## Synchronized 74-batch reasoning authority

This table is the authoritative assignment floor and supersedes earlier illustrative ranking prose.

| Batch | Implementer | Reviewer | Basis |
|---|---|---|---|
| RT-01 | R4 | R4 | Source provenance; no omitted action/doc; every script classified as TaskHandler, leaf, temporary wrapper, or removal |
| RT-02 | R4 | R4 | Every asset/checksum/mode/action represented; missing/extra/checksum/mode rejection |
| RT-03 | R3 | R3 | Required dist including SQLite closure; executable preservation; reproducible validation; no source-link fallback |
| RT-04 | R4 | R4 | XDG precedence; atomic first stage; two versions coexist; immutable version roots |
| RT-05 | R5 | R5 | Explicit pinned NVB target; allowlisted action→task map; typed events/results; argv-only leaves; environment/cwd/account/access validation; signal/exit forwarding; NVB API gap proof |
| RT-06 | R4 | R4 | Manifest-only ownership; task catalog/profile pin; project nvb.json unchanged; link targets/checksums; collision/path-escape refusal |
| RT-07 | R3 | R3 | Relocated package works; catalog/profile escape rejected; structured task result; wake stdout/signal behavior; worker accounts read but cannot write |
| RT-08 | R5 | R5 | Complete transitive closure; fresh-prefix install; no wildcard, E404, local path, or source/ecosystem symlink |
| RT-09 | R5 | R5 | Duplicate/dangling/stale rejection; profile cannot add code/tasks; deterministic aggregate |
| RT-10 | R4 | R4 | Public TaskHandler API; schema-valid input/result/events; no product policy or future capability stubs |


## Shared Launch Envelope Authorization

Every active work and review prompt has `../agent-launch-contract.md` as a mandatory direct dependency. The launcher must co-deliver that contract, the batch-specific prompt, and paired brief as one self-contained envelope. This is the only permitted deduplication of launch method. A prompt may be concise only when it directly names the contract and still states the exact batch ID/title, dependencies, ownership, proof, implementer/reviewer reasoning floors, report/correction paths, checkout/ownership controls, role authority, and durable handoff or verdict. Missing or stale envelope members reject dispatch; links alone never replace batch-specific scope.
