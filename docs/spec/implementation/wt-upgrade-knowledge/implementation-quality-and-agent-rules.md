# wt-upgrade-knowledge Implementation Quality And Agent Rules

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

These rules govern implementation and review work for the wt-upgrade-knowledge
pack.

They supplement:

- `docs/spec/implementation/wt-upgrade-knowledge/implementation-roadmap.md`
- `docs/spec/implementation/wt-upgrade-knowledge/implementation-tracker.md`
- `docs/spec/v1.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/schemas/v1.schema.json`

## Shared Quality Rules

- Preview is the default for `wt upgrade` and `wt skill install`. No mutation
  occurs without explicit operator confirmation (`--apply`, `--replace`).
- Manifest-last rule: `install.json` is written after every staged asset is
  fsynced and checksum-verified. An interrupted upgrade before the manifest
  write leaves the old binding authoritative.
- Old runtime must remain invocable after a failed or interrupted upgrade.
  The previous manifest and links stay in place until the new ones are proven.
- Lane-owned values, operator-session journals, pins, lifecycle identities,
  and config files are never overwritten by upgrade or migration.
- Migration steps are pure functions from old schema version to new schema
  version. They must not execute runtime actions, close sessions, prune content,
  or change lifecycle states.
- Downgrade must be explicitly requested and must fail when the target
  runtime does not declare backward compatibility for the lane's current
  schema version.
- Host adapters must preview destinations before writing. Non-interactive
  contexts require `--replace`.
- No lane-specific state (home paths, lane IDs, tmux prefixes, repository
  bindings) may be embedded in installed knowledge skills.
- No false claim may be made that a host notification is configured or active.
- Version reporting must derive all four version components from verifiable
  sources, not from hardcoded constants.
- Keep front doors, commands, and renderers thin. Foundation services own the
  detailed algorithms.
- Do not duplicate path, parser, or runtime logic in commands.
- Do not commit `.local/` artifacts.

## Mandatory Core Reference Anchors

Implementation and review work for this pack must explicitly use these specs
and source owners as acceptance anchors, not just general style intuition.

### Repo-level guidance

- `AGENTS.md`
- `docs/spec/v1.md`
- `docs/spec/architecture.md`

### Spec and boundary owners

- `docs/spec/v1.md` — §11.5 (upgrade command), §11.8 (skill install command),
  §10.3 (version command), §7 (filesystem contract), §6 (ownership model),
  §14 (safety and concurrency)
- `docs/spec/v1-contracts.md` — §11 (locking, transactions, and recovery)
- `docs/spec/schemas/v1.schema.json` — `upgradePlan`, `versionReport`,
  `mutationResult`
- `docs/spec/v1-implementation-map.md` — §7 (Pack 4 specification)

### Foundation service owners

- `src/foundation/UpgradePlanner.ts` — compatibility matrix, classification,
  read-only preview
- `src/foundation/MigrationRegistry.ts` — version-step registry, dependency
  ordering
- `src/foundation/MigrationSteps.ts` — individual migration step execution
- `src/foundation/UpgradeApply.ts` — manifest-last atomic switch
- `src/foundation/UpgradeRecovery.ts` — crash recovery, old-runtime validation
- `src/foundation/HostAdapters.ts` — adapter factory, preview/replace/scope

### Command owners

- `src/commands/UpgradeCommand.ts` — user-facing upgrade orchestration
- `src/commands/SkillInstallCommand.ts` — user-facing skill install orchestration
- `src/commands/VersionCommand.ts` — version reporting

### Build and workflow owners

- `nvb.json` task surfaces — no npm script sprawl
- `help/commands/` — static help fragments

## Architectural Non-Negotiables

These are hard acceptance rules for every upgrade-knowledge batch.

- Do not implement upgrade planning logic inside `UpgradeCommand.ts`. The
  command delegates to `UpgradePlanner.ts`.
- Do not combine migration steps with runtime execution or session lifecycle
  changes.
- Do not write `install.json` before all managed assets are staged, fsynced,
  and checksum-verified.
- Do not remove old runtime links before the new manifest is written and
  verified.
- Do not embed lane-specific state in host skill installation paths.
- Do not claim a host notification is verified when only files were placed.
- Do not hardcode version strings in `VersionCommand.ts`.
- Do not implement host-adapters with knowledge of the upgrade pipeline or
  migration registry. Host adapters are independent of upgrade mechanics.
- Do not add foundation services to `src/cli.ts`. Commands own orchestration;
  thin `cli.ts` stays thin.
- Do not return `null`, `false`, or empty data for a missing required fact.
  Every resolution path must return a complete result or a deterministic error.
- Do not silently skip an unmanaged collision during upgrade. Stop and report.
- Do not allow downgrade without explicit `--allow-downgrade` and schema
  compatibility proof.

## Required Ownership Shape

Every accepted batch must leave these questions answerable in concrete terms.

- Which exact foundation module owns the new behavior?
- Which command class validates/normalizes/delegates into that owner?
- Which existing wiring path exposes the capability?
- Which behavior remains explicitly outside that owner?

Reject the batch if the answer is "several places share it", "the command does
most of it", "the config now knows everything", or "the runtime figures it out
later."

## Front-Door Rejection Rules

Reject any implementation where a command class becomes the lasting home of
deep behavior.

Examples of hard reject shapes:

- `UpgradeCommand` owning the compatibility-matrix comparison algorithm
- `SkillInstallCommand` owning per-host filesystem layout logic
- `VersionCommand` owning manifest parsing and version derivation
- `UpgradeCommand` owning lock acquisition and recovery orchestration

Commands may validate arguments, resolve foundation services, delegate, and
render output. They must not become the main algorithm owner.

## One-Owner Rejection Rules

Reject the batch if any important truth is recomputed in multiple layers.

This includes:

- compatibility matrix computation and asset classification
- migration step version ordering and dependency resolution
- manifest staging order and atomic switch sequence
- crash-recovery detection and old-manifest restoration
- host destination-path resolution and scope filtering
- version reporting derivation from manifest sources

If a command, a foundation service, and a helper each rebuild part of the same
truth independently, the batch is not acceptable.

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

- `R3` — bounded repository reasoning: a narrow adapter or reporting task with
  explicit owners, limited state interaction, and focused proof
- `R4` — deep repository reasoning: cross-file contracts, compatibility
  boundaries, ownership-boundary decisions, negative-path design, and
  independent source verification
- `R5` — highest available reasoning: interacting state machines, crash
  recovery, atomicity guarantees, destructive operations, multi-module
  integration, or final evidence/closure authority

The reviewer class is never lower than the implementor class. A reviewer must
reason independently from the patch and implementation report; it is not enough
to confirm that the implementor followed a checklist.

| Batch | Implementor | Reviewer | Reason for the floor |
|-------|-------------|----------|----------------------|

Escalate a nominal `R3` task to `R4` or `R4` to `R5` if source inspection
reveals an undocumented state machine, concurrency, destructive data behavior,
an ownership conflict across modules, or a required compatibility decision not
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
  label and a one-line rationale. Repetition is preferable to losing forwarding
  instructions when an operator copies only one of those sections.

## Compatibility Rejection Rules

Reject the batch if it introduces any of the following:

- a change to lane-owned values (`lane.config.env`, `repositories.local.json`,
  `model-plan.md`) during upgrade or migration
- a regression in operator-session journal or pin integrity after migration
- a version report that disagrees with the actual installed manifest
- a hardcoded version string that diverges from `package.json` or the
  packaged manifests
- a silent overwrite of a lane-owned file during upgrade
- a downgrade that proceeds without `--allow-downgrade` or incompatible
  schema version
- a host skill install that embeds lane paths, lane IDs, tmux prefixes, or
  repository bindings
- a false claim that host notification is configured or verified
- an upgrade preview that mutates lane state (links, manifests, or config)

## Proof And Evidence Requirements

No batch is acceptable on narrative confidence alone.

- A batch must land or update focused specs that exercise the behavior
  introduced in that batch.
- UK-01 tests must prove every classification outcome independently with
  synthetic manifest fixtures.
- UK-02 tests must prove every migration step preserves all laned-owned
  artifacts with exact byte comparisons.
- UK-03 tests must prove crash recovery at every staged write point with
  real filesystem operations in temporary fixture workspaces.
- UK-04 tests must prove every host adapter previews correctly, refuses
  without `--replace` in non-interactive mode, and records the installed
  version.
- UK-05 tests must prove all four version components, two-version coexistence,
  collision detection, and failed-migration recovery.
- Reports must record the real commands run, the actual outcome, and any
  honest limitation.
- "Not run yet", "reviewer can run later", or "covered by existing behavior"
  is not sufficient when the batch changes upgrade or migration truth.
- Do not add npm scripts or convenience wrappers to run tests. Use existing
  package test surfaces or NVB tasks.

## Reviewer Hard-Reject Checklist

Reject the batch immediately if any answer is "yes."

1. Did the implementation bypass the `UpgradePlanner.ts` or `MigrationRegistry.ts` foundation services and put algorithm logic directly in a command class?

2. Did a command become the main owner of compatibility checking, manifest comparison, link staging, crash recovery, or version derivation?

3. Is any important truth (compatibility matrix, migration ordering, staging sequence, host destination paths) computed in more than one module or layer?

4. Did the implementation guard only the final output while allowing a preview to mutate lane state or an upgrade to proceed with unverified checksums?

5. Does an upgrade or migration step overwrite, delete, or alter lane-owned values, operator-session journals, pins, lifecycle identities, or config files?

6. Did the implementation write `install.json` before all managed assets were staged, fsynced, and checksum-verified?

7. Does a crash during or after upgrade leave the old runtime uninvocable or leave a stale manifest authoritative without a recovery path?

8. Is a downgrade possible without `--allow-downgrade`, or does an incompatible downgrade succeed silently?

9. Was proof omitted, deferred, mis-layered, only narrated, or run through an ad hoc script rather than the accepted test surfaces?

10. Were tracker/roadmap/status docs left stale after the batch outcome?

11. Did the patch introduce machine-local committed documentation such as username-specific shell instructions or local filesystem paths?

12. Did the patch choose file naming or module placement contrary to the repo's TypeScript source conventions (`src/commands/`, `src/foundation/`, `src/contracts/`)?

13. Did any new module exceed the pack's size/clean-code bar without a narrow, source-backed exception?

14. Did the patch modify non-allowlisted package areas or add npm convenience scripts for testing or workflow?

15. Does a host adapter embed lane-specific state (home paths, lane IDs, tmux prefixes, repository bindings) in installed knowledge skills, or claim host notification is active without verifying?

16. Does `wt version` return a hardcoded string instead of deriving version components from `package.json`, `install.json`, and the packaged manifests?

## Required Acceptance Narrative

Every accepted review should state, in concrete terms:

- the exact owner modules for the behavior
- how lane-owned values were proved preserved
- what proof was rerun independently
- what status/spec docs were synchronized
- any intentionally deferred question that remains deferred rather than guessed

If the reviewer cannot write that summary precisely, the batch is not ready to
accept.

## Batch Hygiene Rules

- Implementation agents do not commit.
- The paired reviewer owns acceptance and commit.
- Every batch needs a durable report in `.local/agent-reports/wt-upgrade-knowledge/`.
- Every review batch needs a durable review report under
  `.local/agent-reports/wt-upgrade-knowledge/reviews/`.

## Documentation Rules

- User-facing help fragments are not optional cleanup.
- Internal spec/status docs must stay synchronized with acceptance state.
- Update `docs/spec/v1.md` command-status markers when a batch is accepted.
- Keep `docs/spec/v1-implementation-map.md` §7 pack status synchronized.
- Update the schema bundle if a batch introduces new JSON contract fields.

## Package-Script Policy Rule

- This is Nirvana: use `nvb` task/group surfaces for workflow automation.
- Do not add ad hoc npm scripts in package manifests for agent convenience,
  temporary fixes, or one-off maintenance flows.
- Keep package `scripts` minimal and only when there is a clear product/runtime
  requirement.

## Synchronized 74-batch reasoning authority

This table is the authoritative assignment floor and supersedes earlier illustrative ranking prose.

| Batch | Implementer | Reviewer | Basis |
|---|---|---|---|
| UK-01 | R4 | R4 | Runtime/knowledge/schema matrix; changed/preserved/conflict classification |
| UK-02 | R5 | R5 | Closed declared transitions only; no fictional versions; capability-owned rebuild adapters; value/history/pin/lifecycle preservation |
| UK-03 | R5 | R5 | Manifest-last switch; crash recovery; old runtime remains usable; guarded downgrade |
| UK-04 | R3 | R3 | Preview/replace/scope behavior; version record; no false notification claim |
| UK-05 | R3 | R4 | CLI/runtime/knowledge/schema report; two-version fixtures; collision and failed migration |


## Shared Launch Envelope Authorization

Every active work and review prompt has `../agent-launch-contract.md` as a mandatory direct dependency. The launcher must co-deliver that contract, the batch-specific prompt, and paired brief as one self-contained envelope. This is the only permitted deduplication of launch method. A prompt may be concise only when it directly names the contract and still states the exact batch ID/title, dependencies, ownership, proof, implementer/reviewer reasoning floors, report/correction paths, checkout/ownership controls, role authority, and durable handoff or verdict. Missing or stale envelope members reject dispatch; links alone never replace batch-specific scope.
