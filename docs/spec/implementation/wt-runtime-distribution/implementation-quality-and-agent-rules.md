# wt-runtime-distribution — Implementation Quality And Agent Rules

Status: active pack quality rules
Date: 2026-07-30

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

- Keep the `RuntimeAdapter` as the single invocation boundary for all runtime
  actions; no command or foundation service may spawn runtime scripts directly.
- Keep one lower-layer owner per major concern: asset audit, manifest validation,
  data-root resolution, catalog staging, runtime adapter, managed assets, NVB
  staging automation, and integration smoke proof.
- Never evaluate lane config or state through shell execution in TypeScript.
  Parse strict scalar subsets only.
- Never log secrets or complete environment maps during invocation diagnostics.
  Only resolved `WT_*` key names may appear in verbose output, never their values.
- Never import `node:child_process` with `{ shell: true }` in the runtime adapter.
  All subprocess invocation uses `spawn()` with an argv array.
- `WT_*` environment variables are allowlisted; the adapter exports only keys
  matching `^WT_` from the resolved lane context and never passes `process.env`.
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
- `docs/spec/architecture.md` — §§4.5 (runtime adapter), 5.2 (user data), 6.3
  (runtime execution), 9.1 (trust zones)
- `docs/spec/schemas/v1.schema.json` — JSON Schema bundle

### Foundation and contract owners

- `src/contracts/` — manifest types, public runtime/knowledge shapes
- `src/foundation/` — asset audit, manifest validator, runtime catalog, data-root,
  runtime adapter, runtime invoke, managed assets
- `runtime-nvb/` — distribution staging tasks
- `spec/integration/` — runtime smoke proof

### Build and workflow owners

- `nira.json` — NVB task registrations
- `package.json` — package metadata; no npm script sprawl

## Architectural Non-Negotiables

These are hard acceptance rules for every `wt-runtime-distribution` batch.

- Do not invoke a runtime script from a command class directly. All invocation
  crosses `RuntimeAdapter`.
- Do not construct shell command strings with template literals. Use `spawn()`
  with an argv array.
- Do not pass `process.env` to a runtime subprocess. Export only resolved `WT_*`
  keys.
- Do not log the complete resolved environment. Only `WT_*` key names may appear
  in `--verbose` output.
- Do not create a second immutable-catalog owner. One catalog class stages and
  validates version roots.
- Do not create a second invocation boundary. One adapter constructs argv,
  environment, and validation.
- Do not create a second managed-asset authority. One owner validates link
  targets, checksums, collisions, and escapes.
- Do not import shell-mode `child_process` anywhere.
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

- `RuntimeAdapter` accumulating filesystem access checks, OS user resolution,
  environment validation, subprocess management, and signal forwarding in one
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
files and materially rewritten files. Generated artifacts and third-party
vendored sources are outside these targets only when their generated or
vendored ownership is explicit and they contain no hand-maintained behavior.

Required size bands:

- Front doors, factories, registries, commands, and public barrels should target
  160 lines or fewer. From 161 through 220 lines, the implementation agent must
  justify every retained responsibility and the reviewer must inspect for
  extraction opportunities. A hand-maintained front door over 220 lines is
  rejectable unless an existing repo-owned constraint makes immediate extraction
  riskier and a narrowly scoped exception is recorded. No such front door may
  exceed 300 lines.
- Focused implementation modules should target 220 lines or fewer. From 221
  through 300 lines, the agent must include a responsibility inventory and the
  reviewer must independently decide whether the module still has one cohesive
  reason to change. From 301 through 350 lines, splitting is expected and
  acceptance requires a concrete, source-backed reason why a split would make
  ownership less clear. Above 350 lines is a hard rejection for new or
  materially rewritten hand-maintained implementation modules.
- Four hundred physical lines is the absolute ceiling for any hand-maintained
  JS/TS source or spec module touched by this pack. The 400-line ceiling is not
  an exception target: a file can and should be rejected well below it when it
  mixes responsibilities, hides a state machine, duplicates policy, or acts as
  an overflow container.
- Test modules should normally stay at or under 300 lines. Larger scenario
  matrices must be split by contract family, fixture owner, or acceptance-ID
  range and share focused fixture builders rather than one giant test file.
- Existing oversized files are not permission to add more behavior. If a batch
  must touch one, it should leave the file no larger unless the added lines are
  temporary extraction glue removed in the same batch. The report must record
  the before/after line count and the lower-layer owner used for extraction.

Responsibility gates apply independently of line count:

- three or more independently nameable responsibilities in one module require
  a split, even when the file is under 220 lines
- state transition policy, transport or process I/O, mapping/normalization, and
  human rendering must not accumulate in one owner
- a class that owns environment construction, subprocess management, signal
  forwarding, and access validation is a god object and must be rejected
- a coordinator may sequence collaborators but must not absorb their
  algorithms; a registry may resolve owners but must not reimplement them
- a barrel exports the capsule surface only and must not become a forwarding
  layer for foreign APIs

Additional reject conditions:

- a file mixes unrelated concerns such as parsing plus staging plus invocation
  plus rendering
- a new helper bag (`helpers`, `utils`, `common`, `misc`) becomes the overflow
  owner
- a large legacy file grows materially without extracting lower-layer ownership
- comments are used to justify mixed responsibility instead of splitting owners

Every implementation report must include line counts for all new files and
materially rewritten files. Every review report must independently reproduce or
verify those counts and state whether each warning-band file remains cohesive.
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
| RT-01 | R4 | R4 | Deep asset audit with provenance and behavioral inventory |
| RT-02 | R4 | R4 | Manifest schemas with checksum enforcement and closed types |
| RT-03 | R3 | R3 | Bounded NVB build configuration with explicit owners |
| RT-04 | R4 | R4 | Immutable catalog with atomic staging and XDG precedence |
| RT-05 | R5 | R5 | Runtime adapter with security boundaries, allowlisting, and signal/exit forwarding |
| RT-06 | R4 | R4 | Managed links with collision safety and path-escape refusal |
| RT-07 | R3 | R3 | Integration smoke testing with explicit fixtures |

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

- Class and main module files: PascalCase (e.g., `RuntimeAdapter.ts`)
- Non-class module files: lowerCamelCase (e.g., `runtimeInvoke.ts`)
- Directory names for source/spec: lowerCamelCase or feature-name
- No dash-case or underscore-case in JS/TS source/spec paths
- Forbid directory-shadow sibling module files. If a directory exists at
  `path/<name>/`, do not create `path/<name>.ts`

## Security Rejection Rules

Reject the batch if it introduces any of the following:

- a subprocess invocation using `{ shell: true }` or string-based command
  construction
- complete `process.env` passed to a runtime subprocess
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

1. Did the implementation invoke a runtime script from a command class directly
   without crossing the `RuntimeAdapter`?
2. Did a front door become the main owner of subprocess management, environment
   construction, or access validation logic?
3. Is any important behavior owned by more than one module or layer (e.g., two
   modules independently constructing `WT_*` environments)?
4. Did the implementation guard only the final invocation while allowing
   unsanitized environment or shell evaluation?
5. Can a runtime script be invoked with `{ shell: true }` or through string
   interpolation anywhere in the adapter?
6. Did the adapter pass complete `process.env` to a runtime subprocess?
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
- If a new workflow is needed, add it to `runtime-nvb/` or `nira.json` task
  registrations instead of expanding `package.json` scripts.
