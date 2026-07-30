# Watchtower v1 Release Implementation Quality And Agent Rules

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

Status: active pack quality rules
Date: 2026-07-30

## Purpose

These rules govern implementation and review work for the Watchtower v1
release qualification pack.

They supplement:

- `docs/spec/implementation/wt-v1-release/implementation-roadmap.md`
- `docs/spec/implementation/wt-v1-release/implementation-tracker.md`
- `docs/spec/v1.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/architecture.md`
- `docs/spec/v1-implementation-map.md`

## Shared Quality Rules

- Do not add product features. This pack qualifies; it does not implement new
  commands, foundation modules, or runtime scripts.
- Test fixtures must exercise the globally installed `wt` binary through the
  same interface available to an operator. Mock-heavy acceptance trials that
  bypass the real CLI, filesystem, or Git are rejected.
- Security evidence must include negative-path fixtures: traversal attempts,
  shell injection in config, permission violations, checksum mismatches.
- Performance evidence must use synthetic scaling fixtures (30, 300, 3,000,
  10,000 batch packs) and report actual wall time and output size, not
  asymptotic estimates.
- Every release acceptance criterion must be independently re-proven by the
  reviewer. "Proven by prior batch" is not a release-qualification proof.
- Documentation audit (REL-04) is read-only evidence gathering. It must not
  create or modify help fragments, spec text, or documentation bodies. Any
  discovered inconsistency is a finding; resolution belongs to the owning
  prior pack.
- Keep test fixtures committed and machine-neutral. Local-only test
  configuration (accounts, paths, endpoints) belongs in `.local/` or
  untracked setup scripts.
- Do not commit `.local/` artifacts.
- Keep async contracts honest. E2E specs that await subprocess output must
  have bounded timeouts and cleanup.
- Reuse the established Nirvana/Jasmine spec infrastructure. Do not add new
  test frameworks, npm convenience scripts, or package dependencies.
- Architecture checks (`nvb check:architecture`) must pass before handoff.

## Mandatory Core Reference Anchors

Implementation and review work for this pack must explicitly use these repo
standards and source owners as acceptance anchors.

### Repo-level guidance

- `AGENTS.md`
- `docs/spec/v1-implementation-map.md` (full pack map)
- `docs/technical/repo-code-quality-acceptance-rules.md` (where present)

### Spec and boundary owners

- `docs/spec/v1.md` — normative product behavior, §17 release criteria
- `docs/spec/v1-contracts.md` — executable contracts, exit codes, routing, proposals, JSON
- `docs/spec/architecture.md` — architecture fitness checks
- `docs/spec/coordinator-automation.md` — coordinator decision plane
- `docs/spec/operator-session.md` — operator session lifecycle/commands
- `docs/spec/cli-session.md` — foreground terminal UX
- `docs/spec/schemas/v1.schema.json` — normative JSON Schema bundle

### Source owners

- `src/cli.ts` — thin CLI host (must contain no product logic)
- `src/commands/` — one `*Command.ts` per subcommand
- `src/foundation/` — shared product services
- `src/contracts/` — public/internal shared types
- `help/` — static command help fragments and registry
- `runtime-nvb/` — distribution/build automation
- `spec/` — Jasmine specifications

### Build and workflow owners

- `nvb.json` task surfaces — no npm script sprawl
- `nvb dist` — package build and validation
- `nvb build` — TypeScript compilation
- `nvb test` — full Jasmine test execution

## Architectural Non-Negotiables

These are hard acceptance rules for every release qualification batch.

- No product logic enters `src/cli.ts`.
- Commands do not duplicate discovery or path construction.
- Read-only commands perform no hidden writes.
- Only manifest-owned paths are upgradeable.
- Runtime invocation is centralized.
- Package upgrade does not implicitly upgrade a lane.
- No shell config/state is executed by TypeScript.
- Semantic coordinator decisions remain outside CLI code.
- Coordinator agents cannot directly mutate authoritative state.
- Every mutating cycle has one effect authority, current-precondition
  validation, and an idempotency identity.
- Mechanical coordination invokes no model when a unique preauthorized effect
  is provable.
- Every pack index is derived, model-free, reproducible, and matched to the
  active seal.
- Operator-session continuity derives from bounded local journals/indexes.
- No operator-session response generation or attachment holds the lane
  mutation lock.
- Every lane has one authoritative control home and stable `laneId`.
- Committed packs refer to logical repository IDs, never machine paths.
- Non-Watchtower lane directories are ignored and never mutated.

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

- `R3` — bounded repository reasoning: a narrow compatibility or documentation
  correction with explicit owners, limited state interaction, and focused proof
- `R4` — deep repository reasoning: cross-file contracts, public compatibility,
  ownership-boundary decisions, negative-path design, and independent source
  verification
- `R5` — highest available reasoning: interacting state machines, concurrency,
  graph or planner algorithms, driver semantics, destructive migration risk,
  multi-package integration, or final evidence/closure authority

The reviewer class is never lower than the implementor class. A reviewer must
reason independently from the patch and implementation report; it is not enough
to confirm that the implementor followed a checklist.

| Batch | Implementor | Reviewer | Reason for the floor |
|-------|-------------|----------|----------------------|
| REL-01 | R5 | R5 | Cross-pack end-to-end trial: global install, init, dispatch, handoff, independent accept, publication. Involves filesystem/Git state machines, the full lane lifecycle, coordinator routing/validation/effects, operator sessions, and release evidence. |
| REL-02 | R5 | R5 | Concurrent lane isolation, multi-repository commit verification, partial push recovery, and idempotency replay. Involves lock ordering, shared-write conflict detection, per-repository acceptance/push journal integrity, and lane-state recovery. |
| REL-03 | R5 | R5 | Security, ownership, performance, and packaging evidence. Involves path traversal fixtures, config shell-injection corpus, multi-account permissions, manifest/checksum integrity at build and install time, synthetic scaling benchmarks, and model-invocation auditing. |
| REL-04 | R3 | R4 | Documentation consistency audit and release gate. Narrow readability and traceability work with explicit owners. Reviewer requires cross-document judgment and acceptance-criterion traceability verification. |

Escalate a nominal `R3` or `R4` task to `R5` if source inspection reveals an
undocumented state machine, concurrency, destructive data behavior, an
ownership conflict across packages, or a required compatibility decision not
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

## Reviewer Hard-Reject Checklist

Reject the batch immediately if any answer is "yes."

1. Does the batch add a new product feature, command, or foundation module
   beyond the qualification scope declared in its brief?
2. Does any acceptance trial use mocks where the spec requires the installed
   `wt` binary, real filesystem operations, or real Git operations?
3. Does a security, performance, or packaging claim appear without
   reproducible fixture evidence (only narrative description)?
4. Does any e2e spec bypass the public CLI interface and directly import
   internal foundation modules?
5. Does the batch permit a path traversal, shell injection, permission bypass,
   or checksum mismatch that the spec requires to be refused?
6. Does a performance claim report only asymptotic estimates without actual
   wall-time and output-size measurements from the synthetic scaling fixtures?
7. Does the batch commit `.local/`, `dist/`, `build/`, `node_modules/`,
   `.nira/local/`, or `.watchtower/` artifacts?
8. Was tracker/roadmap/status documentation left stale after the batch outcome?
9. Did the batch introduce machine-local committed documentation such as
   username-specific paths or account names?
10. Did the batch add npm convenience scripts or package dependencies for
    testing or workflow?
11. Does REL-04 retroactively create missing help fragments, spec sections, or
    documentation that should have been created by the owning prior pack?
12. Does a release acceptance criterion remain traced only to a prior batch's
    acceptance claim without current independently reproduced evidence?
13. Did the reviewer accept evidence from the implementation report without
    independently reproducing acceptance-critical proof?
14. Does any file changed by this pack exceed the lane's size/clean-code bar
    without a narrow, source-backed exception?
15. Did the batch remove or weaken any safety section from the launch prompt
    or durable brief?
16. Was the `hello` scaffold left committed at the end of REL-04?

## Required Acceptance Narrative

Every accepted review should state, in concrete terms:

- which release acceptance criteria were independently re-proven
- the exact commands run, their output, and the current timestamp
- what security, performance, and packaging evidence was verified
- what status/spec/docs were synchronized
- any intentionally deferred question that remains deferred rather than guessed

If the reviewer cannot write that summary precisely, the batch is not ready to
accept.

## Batch Hygiene Rules

- Implementation agents do not commit.
- The paired reviewer owns acceptance and commit.
- Every batch needs a durable report in `.local/agent-reports/watchtower-release/`.
- Every review batch needs a durable review report under
  `.local/agent-reports/watchtower-release/reviews/`.

## Documentation Rules

- User-facing docs are not optional cleanup.
- Internal spec/status docs must stay synchronized with acceptance state.
- REL-04 audits documentation consistency; it does not create missing content.
- No release note or README claim that is not independently verifiable from
  the committed tree.

## Package-Script Policy Rule

- This is Nirvana: use `nvb` task/group surfaces for workflow automation.
- Do not add ad hoc npm scripts in package manifests for agent convenience,
  temporary fixes, or one-off maintenance flows.
- Keep package `scripts` minimal and only when there is a clear product/runtime
  requirement.
