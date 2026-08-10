# wt-coordinator-automation Implementation Quality And Agent Rules

> **Dispatch hold.** `../planning-remediation-amendment.md` supersedes any
> conflicting batch contract and the former pack seal. No untouched batch may
> start until synchronized artifacts are independently accepted and resealed.

All implementation/review work uses thin Nirvana command front doors,
capability-owned foundation modules, the immutable packaged NVB task catalog,
`LaneTaskRunner`, diagnostic-only Nirvana logging, appropriately bounded
Nirvana storage adapters, and manifest-declared shell leaves only. Project
`nvb.json` files, workflow-level shell, arbitrary task selection, relaxed module
limits, and acceptance-with-follow-up are forbidden.

Status: **active pack quality rules**
Date: 2026-07-31

## Purpose

These rules govern implementation and review work for the `wt-coordinator-automation`
pack (pack 5 of 6). They supplement:

- `implementation-roadmap.md`
- `implementation-tracker.md`
- `docs/spec/v1.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/architecture.md`
- `docs/spec/coordinator-automation.md`
- `docs/spec/operator-session.md`
- `docs/spec/cli-session.md`

## Shared Quality Rules

- Keep the pack-index compiler as the single source of truth for seal-bound structural indexes.
- Keep one lower-layer owner per major concern: index compilation, index query, journal
  projection, ready-set calculation, routing policy, endpoint eligibility, decision envelopes,
  context brokering, proposal validation, effect execution, tmux adaptation, Git acceptance,
  coordinator queue, session persistence, session memory, session routing, terminal rendering,
  PTY attachment.
- Keep coordinator policy in the versioned knowledge pack. The routing policy classifies;
  it does not encode semantic judgment.
- Keep the effect executor as the sole authority for lane state mutation.
- Keep front doors, commands, registries, and renderers thin.
- Do not implement coordinator behavior in command classes.
- Do not duplicate index compilation, query logic, or routing policy in commands.
- Do not allow any path to bypass proposal validation before reaching the effect executor.
- Do not allow direct agent mutation of authoritative lane state.
- Do not invoke a model for any M0 operation.
- Do not fall back to full-pack scanning when an index is unavailable or stale.
- Do not use tmux scrollback prose as lifecycle authority.
- Operator-session turns must not hold the lane mutation lock.
- Session advice must have no effect until separately confirmed and revalidated.
- `.local/` artifacts are never staged or committed.
- Keep async contracts honest. Do not implement async public methods as cosmetic wrappers.
- Every SQL/codec-less operation in this pack uses plain TypeScript/JSON; no database
  dependency is introduced.

## Architectural Non-Negotiables

These are hard acceptance rules for every CA batch.

- Do not add product logic to `src/cli.ts`. It remains a thin Nirvana host.
- Do not turn any foundation module into a god object owning several unrelated concerns.
- Do not put coordinator judgment (semantic reject triage, scope decisions, ambiguous
  scheduling) in TypeScript.
- Do not implement a second effect path or allow any effect to commit outside the
  single validated executor.
- Do not allow an index-query, context-broker, or proposal-validator module to load
  or scan the full implementation pack.
- Do not let a stale or missing pack index fall back to model summarization or pack-file
  reads.
- Do not treat a session attachment or PTY as durable session authority.
- Do not hold the lane mutation lock during model response generation for operator sessions.
- Do not make cross-session references transitive or unbounded.
- Do not hide new ownership in `helpers`, `utils`, `common`, or `misc` modules.
- Do not implement behavior in the wrong layer: commands own orchestration/rendering;
  foundation owns service logic; contracts own type vocabulary.
- Do not return `null`, `false`, or empty data for an unsupported runtime state. Every
  factory and resolution path must return a complete component or a deterministic error.
- Do not silently emulate an unsupported effect, routing class, or proposal type.

## Required Ownership Shape

Every accepted batch must leave these questions answerable in concrete terms.

- Which exact lower-layer module owns the new behavior?
- Which front door validates/normalizes/delegates into that owner?
- Which existing wiring path exposes the capability?
- Which behavior remains explicitly outside that owner?

Reject the batch if the answer is "several places share it", "the command does
most of it", "the config now knows everything", or "the runtime figures it out
later."

## Front-Door Rejection Rules

Reject any implementation where a top-level entry point becomes the lasting home
of deep behavior.

Examples of hard reject shapes:

- A command class accumulating index compilation or routing logic.
- `CoordinatorEffectExecutor` owning proposal validation plus effect planning plus journal
  writing plus projection refresh.
- `CoordinatorIndexQuery` owning typed query composition plus cursor management
  plus digest verification plus corruption repair.
- `OperatorSessionRenderer` owning lifecycle state transitions plus budget accounting
  plus proposal handling.
- The PTY attachment owning session policy, routing, or budget decisions.

Front doors may validate, normalize shallow input, resolve collaborators,
delegate, and expose prepared state. They must not become the main algorithm owner.

## One-Owner Rejection Rules

Reject the batch if any important truth is recomputed in multiple layers.

This includes:

- Pack-index compilation and seal verification.
- Typed SQLite query composition and bounded cursor management.
- Journal checkpoint and prefix-digest derivation.
- Ready-set DAG calculation and claim-capacity blocking.
- Routing-policy rule matching and class assignment.
- Adapter eligibility classification and isolation proof.
- Decision-envelope digest computation and content delimiting.
- Context-broker query allowlisting and usage tracking.
- Proposal type validation and effect mapping.
- Effect-idempotency key computation and all-or-nothing execution.
- External-effect prepare/attempt/verify journaling.
- Coordinator-queue ordering and cursor advancement.
- Operator-session state transitions and turn sequencing.
- Session-memory working-set assembly and capsule projection.
- Session-budget grant/reserve accounting within lane-wide limits.
- Terminal presentation-event translation and rendering.

If configs, commands, adapters, and projections each rebuild part of the same truth
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

Reasoning classes are capability requirements, not vendor or model-version claims.
Operators should select the strongest currently available coding agent that reliably
meets the assigned class, has enough context for the complete brief/spec/source set,
and can execute and inspect repository tools.

- `R3` — bounded repository reasoning: a narrow compatibility or documentation
  correction with explicit owners, limited state interaction, and focused proof.
- `R4` — deep repository reasoning: cross-file contracts, public compatibility,
  ownership-boundary decisions, negative-path design, and independent source
  verification.
- `R5` — highest available reasoning: interacting state machines, concurrency,
  graph or planner algorithms, hash-chain/index integrity, destructive mutation
  safety, multi-owner integration, or final evidence/closure authority.

The reviewer class is never lower than the implementor class. A reviewer must
reason independently from the patch and implementation report; it is not enough
to confirm that the implementor followed a checklist.

| Batch | Implementor | Reviewer | Reason for the floor |
|-------|------------|----------|----------------------|

Escalate a nominal `R4` task to `R5` if source inspection reveals an undocumented
state machine, concurrency, destructive data behavior, an ownership conflict
across layers, or a required compatibility decision not settled by the governing
specs. Do not lower a class because a prompt looks short or because an
implementation report claims the work is straightforward.

## Prompt Integrity And Non-Compression Rule

Launch prompts and durable briefs are safety artifacts. The mandatory shared
`agent-launch-contract.md`, batch prompt, paired brief, and bounded predecessor
handoff together form one launch envelope. An orchestrator must deliver all
four; a prompt copied without the shared contract is invalid.

- Expansion and clarification are encouraged when they make an invariant,
  owner, failure mode, proof obligation, or review procedure more explicit.
- Incorrect paths or claims must be replaced with equally detailed or more
  detailed correct content; deleting the surrounding instruction is not a fix.
- Work and review lanes remain independent. The shared contract states common
  method once; each prompt and brief state the batch-specific mission, scope,
  proof, report, rejection, and handoff.
- Machine-specific ownership instructions in launch prompts are protected
  operator controls. They must be retained verbatim unless the pack owner
  explicitly replaces them with an equally explicit rule.
- Sealed context indexes treat the shared contract as a required direct
  dependency and fail compilation if it is absent or digest-mismatched.
- Agent selection is capability/allocation based. Prompts declare an `R` floor;
  the current allocation plan selects available endpoints/accounts. Static
  vendor/model recommendations are non-authoritative and must not be copied
  through every prompt.
- Bounded deduplication is preferred to repeated boilerplate because it reduces
  pack size and coordinator context without weakening a single invariant.

## Proof And Evidence Requirements

No batch is acceptable on narrative confidence alone.

- A batch must land or update focused specs that exercise the behavior
  introduced in that batch.
- Index batches (CA-01–CA-04) must prove deterministic compilation, bounded
  reads, corruption handling, and seal-verification without any model.
- Routing batches (CA-05–CA-09) must prove every v1 rule, guard, eligibility
  gate, envelope property, budget limit, and validation case.
- Effect batches (CA-10–CA-13) must prove idempotency, crash recovery,
  external-effect journaling, and all-or-nothing projection writes.
- Command batches (CA-14) must prove every command invocation form including
  dry-run purity, human/JSON output, and error cases.
- Session batches (CA-15–CA-17) must prove lifecycle state machine transitions,
  bounded memory, budget accounting, and hold interleaving.
- CA-18 promotes and revalidates accepted renderer/runtime/package evidence; CA-19–CA-23 prove their
  bounded TUI responsibilities; CA-24 independently reproduces 30–10k pack
  scale, long-session replay, and final M6 closure.
- Reports must record the real commands run, the actual outcome, and any honest
  limitation.
- "Not run yet", "reviewer can run later", or "covered by existing behavior" is
  not sufficient when the batch changes coordinator-level truth.
- Do not add npm scripts or convenience wrappers to run tests. Use existing
  package test surfaces or NVB tasks.

## Reviewer Hard-Reject Checklist

Reject the batch immediately if any answer is "yes."

1. Did the implementation bypass the single effect executor or create a parallel
   mutation path?
2. Did a command class become the main owner of index compilation, routing,
   proposal validation, or effect execution logic?
3. Is any important behavior owned by more than one module or layer?
4. Did the implementation guard only the final output while allowing stale index,
   capability, or state claims?
5. Can an M0 operation now invoke a model through any code path?
6. Did the implementation fall back to full-pack scanning, file reads, or model
   summarization when an index is unavailable or stale?
7. Are configs, templates, or docs carrying logic that belongs in foundation
   services?
8. Was proof omitted, deferred, mis-layered, only narrated, or run through an
   ad hoc script rather than the accepted test surfaces?
9. Were tracker/roadmap/status docs left stale after the batch outcome?
10. Did the patch introduce machine-local committed documentation such as
    username-specific shell instructions?
11. Did the patch choose file naming or module placement contrary to the repo's
    conventions?
12. Did the patch bypass the established foundation layer with a parallel
    convenience implementation in a command?
13. Did any new module exceed the pack's size/clean-code bar without a narrow,
    source-backed exception?
14. Did the patch modify non-allowlisted package areas or add npm convenience
    scripts for testing or workflow?
15. Did a coordinator decision agent gain filesystem, state-mutation, or
    effect-execution authority through any code path?
16. Did the implementation allow an operator session to hold the lane mutation
    lock, or let unconfirmed session advice produce lane effects?

## Required Acceptance Narrative

Every accepted review should state, in concrete terms:

- The exact owner modules for the behavior.
- What proof was rerun independently.
- What status/spec docs were synchronized.
- Any intentionally deferred question that remains deferred rather than guessed.
- How model-free (M0) paths were verified as remaining model-free.
- How boundedness was proven where applicable (index, context, session memory).

If the reviewer cannot write that summary precisely, the batch is not ready to accept.

## Batch Hygiene Rules

- Implementation agents do not commit.
- The paired reviewer owns acceptance and commit.
- Every batch needs a durable report in `.local/agent-reports/coordinator-automation/`.
- Every review batch needs a durable review report under
  `.local/agent-reports/coordinator-automation/reviews/`.

## Documentation Rules

- User-facing help fragments must stay synchronized with acceptance state.
- Internal spec/status docs must stay synchronized.
- Describe inherited coordinator behavior by provenance and RT-01 migration
  class, not by assuming it remains a workflow shell runtime. Substantial
  mechanics belong in focused packaged TaskHandlers; only manifest-declared,
  audited leaves or time-bounded compatibility wrappers may remain executable
  shell, with the owner/removal/expiry evidence required by RT-01.
- Update the v1.md command table status markers when a command becomes
  implemented and independently accepted.
- Update the architecture.md service table when a new foundation module is
  accepted.

## Package-Script Policy Rule

- This is a Nirvana project: use `nvb` task/group surfaces for workflow automation.
- Do not add ad hoc npm scripts in `package.json` for agent convenience,
  temporary fixes, or one-off maintenance flows.
- If a new workflow is needed, add it to the package-local `nvb.json` task
  surface instead of expanding `package.json` scripts.

## Synchronized 74-batch reasoning authority

This table is the authoritative assignment floor and supersedes earlier illustrative ranking prose.

| Batch | Implementer | Reviewer | Basis |
|---|---|---|---|
| CA-01 | R5 | R5 | Identical logical rows/semantic root; path/digest/FK checks; staged immutable publication; linear build |
| CA-02 | R5 | R5 | Indexed bounded reads; limits/cursors/truncation; no direct SQL; stale/missing/corrupt block |
| CA-03 | R4 | R4 | Journal checkpoints; single writer/WAL readers; incremental append; corruption and staged rebuild |
| CA-04 | R5 | R5 | DAG/dependency/claim/capacity blockers; no arbitrary winner |
| CA-05 | R4 | R4 | Every v1 rule/guard; first-match determinism; installed-policy provenance; normative contradiction after safety as D3/C5; economics only after hard eligibility |
| CA-06 | R4 | R4 | Unattended/advisory/skill-only classification; hard eligibility; drift invalidation/shared pools; no concrete CLI adapter |
| CA-07 | R4 | R4 | Stable semantic digest; bounded default context; contradiction/advisor evidence references and impact scope; untrusted-content delimiting |
| CA-08 | R5 | R5 | Allowlisted queries; provenance/redaction; soft/hard limits; endpoint telemetry quality and shared-pool accounting |
| CA-09 | R5 | R5 | All 14 proposal types; specification-resolution authority/seal/independence checks; stale/illegal/invalid cases |
| CA-10 | R5 | R5 | One authority; lock/revalidation/idempotency; atomic pack-revision activation and same-session resume; no automatic Git sync |
| CA-11 | R4 | R4 | Unknown launch recovery; duplicate suppression; no arbitrary task/kill/shell |
| CA-12 | R4 | R4 | Reviewer-session ownership; commit-set validation; partial push recovery; Nirvana Git API audit |
| CA-13 | R5 | R5 | Stable priority; impact-scoped blocker with unrelated progress; activation invalidation; interrupted/duplicate/uncertain replay |
| CA-14 | R4 | R4 | Index status/verify/explain, coordinator status/context/explain, events, ready; read-only purity |
| CA-15 | R4 | R4 | Many sessions; one active turn each; immutable closed history; crash-safe journals |
| CA-16R | R5 | R5 | Bounded metadata/excerpts; exact text remains journal-owned; same-lane capsules; no full-history fallback |
| CA-17 | R5 | R5 | M0/D1–D3; hard floors; finite grants; protected reserves; no proposal/effect authority |
| CA-18 | R4 | R4 | Revalidate TUI-EXP-01 against current exact package/target; no renderer reselection or repeated disposable experiment |
| CA-19 | R4 | R4 | Wide right inspector shell; model-free lane entry; P0–P5 attention; standard/narrow layouts; resize; focus/keymap; themes; transactional preferences; bounded animation |
| CA-20 | R5 | R5 | Virtualized paging; multiline input; bounded draft recovery; paste; completion; index-bounded timeline search/reference pickers; scroll anchoring |
| CA-21 | R4 | R4 | All bounded inspector states; projection-only agent/allocation view; bounded search/attention; canonical action parity; confirmation, diagnostics, and details overlays |
| CA-22 | R5 | R5 | Provisional validation; live edge; stale confirmation invalidation; cross-attachment contention/wait; observer restrictions; priority-preserving coalesced refresh |
| CA-23 | R5 | R5 | Exact promoted matrix; no-color/high-contrast/reduced motion; signals/suspend/crash restore; preference/cache migration; semantic visual catalog; emulator/Unicode/resize fixtures |
| CA-24 | R5 | R5 | Full contradiction→advice→authority→re-seal→activation→explicit sync→same-session resume fixture; 30–10k pack scale; complete M6 gate |
| CA-25 | R5 | R5 | Cycle/escalate/resolution dry-run purity; normal validator/executor only; no command-local authority |
| CA-26 | R5 | R5 | Explicit confirmation; current-state validation; stale/illegal refusal; sole executor handoff |
| CA-27 | R5 | R5 | Impact-scoped expiry/interleaving; authority/independence/seal checks; no implicit pack edit |
| CA-28 | R4 | R4 | Required unattended conformance; bounded argv/env/cwd/result; fresh catalog/model fingerprint |
| CA-29 | R4 | R4 | Same conformance when installed; explicit healthy not-installed outcome |
| CA-30 | R5 | R5 | index build [--runtime]; dry-run purity; staged compile/rebuild; current-state validation; no command-local mutation |
| CA-31 | R5 | R5 | Coordinator/session/TUI checks; exact pass/warn/fail/skip; read-only; release only qualifies behavior |


## Shared Launch Envelope Authorization

Every active work and review prompt has `../agent-launch-contract.md` as a mandatory direct dependency. The launcher must co-deliver that contract, the batch-specific prompt, and paired brief as one self-contained envelope. This is the only permitted deduplication of launch method. A prompt may be concise only when it directly names the contract and still states the exact batch ID/title, dependencies, ownership, proof, implementer/reviewer reasoning floors, report/correction paths, checkout/ownership controls, role authority, and durable handoff or verdict. Missing or stale envelope members reject dispatch; links alone never replace batch-specific scope.
