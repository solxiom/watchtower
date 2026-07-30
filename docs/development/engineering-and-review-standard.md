# Watchtower Engineering and Review Standard

Status: **Mandatory project-wide acceptance policy**

This standard applies to every current and future Watchtower change: TypeScript,
shell runtime, NVB tasks, tests, schemas, templates, generated source, and
documentation. Working behavior is necessary but insufficient. A change is not
acceptable when it introduces structural debt, bypasses Nirvana capabilities,
weakens an authority boundary, or makes the system materially harder to test
and reason about.

## 1. Authority and reference model

When instructions disagree, use this order:

1. accepted product specifications and schemas;
2. this engineering and review standard;
3. repository `AGENTS.md`;
4. the accepted implementation-pack and batch brief;
5. existing local conventions.

Existing code is evidence, not automatic precedent. Reviewers must reject a
change that copies an existing weakness in conflict with a higher authority.

Watchtower is a Nirvana CLI and must follow the same mental model as Nira:

```text
thin CLI host and command
  → focused application/foundation capability
  → explicit adapter or store
  → Nirvana infrastructure API
  → typed result
  → shared terminal or JSON presentation
```

The primary implementation references are the pinned versions of
`@nirvana/base`, `@nirvana/commons`, `@nirvana/framework`,
`@nirvana/builder`, and `@nirvana/b-core`, plus matching Nira source and tests.
Use repository-local package versions; do not silently design against another
Nirvana release.

## 2. Layer ownership and dependency direction

| Layer | Owns | Must not own |
|-------|------|--------------|
| `src/cli.ts`, `src/run.ts` | Process bootstrap, CLI construction, command registration | Product rules, filesystem workflows, SQL, subprocess orchestration |
| `src/commands/` | Argument/context translation, one application call, result selection | Domain algorithms, duplicated discovery, direct storage or shell effects |
| `src/contracts/` | Types, schemas, reason codes, errors, public envelopes | I/O, rendering, orchestration |
| `src/foundation/` | Capability-oriented application services, parsers, planners, validators, ports and adapters | Unrelated helper collections or terminal presentation |
| presentation modules | Human and JSON rendering from typed results | Discovery, mutation, policy decisions |
| runtime adapter | The single TypeScript-to-versioned-runtime boundary | Semantic coordinator judgment |
| SQLite stores | Derived projections, sessions, cache metadata behind explicit interfaces | Authoritative product state or business policy |
| `runtime-nvb/` | Build, distribution, migration, and packaged automation tasks | Interactive command behavior |
| versioned shell runtime | tmux, Git, watcher, launcher, journal, and bounded effects | Unvalidated model authority |

Dependencies point inward. Commands depend on contracts and focused foundation
capabilities. Foundation code depends on contracts and explicit infrastructure
ports. Presentation depends on typed results. Infrastructure adapters must not
be imported upward and re-exported as domain APIs.

Group code by capability when a capability needs multiple files. Do not build
horizontal dumping grounds named `utils`, `helpers`, `common`, `misc`, or
`shared`. A local helper capsule is acceptable only when it has a precise name,
a narrow owner, and a local public surface.

## 3. Nirvana-first implementation

Before adding infrastructure code or using a bare Node API, inspect the pinned
Nirvana packages and a comparable Nira call site. The default choices are:

| Need | Preferred capability |
|------|----------------------|
| CLI construction | `makeCLI` and Nirvana CLI contracts |
| Commands | `BaseCommand` / `Command` patterns |
| Argument parsing | `CArgMap`, `argUtil`, and the reserved `--cmd-*` namespace |
| Processes | `cmd.spawn`, `cmd.exec`, and related `@nirvana/base/terminal` APIs |
| Human output | `pretty.output.*`, `pretty.view()`, `TerminalView` |
| Assertions and guards | `X` |
| Collection/cursor behavior | Nirvana collection and cursor abstractions |
| Storage/disk behavior | Nirvana storage and disk facades where their semantics fit |
| Build and distribution | NVB tasks and handlers |
| Reusable services | Existing commons/framework services before local reinvention |

Every non-trivial implementation and review report must contain a
**Nirvana API usage audit** with:

1. the capability required;
2. packages and public symbols inspected;
3. the comparable Nira usage inspected;
4. the selected Nirvana API and why its semantics fit; or
5. a documented `NIRVANA_API_GAP`, the missing semantics, and the narrow adapter
   or upstream improvement chosen.

Convenience, familiarity, or fewer lines is not a valid reason to bypass an
available Nirvana API.

### 3.1 Bare platform boundaries

- Direct `node:child_process` use is a hard reject outside a pre-approved,
  capability-named compatibility adapter. Untrusted values are always passed
  as argument vectors, never interpolated into shell text.
- `console.*` and direct `process.stdout`/`process.stderr` writes are forbidden
  in commands and domain/foundation modules. Route output through one
  presentation boundary using Nirvana pretty/view APIs.
- Direct filesystem APIs are allowed only in focused persistence, atomic-write,
  manifest, or compatibility adapters when no matching Nirvana API has the
  required semantics.
- Read `process.env` only at an explicit context/configuration boundary and pass
  normalized values inward.
- Set `process.exitCode` only at the outer CLI boundary. Inner layers return
  typed results or throw typed errors.
- Import an SQLite driver or issue SQL only inside the three specification-owned
  derived stores and their migrations.

## 4. Module and function size limits

Limits count physical lines, including imports and comments. Generated files
are excluded only when generation and byte-for-byte regeneration are proven;
the generator itself remains subject to these limits.

| Module kind | Preferred maximum | Review warning | Hard reject |
|-------------|------------------:|---------------:|------------:|
| CLI entry, command, NVB task | 120 | 121–160 | over 180 |
| Orchestrator, controller, renderer shell | 140 | 141–180 | over 200 |
| Foundation service, planner, validator, adapter, store | 200 | 201–260 | over 300 |
| Contract, type, schema registry | 240 | 241–320 | over 400 |
| Test/spec module | 300 | 301–420 | over 500 |

Functions should be at most 40 lines. Lines 41–60 require explicit reviewer
justification; over 80 is rejected. Constructors should be at most 25 lines,
with warning at 26–40 and rejection over 50.

Additional structural limits:

- target no more than three nested control-flow levels;
- use a typed options object after three related parameters;
- split by responsibility before a file reaches the warning range;
- do not evade limits with minification, compressed statements, giant inline
  object literals, embedded scripts, or generated strings.

An exception must be approved before implementation and record the exact file,
temporary maximum, reason, reviewer, and expiry/removal batch. Retroactive
waivers are invalid. When touching legacy code already above a threshold, the
batch must reduce it, split it, or keep it flat with a separately accepted
remediation plan.

## 5. Responsibility and design rules

- A module has one primary responsibility and at most one inseparable secondary
  responsibility. Its name must describe that capability.
- CLI and task front doors are composition roots, not implementation homes.
- Separate parsing, validation, planning, effect execution, persistence, and
  rendering when they change for different reasons.
- Inject clocks, ID generators, process runners, filesystem boundaries, stores,
  and other nondeterministic effects behind focused ports.
- Async APIs must represent real asynchronous work. Do not add cosmetic
  `Promise.resolve` wrappers or hide sync blocking behind async signatures.
- Prefer explicit state machines and lifecycle transitions over scattered
  booleans.
- Avoid mutable global state, ambient singletons, and service locators. Scope
  state to a command, lane operation, session, or explicit application object.
- Duplication is preferable to a premature generic abstraction, but repeated
  policy or boundary behavior must converge into one named owner.

## 6. Naming, imports, and layout

- Classes and class-owning files use `PascalCase`; non-class modules and
  directories use `lowerCamelCase`.
- Do not introduce dashes or underscores in backend source/spec names.
- Do not place `thing.ts` beside a `thing/` directory; directory-shadow
  structures are rejected.
- Barrels define a local package surface only. They must not launder or
  re-export foreign package APIs.
- Import another package through its public exports; do not deep-import private
  implementation paths.
- Avoid wildcard export growth. Export only deliberate public contracts.
- Follow Watchtower’s proven TypeScript build and dist import contract. Do not
  normalize import suffixes merely to imitate another repository.
- Circular dependencies are rejected. Break cycles by moving contracts inward,
  not by lazy imports or runtime indirection.

## 7. Contracts, errors, and state

- Parse external data as `unknown`, validate it, and normalize it into explicit
  types. Broad `any`, unchecked casts, and non-null assertions at trust
  boundaries are rejected.
- Public JSON, event, proposal, journal, and configuration shapes are versioned
  contracts with stable reason codes.
- Errors identify the failed operation, safe target, reason code, and an
  actionable remediation without leaking secrets.
- Authoritative state remains in the specification-declared files and journals.
  SQLite is derived and rebuildable; no cache, UI model, tmux observation, or
  agent prose becomes a second source of truth.
- State transitions enumerate legal predecessors, validate current state, and
  are idempotent or protected by an explicit replay key.

## 8. CLI and presentation

- Every command extends the Nirvana command base and delegates to a focused
  capability.
- Human and JSON modes render the same typed result. JSON receives no decorative
  text, color, progress animation, or unstable prose.
- Use Nirvana pretty and terminal-view primitives. Do not create local color,
  table, spinner, box, width, or ANSI frameworks.
- Respect Nirvana’s command argument namespace and reserved `--cmd-*` behavior.
- Dry-run and read-only commands must be provably free of writes and repair.
- A command change updates implementation, help registry/fragments, schemas,
  examples, and normative specification in the same accepted batch.

## 9. Persistence, effects, and security

- Canonicalize and authorize paths before access; validate symlink behavior and
  containment at every trust boundary.
- Durable file replacement uses the specified temp-write, flush, atomic rename,
  and directory-flush sequence. Locks follow the globally declared order.
- SQL is parameterized. SQLite extensions, triggers with hidden authority, and
  business policy in SQL are forbidden.
- Preserve file modes and secret redaction. Never log tokens, credentials,
  unredacted environment values, or sensitive proposal content.
- Mutations use prepare/attempt/verify semantics and the one declared effect
  executor. No model, command, or session gains an alternate write path.
- Do not use `eval`, dynamic code execution, shell-interpolated untrusted data,
  or `source` lane configuration.

## 10. Testing and verification

Tests are part of the design, not post-implementation evidence. Each change
adds the relevant layers:

- contract/schema and reason-code tests;
- focused unit tests for parsers, planners, validators, and state transitions;
- integration tests for adapters and stores;
- adversarial tests for malformed input, path escape, symlinks, shell
  metacharacters, stale state, replay, races, and authority bypass;
- recovery tests for partial writes, interruption, lock contention, corruption,
  and rebuild;
- golden human/JSON rendering and help tests;
- read-only before/after hash proof where required;
- build, dist/global-install, and PTY/tmux proof where the surface demands it.

Every bug fix includes a regression test that fails before the fix. Tests use
injected clocks/IDs/effects instead of timing sleeps or global mutation. Skipped,
focused, order-dependent, or flaky tests are not acceptance evidence.

The minimum repository checks are:

```sh
nvb build
nvb test
```

Run `nvb dist` and packaged/global-install smoke tests for dependency, bin,
runtime, asset, or distribution changes. Extend NVB for new project tasks; do
not create npm-script sprawl or a parallel build system.

## 11. Automated architecture gates

The source architecture suite must fail builds for:

- module/function limits and oversized front doors;
- direct `child_process`, direct terminal writes, or misplaced SQLite imports;
- generic helper bags and directory-shadow layouts;
- invalid naming and foreign API re-exports;
- forbidden dependency direction or cycles;
- product logic accumulating in `src/cli.ts` or `src/run.ts`;
- newly added lifecycle npm scripts; and
- committed `build/`, `dist/`, `node_modules/`, `.nira/local/`, or
  `.watchtower/` artifacts.

A reviewer must not accept “the checker does not cover it yet” as evidence of
compliance. Manual review remains required, and a repeatable missed violation
must add or improve an automated gate in the same correction.

## 12. Reviewer acceptance procedure

Review in this order:

1. specification scope and authority;
2. layer ownership and dependency direction;
3. Nirvana API usage audit;
4. module responsibilities, sizes, names, and public surfaces;
5. correctness, failure behavior, security, and authority boundaries;
6. test quality and required build/dist proof;
7. help, schemas, examples, and specification synchronization.

Every review report must include this matrix with evidence:

| Gate | Required verdict |
|------|------------------|
| Specification and batch scope | PASS / FAIL |
| Layering and responsibilities | PASS / FAIL |
| Nirvana-first API use | PASS / FAIL |
| Size and complexity limits | PASS / FAIL |
| Contracts and failure behavior | PASS / FAIL |
| State/effect/security boundaries | PASS / FAIL |
| Tests and build/dist proof | PASS / FAIL |
| Help/schema/spec synchronization | PASS / FAIL |

Any `FAIL` means **REJECT**. There is no “accept with follow-up” for a known
violation.

### 12.1 Mandatory hard rejects

Reject the batch when it contains any of the following:

1. a module or function above a hard limit without a valid pre-approved
   exception;
2. product logic in a CLI/task front door or a god object spanning unrelated
   capabilities;
3. a generic helper bag, ball-of-mud dependency shape, or hidden circular
   dependency;
4. bypass of a suitable Nirvana API without a proven `NIRVANA_API_GAP`;
5. raw subprocess, terminal, filesystem, SQL, or shell behavior outside its
   declared adapter boundary;
6. a local replacement for Nirvana terminal/pretty, command, collection, or
   storage behavior whose semantics already fit;
7. invalid naming, directory shadowing, foreign API laundering, or private
   deep imports;
8. a second source of truth or authority inferred from cache, tmux, UI, or agent
   prose;
9. command/help/schema/specification drift;
10. missing negative, failure, recovery, or authority-boundary tests required
    by the changed behavior;
11. broad `any`, unchecked trust-boundary casts, mutable global state, or hidden
    nondeterminism;
12. size-limit evasion through compressed code, giant embedded strings, or
    unreviewable generated output;
13. new npm lifecycle/script orchestration instead of NVB;
14. a promise to “refactor later” for debt introduced by the current batch;
15. missing required review evidence, including the Nirvana audit and size
    report; or
16. any weakening of reviewer independence, proposal validation, lock rules, or
    the single effect-execution authority.

## 13. Definition of done

A change is done only when its behavior and failure modes match the accepted
specification, its architecture passes this standard, its Nirvana API choices
are evidenced, tests cover normal and adversarial paths, required build/dist
checks pass, public surfaces remain synchronized, and an independent reviewer
records every acceptance gate as `PASS`.
