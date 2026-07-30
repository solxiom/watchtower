# Watchtower v1 Read Model Implementation Quality And Agent Rules

> **Draft pack-authoring artifact.** This document is not a seal, acceptance
> record, or authority to initialize a lane. Before pack acceptance, reconcile
> it with `docs/spec/v1-implementation-map.md`,
> `docs/development/engineering-and-review-standard.md`, and
> `docs/spec/nirvana-integration-architecture.md`. The normative precedence in
> `docs/spec/v1-contracts.md` governs every conflict.

All implementation/review work uses thin Nirvana command front doors,
capability-owned foundation modules, the immutable packaged NVB task catalog,
`LaneTaskRunner`, diagnostic-only Nirvana logging, appropriately bounded
Nirvana storage adapters, and manifest-declared shell leaves only. Project
`nvb.json` files, workflow-level shell, arbitrary task selection, relaxed module
limits, and acceptance-with-follow-up are forbidden.

Status: active lane quality rules
Date: 2026-07-30

## Purpose

These rules govern implementation and review work for the Watchtower v1
wt-read-model delivery lane.

They supplement:

- `docs/spec/implementation/wt-read-model/implementation-roadmap.md`
- `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- `docs/spec/v1.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/architecture.md`

## Shared Quality Rules

- Keep `src/contracts/` as the single source of truth for domain types, errors,
  and exit codes.
- Keep one lower-layer owner per major concern: types/errors, serialization,
  paths/workspace, env parsing, state parsing, event parsing, discovery,
  selection, membership, bindings, conflicts, observations, heartbeats.
- Keep foundation modules free of command logic, rendering decisions, or
  CLI argument validation.
- Keep commands thin: argument validation plus foundation-service delegation
  plus rendering. No duplicate path, parser, or discovery logic.
- Do not implement behavior in the wrong package. Contracts must not own
  filesystem, parsing, or rendering logic. Foundation must not own command
  orchestration.
- Do not create helper bags (`helpers`, `utils`, `common`, `misc`). Use
  feature-local capsules with explicit owner names.
- Do not commit `.local/` artifacts.
- Read-only commands perform zero hidden writes or repairs.
- Path/config/untrusted-input boundaries fail closed.
- No shell evaluation of lane config or state by TypeScript.
- Human and JSON outputs derive from the same status contract.
- Non-Watchtower lane directories are ignored and never mutated.

## Mandatory Core Reference Anchors

Implementation and review work for this lane must explicitly use these repo
standards and source owners as acceptance anchors, not just general style
intuition.

### Repo-level guidance

- `AGENTS.md`
- `docs/spec/v1.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/architecture.md`
- `docs/spec/v1-implementation-map.md`
- `docs/spec/schemas/v1.schema.json`

### Spec and boundary owners

- `docs/spec/v1.md` — §§9-11 for discovery, commands, status
- `docs/spec/v1-contracts.md` — §§1-2, 8 for precedence, public command contract
- `docs/spec/architecture.md` — §§4, 6 for foundation services, read flows
- `docs/spec/schemas/v1.schema.json` — `commandResult`, `commandError`, `laneStatus`, `resolvedConfig`, `durableEvent`

### Foundation contract owners

- `src/contracts/types.ts` — domain types, lane references, repository bindings
- `src/contracts/errors.ts` — error taxonomy, exit-code mappings
- `src/contracts/exitCodes.ts` — exit-code constants
- `src/contracts/events.ts` — worker-event types
- `src/foundation/commandEnvelopeSerializer.ts` — JSON envelope construction
- `src/foundation/ResultRenderer.ts` — human/JSON parity rendering
- `src/foundation/canonicalPaths.ts` — canonical path resolution
- `src/foundation/workspaceResolver.ts` — workspace and control-home resolution
- `src/foundation/dataHomeResolver.ts` — XDG data-home resolution
- `src/foundation/scalarLineParser.ts` — shared parser utilities
- `src/foundation/EnvParser.ts` — strict env-file parser
- `src/foundation/StateParser.ts` — lane-state parser
- `src/foundation/JsonlParser.ts` — JSONL event parser
- `src/foundation/laneDiscovery.ts` — home-lane discovery
- `src/foundation/LaneSelector.ts` — deterministic lane selection
- `src/foundation/membershipIndex.ts` — membership-index validation
- `src/foundation/SecondaryDiscovery.ts` — secondary-repository discovery
- `src/foundation/repositoryBindings.ts` — repository binding computation
- `src/foundation/writableConflicts.ts` — writable conflict detection
- `src/foundation/runtimeObservations.ts` — tmux/watcher/worker observations
- `src/foundation/heartbeatObservation.ts` — heartbeat detection

## Architectural Non-Negotiables

These are hard acceptance rules for every wt-read-model batch.

- Do not put product logic in `src/cli.ts` or `src/run.ts`.
- Do not make a command class the owner of path, parser, or discovery logic.
- Do not import command classes from foundation modules.
- Do not import Nirvana-rendering classes into `src/contracts/`.
- Do not parse lane files or construct runtime script paths in command classes.
- Do not hide new ownership in vague modules such as `helpers`, `utils`,
  `common`, or `misc`.
- Do not return `null` or empty data for an unsupported state. Every resolution
  path must return a complete result or a deterministic error.
- Do not silently repair invalid or missing state in read-only paths.
- Do not execute shell scripts or `source` config files from TypeScript.
- Do not launder foreign APIs through barrels or shim modules. Feature barrels
  export only symbols implemented in that feature or its child modules.

## Required Ownership Shape

Every accepted batch must leave these questions answerable in concrete terms.

- Which exact lower-layer module owns the new behavior?
- Which front door validates/normalizes/delegates into that owner?
- Which existing wiring path exposes the capability?
- Which behavior remains explicitly outside that owner?

Reject the batch if the answer is "several places share it", "the serializer does
most of it", "the config now knows everything", or "the command figures it out
later."

## Front-Door Rejection Rules

Reject any implementation where a top-level entry point becomes the lasting home
of deep behavior.

Examples of hard reject shapes:

- `StatusCommand.ts` accumulating parser, discovery, binding, and observation
  logic
- `ListCommand.ts` owning lane discovery, membership lookups, and path resolution
- `Serializer.ts` defining domain types or error codes
- `Paths.ts` owning workspace resolution and config parsing
- `cli.ts` resolving lanes or constructing runtime paths

Front doors may validate, normalize shallow input, resolve collaborators,
delegate, and expose prepared state. They must not become the main algorithm
owner.

## One-Owner Rejection Rules

Reject the batch if any important truth is recomputed in multiple layers.

This includes:

- error code to exit code mapping
- path canonicalization and escape validation
- workspace and control-home resolution
- env-file scalar grammar parsing
- lane-state key normalization
- JSONL record validation
- lane selection precedence and ambiguity resolution
- membership-index entry validation
- repository binding computation
- claim overlap classification
- heartbeat staleness threshold
- config value redaction

If commands, serializers, and foundation modules each rebuild part of the same
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

- `R3` — bounded repository reasoning: a narrow observation or integration batch
  with explicit owners, limited state interaction, and focused proof. Used for
  observation mechanics where presence reading has no lifecycle authority.
- `R4` — deep repository reasoning: cross-file contracts, public compatibility,
  ownership-boundary decisions, negative-path design, and independent source
  verification. Used for type systems, error taxonomies, JSON contracts,
  path resolution, parsers, event parsing, membership, and bindings.
- `R5` — highest available reasoning: interacting state machines, complete
  ambiguity matrices, selection precedence, command integration across all
  foundation services, and final evidence/closure authority. Used for
  discovery/selection and command integration where the complete ambiguity
  matrix must be exhaustively proved.

The reviewer class is never lower than the implementor class. A reviewer must
reason independently from the patch and implementation report; it is not enough
to confirm that the implementor followed a checklist.

| Batch | Implementor | Reviewer | Reason for the floor |
|-------|-------------|----------|----------------------|
| RM-01 | R4 | R4 | Type system foundation, error taxonomy determines every downstream exit code |
| RM-02 | R4 | R4 | JSON contract and schema validation; additive compatibility requires boundary reasoning |
| RM-03 | R4 | R4 | Path resolution with symlink/case/path-escape security boundaries |
| RM-04 | R4 | R4 | Strict parsers with shell safety; malicious input corpus must never execute |
| RM-05 | R4 | R4 | Event parsing with malformation handling, role/event compatibility matrices |
| RM-06 | R5 | R5 | Discovery with complete ambiguity matrix and symlink/case safety across descendant walks |
| RM-07 | R4 | R4 | Membership with staleness detection; advisory reads with no-repair proof |
| RM-08 | R4 | R4 | Bindings with conflict detection; claim overlap matrix requires boundary reasoning |
| RM-09 | R3 | R3 | Observation mechanics; no lifecycle authority or state mutation |
| RM-10 | R5 | R5 | Command integration across all foundation services; full matrix proof across 7 fixture classes |

Escalate a nominal `R3` or `R4` task to `R5` if source inspection reveals an
undocumented state machine, concurrency, destructive data behavior, an
ownership conflict across modules, or a required compatibility decision not
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

## Proof And Evidence Requirements

No batch is acceptable on narrative confidence alone.

- A batch must land or update focused specs that exercise the behavior
  introduced in that batch.
- Foundation batches (RM-01–RM-09) must add focused unit and integration tests
  in the appropriate spec locations.
- Command batches (RM-10) must run complete command specs with fixture workspaces
  covering empty, single-lane, ambiguous, invalid, multi-repository,
  stale-index, and busy-lock states.
- Reports must record the real commands run, the actual outcome, and any honest
  limitation.
- "Not run yet", "reviewer can run later", or "covered by existing behavior" is
  not sufficient when the batch introduces new foundation behavior.
- A correctness checkmark means implementation plus evidence, not the
  existence of a type definition.
- Do not add npm scripts or convenience wrappers to run tests. Use existing
  NVB task surfaces.

## Reviewer Hard-Reject Checklist

Reject the batch immediately if any answer is "yes."

1. Did product logic enter `src/cli.ts`?
   — _The CLI host must remain a thin Nirvana runner with no lane logic._

2. Did shell eval of lane config occur by TypeScript?
   — _Config must be parsed by the strict non-executing scanner; no `source`, `sh -c`, `exec`, or `eval`._

3. Did any new or materially rewritten module, function, or constructor exceed
   its category-specific hard limit from the project-wide matrix, or did a
   warning-band owner lack an independently reviewed responsibility inventory?
   — _Commands reject above 180, orchestrators above 200, foundation owners
   above 300, contracts above 400, tests above 500, functions above 80, and
   constructors above 50; responsibility gates may reject earlier._

4. Did a new `helpers`, `utils`, `common`, or `misc` bag appear?
   — _No generic overflow containers. Use feature-local capsules with explicit owner names._

5. Did a command or foundation module directly import across the layer boundary?
   — _Commands must not import foundation internals directly (use the foundation barrel). Foundation must not import command classes._

6. Did a read-only path perform a hidden write?
   — _Status, list, config show, discovery, membership reads, and observations must not stage runtimes, update trackers, write lock files, or repair state._

7. Did the implementation introduce an untracked error code or exit code?
   — _Every error code must be registered in the error taxonomy with an exit-code mapping. No ad hoc numeric codes._

8. Did a path resolved from config escape its declared binding or root?
   — _Symlink, `..`, null byte, and control character escapes must be rejected. Escape fixtures must prove rejection._

9. Were tracker/roadmap/spec status docs left stale after the batch outcome?
   — _Every accept or reject must synchronize `implementation-tracker.md`, `implementation-roadmap.md`, and relevant spec status markers._

10. Were `.local/` artifacts staged or committed?
    — _Reports, agent output, and local notes must never be tracked by Git._

11. Did a public interface lack TypeScript type declarations?
    — _Every exported function, class, and type must have explicit types. No `any`-typed public contracts._

12. Did error context include secrets, credentials, or full environment maps?
    — _Error messages must redact credential-bearing keys. Config redaction uses key-based pattern matching._

13. Was a model or agent class name embedded in source code?
    — _No provider, model, or agent names in committed implementation code. Adapters stay abstract._

14. Did a command duplicate path or discovery logic already in foundation?
    — _Commands delegate to foundation services. Duplicated `realpath`, `.watchtower` walk, or lane.json parsing is rejected._

15. Did help fragment content drift from command behavior?
    — _Help must match implemented flags, options, and output. `--help` must reflect the current code, not aspirational behavior._

16. Was reviewer acceptance conflated with Git publication?
    — _The reviewer owns the acceptance commit. Acceptance must precede any push or publication._

## Required Acceptance Narrative

Every accepted review should state, in concrete terms:

- the exact owner modules for the behavior
- how read-only integrity was proved (zero writes)
- what proof was rerun
- what status/spec docs were synchronized
- any intentionally deferred question that remains deferred rather than guessed

If the reviewer cannot write that summary precisely, the batch is not ready to
accept.

## Batch Hygiene Rules

- Implementation agents do not commit.
- The paired reviewer owns acceptance and commit.
- Every batch needs a durable report in `.local/agent-reports/wt-read-model/`.
- Every review batch needs a durable review report under
  `.local/agent-reports/wt-read-model/reviews/`.

## Documentation Rules

- User-facing command help is not optional cleanup.
- Internal spec/status docs must stay synchronized with acceptance state.
- Keep the v1.md command status markers updated as features land.
- Update help fragments when command behavior changes.
- Do not use `nvb build` or `nvb test` as the only acceptance evidence without
  recording the exact command and full output.

## Package-Script Policy Rule

- This is Nirvana: use `nvb` task/group surfaces for workflow automation.
- Do not add ad hoc npm scripts in package manifests for agent convenience,
  temporary fixes, or one-off maintenance flows.
- Keep package `scripts` minimal and only when there is a clear product/runtime
  requirement.
- If a new workflow is needed, add it to the package-local `nvb.json` task
  surface instead of expanding `package.json` scripts.
