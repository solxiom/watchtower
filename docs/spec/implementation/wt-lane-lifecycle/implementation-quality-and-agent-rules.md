# wt-lane-lifecycle Implementation Quality And Agent Rules

> **Accepted bootstrap implementation artifact.** Dispatch is authorized only under the
> accepted dependency DAG and paired independent batch-review gates. Product-created
> lanes remain subject to the structured pack acceptance and seal contract in
> `docs/spec/v1-contracts.md`.

All implementation/review work uses thin Nirvana command front doors,
capability-owned foundation modules, the immutable packaged NVB task catalog,
`LaneTaskRunner`, diagnostic-only Nirvana logging, appropriately bounded
Nirvana storage adapters, and manifest-declared shell leaves only. Project
`nvb.json` files, workflow-level shell, arbitrary task selection, relaxed module
limits, and acceptance-with-follow-up are forbidden.

## Purpose

These rules govern implementation and review work for the Watchtower v1
lane lifecycle delivery pack.

They supplement:

- `docs/spec/implementation/wt-lane-lifecycle/implementation-roadmap.md`
- `docs/spec/implementation/wt-lane-lifecycle/implementation-tracker.md`
- `docs/spec/v1.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/v1-implementation-map.md`

## Shared Quality Rules

- Keep init planning as the single source of truth for preflight validation.
- Keep pack validation in one consumer with seal reproduction.
- Keep transactional layout as one atomic commit path; do not scatter temp-file
  logic across commands.
- Keep lock ordering in one foundation module respected by all mutators.
- Keep coordinator baselines and pack index construction deterministic and
  model-free.
- Keep commands thin: `InitCommand`, `WatchCommand`, and `DoctorCommand`
  validate args and delegate to foundation services.
- Do not implement behavior in the wrong layer. Commands must not contain
  discovery, path construction, or shell-spawning logic.
- Do not turn `src/cli.ts` into a product host; it stays a thin Nirvana
  outer shell.
- Do not add npm convenience scripts in any package manifest. Use NVB task
  surfaces for workflow automation.
- Do not commit `.local/` artifacts.
- Keep async contracts honest. Do not implement async public methods as
  cosmetic wrappers over sync internals.
- Drift classification is mechanical. No model may classify drift.
- Doctor is read-only. No check performs repair, rebuild, or migration.
- `src/commands/HelloCommand.ts` and all hello artifacts must be removed
  only by LC-08, after real commands exist.

## Mandatory Core Reference Anchors

Implementation and review work for this lane must explicitly use these repo
standards and source owners as acceptance anchors, not just general style
intuition.

### Repo-level guidance

- `AGENTS.md`

### Spec and boundary owners

- `docs/spec/v1.md` — product specification, esp. §7 (filesystem), §10-11 (commands)
- `docs/spec/v1-contracts.md` — contract closure, esp. §2 (init syntax), §3 (pack consumer), §7 (shipping policy), §11 (locking)
- `docs/spec/v1-implementation-map.md` — esp. §6 (this pack), §10-14 (dependencies/critical path)
- `docs/spec/architecture.md` — component boundaries, read/write flows, safety model
- `docs/spec/schemas/v1.schema.json` — JSON Schema bundle for every public type

### Source owners

- `src/commands/InitCommand.ts` — init orchestration
- `src/commands/WatchCommand.ts` — watch preflight/invocation
- `src/commands/DoctorCommand.ts` — doctor orchestration
- `src/foundation/InitPlanner.ts` — preflight plan
- `src/foundation/PackConsumer.ts` — pack JSON Schema validation
- `src/foundation/PackSeal.ts` — RFC 8785 seal reproduction, drift matrix
- `src/foundation/LaneStore.ts` — lane directory layout
- `src/foundation/TransactionalWriter.ts` — atomic commit/rollback
- `src/foundation/BindingMutator.ts` — lock-ordered binding writes
- `src/foundation/MembershipRegistrar.ts` — idempotent index registration
- `src/foundation/CoordinatorBaseline.ts` — finite policy seed
- `src/foundation/PackIndexBootstrap.ts` — sealed index construction
- `src/foundation/DoctorRegistry.ts` — diagnostic check definitions
- `src/contracts/` — public types shared across commands

## Architectural Non-Negotiables

These are hard acceptance rules for every lane-lifecycle batch.

- Do not add product logic to `src/cli.ts`.
- Do not duplicate discovery or path construction in commands.
- Do not execute shell config or state in TypeScript.
- Do not use a model for M0 operations (preflight, pack validation, drift
  detection, lane layout, membership registration, pack index, doctor checks).
- Do not return `null`, `false`, or empty data for an unsupported runtime
  state. Every factory and resolution path must return a complete component
  or a deterministic error.
- Do not silently emulate an unsupported operation.
- Do not scaffold or relocate the committed implementation pack in init.
- Do not perform repair, rebuild, or migration in doctor.
- Do not daemonize the watcher; it must run in the foreground only.
- Do not give coordinator agents direct state or effect authority.
- Do not use tmux scrollback prose as lifecycle authority.
- Do not commit `.watchtower/`, `dist/`, `build/`, `node_modules/`, or
  `.nira/local/` artifacts.

## Required Ownership Shape

Every accepted batch must leave these questions answerable in concrete terms.

- Which exact foundation module owns the new behavior?
- Which command front door validates/normalizes/delegates into that owner?
- Which existing wiring path exposes the capability?
- Which behavior remains explicitly outside that owner?

Reject the batch if the answer is "several places share it", "the command does
most of it", "the config now knows everything", or "the runtime figures it out
later."

## Front-Door Rejection Rules

Reject any implementation where a command becomes the lasting home of deep
behavior.

Examples of hard reject shapes:

- `InitCommand` accumulating path construction, pack parsing, or Git operations
- `WatchCommand` owning runtime manifest validation or shell construction
- `DoctorCommand` inlining check logic instead of delegating to the registry
- `src/cli.ts` gaining command-specific routing or product configuration

Front doors may validate, normalize shallow input, resolve collaborators,
delegate, and expose prepared state. They must not become the main algorithm
owner.

## One-Owner Rejection Rules

Reject the batch if any important truth is recomputed in multiple layers.

This includes:

- lane path construction and validation
- pack acceptance, seal reproduction, and drift classification
- lock acquisition ordering and release
- repository binding validation and local-path canonicalization
- membership index read/write and staleness handling
- coordinator policy baseline seeding
- pack index compilation and seal verification
- watcher invocation context construction
- doctor check definitions and result classification

If commands, configs, and builders each rebuild part of the same truth
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

## Reasoning-Class Agreement Rules

- The batch brief's declared reasoning class is the minimum floor for both
  implementation and review agents. Review reasoning is never lower than
  implementation reasoning.
- The reviewer's reasoning class governs the thoroughness and independence
  standard; use the stronger class when the batch combines implementation
  reasoning at one level with review reasoning at another.

## Reviewer Hard-Reject Checklist

Before discussing polish, naming, or minor cleanup, reject if:

1. Product logic was added to `src/cli.ts`.
2. A command duplicates discovery or path construction.
3. A read-only operation performs a hidden write or repair.
4. Shell config or state is executed by TypeScript.
5. A model was used for an M0 operation in this pack.
6. The transactional writer does not roll back on a proven failure stage.
7. Lock order is violated or undocumented.
8. Doctor performs implicit repair, rebuild, or migration.
9. The watcher daemonizes, background-forks, or leaks processes.
10. Init creates destination directories in preview/dry-run mode.
11. A `.local/`, `dist/`, `build/`, `node_modules/`, or `.watchtower/`
    artifact is staged or committed.
12. The hello command or any hello artifact remains after LC-08 accepts.

## Mandatory Reasoning Protocol

Every implementation and review agent must follow this reasoning protocol
before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   contracts, factories, lower-layer capsules, front doors, tests, and status
   artifacts affected by this batch.
2. Inspect the current source and accepted predecessor-batch output. Do not
   infer behavior from filenames, the implementation report, or the launch
   prompt.
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

## Proof Standards

### Focused proof

- Target the exact behavior change with one capability per spec paragraph.
- Include negative-path, invalid-input, boundary-value, and adversarial cases.
- Failing contracts must produce documented error codes, not stack traces.

### Regression proof

- Run `nvb build` and all Jasmine suites from tracked-only checkout.
- Every previously passing test must remain passing.
- Record test totals and any environment-pending specifications.

### Architecture proof

- Run architecture checks that verify component dependency direction.
- No foundation module may import from `src/commands/`.
- No command may import shell execution utilities except through the runtime
  adapter.

### Real-engine proof

- Use temporary fixture workspaces for init, doctor, and e2e tests.
- Transactional layout tests must prove rollback at every failure stage.
- Watcher tests must prove foreground exec, stdio forwarding, and Ctrl-C.

### Adversarial proof

- Path escape, symlink traversal, and canonicalization attacks.
- Malformed JSON inputs to pack validator.
- Concurrent write attempts to detect lock-ordering violations.
- Corrupted state files that doctor must detect as `fail`.

## Help And Documentation Rules

- Every new command must register its help fragment in `help/commands/` and
  `help/help.json`.
- LC-08 must remove `help/commands/hello.hlp.json` and its entry in
  `help/help.json`.
- Update `docs/spec/v1.md` status markers when a command transitions from
  ❌ to ✅.
- Help text must match the accepted command behavior exactly.

## Naming And Convention Rules

- Foundation module filenames use kebab-case and end with their responsibility:
  `-planner`, `-consumer`, `-seal`, `-store`, `-writer`, `-mutator`,
  `-registrar`, `-baseline`, `-bootstrap`, `-registry`.
- Command class filenames use PascalCase with `Command` suffix.
- Contract files use PascalCase matching their export name.
- Spec files use kebab-case with `.spec.ts` suffix.
- No file may shadow a directory (e.g., no `src/foo.ts` when `src/foo/` exists).
- Imports use the `.js` extension per repo convention.
