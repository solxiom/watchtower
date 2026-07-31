# Batch CA-18 — Nirvana/OpenTUI Feasibility and Packaging Gate

## Mandatory Governing References

This draft brief is subordinate to:

- `AGENTS.md`
- `docs/development/engineering-and-review-standard.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/v1.md`
- `docs/spec/nirvana-integration-architecture.md`
- `docs/spec/architecture.md`
- `docs/spec/v1-implementation-map.md`
- `docs/spec/operator-session.md`
- `docs/spec/cli-session.md`
- `docs/spec/tui-operational-experience.md`
- this pack's `tui-interface-contracts.md`
- this pack's `implementation-quality-and-agent-rules.md`

The engineering and Nirvana/NVB architecture standards always apply. If this
brief conflicts with a governing source, follow the governing source and amend
the brief. An unresolved release-platform, packaging, security, or runtime
decision is a specification blocker, not implementor discretion.

The accepted TUI-EXP-01 product outcome establishes technical proof-of-concept
suitability and may inform bootstrap hypotheses, dependency inventory, and risk
prioritization. Its formal compliance rejection is preserved. It is never
predecessor acceptance: CA-18 independently qualifies the real
Watchtower/package/platform matrix and remains blocked on its declared
dependencies; it does not continue or repair the disposable spike.

The minimum PASS target is the exact Linux x86_64/glibc, manifest-tested Node
`>=26.4.0`, local/tmux/direct-SSH/SSH+tmux baseline in
`tui-operational-experience.md §2`. Every observed tuple and capability is
recorded; evidence from one tuple never promotes another.

## Mandatory Cross-Cutting Acceptance

- Audit pinned Nirvana packages and comparable Nira usage before introducing a
  bare Node platform API or local infrastructure.
- Record each selected Nirvana API and every demonstrated
  `NIRVANA_API_GAP`. A gap permits only a narrow capability-named adapter; it
  does not waive Nirvana-first architecture.
- Keep `src/cli.ts` a thin host. FFI bootstrap, renderer construction, terminal
  lifecycle, and packaging logic must not accumulate there.
- Use plain TypeScript and the imperative `@opentui/core` and
  framework-neutral `@opentui/keymap` APIs only.
- React, Solid, Ink, JSX/TSX, Babel, OpenTUI framework bindings, and a second
  frontend build pipeline are prohibited.
- Apply the exact module/function/constructor limits and reviewer matrix from
  the mandatory engineering standard.

Status: ❌ Not started — accepted bootstrap brief; dispatch requires its named
predecessor batches

Pack: wt-coordinator-automation (Pack 5)

Phase: TUI renderer qualification

Depends on: RT-03, RT-05, CA-14, CA-15, CA-16, and CA-17 accepted

Unblocks: CA-19 only after independent acceptance

Owned production files: `package.json`, `package-lock.json`, and only the
runtime/native manifest fields in `nira.json` and
`runtime-nvb/nvb-manifest.json` required to pin and distribute the accepted
engine. No product TypeScript owner is permitted.

Owned feasibility files:

- `spec/feasibility/opentui/OpenTuiFeasibilitySpec.ts`
- `spec/support/opentui/OpenTuiFeasibilityHarness.ts`
- `spec/support/opentui/FfiBootstrapHarness.ts`
- `spec/support/opentui/OpenTuiPtyHarness.ts`

If repository inspection proves one of these paths incompatible with the test
runner, stop and amend this brief before choosing another ownership shape.

**Required implementor reasoning class:** `R4`

**Class rationale:** The batch crosses an experimental Node FFI boundary,
native-platform dependency packaging, process bootstrap, terminal lifecycle,
Nirvana compatibility, and global-install behavior. It selects an architecture
but does not implement the operator-session product.

## Objective

Determine whether the v1 TUI baseline is safe and distributable:

- Node.js `>=26.4.0`;
- imperative `@opentui/core`;
- framework-neutral `@opentui/keymap`;
- plain TypeScript behind a generic Nirvana-facing TUI adapter; and
- the Node `--experimental-ffi` capability required by OpenTUI.

Return one evidence-backed verdict: `PASS`, `FAIL`, or `SPEC_BLOCKED`.
`PASS` selects a bootstrap and packaging design and authorizes CA-19.
`FAIL` or `SPEC_BLOCKED` stops the TUI dependency chain and requires a spec
decision. There is no silent fallback to Terminal Kit or another renderer.

## Scope Boundary

CA-18 qualifies machinery; it does not ship the Watchtower session UI.

The spike may render only synthetic data. It must not:

- read or mutate a real lane;
- create, attach, resume, or close an operator session;
- invoke an agent or model;
- propose or execute an effect;
- acquire a lane mutation lock;
- introduce public `wt` command behavior;
- commit generated build, distribution, dependency, or `.local/` artifacts; or
- become a reusable product subsystem before review acceptance.

## Required Work

### 1. Runtime and dependency audit

Record:

1. the exact Node versions used, including `26.4.0` and one later supported
   version;
2. the exact pinned OpenTUI package versions and native packages resolved by
   the package manager;
3. supported operating-system, CPU, and libc targets inherited from RT-03;
4. whether end users need Zig or another compiler at install or runtime;
5. package lifecycle scripts, downloaded or bundled artifacts, and licenses;
6. the complete dependency tree relevant to the TUI; and
7. proof that no prohibited framework or frontend toolchain entered the tree.

Do not silently narrow the RT-03 platform matrix. If OpenTUI cannot satisfy a
required target, return `SPEC_BLOCKED` with the exact incompatibility.

### 2. Nirvana compatibility audit

Inspect the pinned Nirvana packages and comparable Nira code for:

- CLI bootstrap and argument handling;
- build, test, and dist tasks;
- terminal/TTY presentation;
- inherited standard streams and child/process launch;
- signal and exit handling;
- native dependency packaging; and
- global CLI bin construction.

For each capability, record the inspected package, symbol or example, the
selected API, and its adequacy. For a missing capability, document:

```text
NIRVANA_API_GAP:
  capability:
  evidence:
  narrow adapter:
  prohibited expansion:
  proposed upstream follow-up:
```

Direct Node process APIs are permitted only behind the named adapter justified
by this audit. Generic subprocess, terminal, or platform helper bags are
rejected.

### 3. FFI bootstrap decision

Prototype and compare at least:

1. launching the whole `wt` process with `--experimental-ffi`;
2. a POSIX TUI-only re-exec using `process.execve()`; and
3. a focused launcher adapter for the interactive TUI entry path.

The comparison must cover:

- whether ordinary non-TUI commands load OpenTUI or enable FFI;
- preservation of `argv`, environment, current directory, stdin, stdout,
  stderr, TTY identity, exit code, and signals;
- recursion/re-exec-loop prevention;
- behavior under the Node permission model, including the conditional
  `--allow-ffi` requirement;
- unsupported-platform behavior;
- startup latency and memory;
- diagnostic quality when the flag is absent; and
- compatibility with source, NVB build/test, dist, global install, tmux, and
  PTY invocation.

Select one design and record why. The selected design must keep the flag and
native renderer confined to TUI use where practicable. Bootstrap policy belongs
in a focused boundary, never product command logic or `src/cli.ts`.

### 4. Bounded renderer spike

Build a disposable plain-TypeScript fixture proving:

- renderer initialization and clean shutdown;
- a wide left conversation region and right inspector region;
- standard and narrow responsive layout changes;
- keyboard focus movement and `@opentui/keymap` bindings;
- editable multiline input;
- scrolling and bounded list rendering;
- one overlay;
- synthetic streaming updates;
- one subtle bounded animation that honors reduced-motion configuration;
- terminal resize;
- sanitized untrusted text; and
- restoration after normal exit, error, interrupt, termination, and suspend/
  resume where supported.

The fixture proves engine capability only. It must not pre-empt CA-19 through
CA-24 ownership or turn into a monolithic renderer.

### 5. Native artifact and distribution proof

Produce a clean `nvb build`, `nvb test`, and `nvb dist`, then install the
resulting package globally from outside the repository in an isolated test
home. Prove:

- all required native artifacts for each supported target are declared and
  packaged deterministically;
- the distribution manifest records the relevant package/artifact identity and
  integrity data;
- no source-tree or undeclared network fallback is required at runtime;
- no Zig compiler is required for an ordinary supported install or run;
- wrong-architecture, wrong-libc, missing, or corrupt artifacts fail with a
  bounded actionable diagnostic;
- ordinary commands still run without initializing the renderer; and
- uninstall/reinstall or upgrade does not leave an ambiguous native artifact.

Do not commit `dist/`, `build/`, `node_modules/`, `.nira/local/`, or
`.watchtower/`.

### 6. FFI and terminal security proof

Prove that:

- FFI is presentation-only and grants no lane, model, proposal, or effect
  authority;
- Watchtower opens only the manifest-verified OpenTUI native library;
- no operator input, lane data, environment value, plugin, or config may choose
  a library path, symbol name, ABI signature, or arbitrary FFI call;
- renderer output applies the escape-sequence and untrusted-text rules in
  `cli-session.md`;
- secrets are not written to diagnostics or fixture snapshots; and
- renderer failure cannot bypass the normal effect executor.

## Required Evidence Matrix

At minimum, exercise:

| Area | Required cases |
| --- | --- |
| Node | `26.4.0`; one later supported release; absent FFI flag |
| Permission model | disabled; enabled without `--allow-ffi`; enabled with it |
| Invocation | source CLI; NVB build/test; dist bin; isolated global install |
| Commands | representative non-TUI commands; TUI fixture |
| Terminal | direct PTY; tmux; resize; Unicode; narrow and wide dimensions |
| Lifecycle | normal exit; startup error; render error; `SIGINT`; `SIGTERM`; suspend/resume where supported |
| Native failure | missing; corrupt; wrong CPU; wrong libc where applicable |
| Quality | startup latency; idle CPU; memory; resize/render responsiveness |

Use RT-03's supported-platform matrix. A local pass on only the development
machine is insufficient unless RT-03 explicitly defines that as the complete
v1 release matrix.

## Required Deliverables

The implementation report at
`.local/agent-reports/coordinator-automation/CA-18-nirvana-opentui-feasibility-and-packaging-gate.md`
must contain:

1. the `PASS`, `FAIL`, or `SPEC_BLOCKED` verdict;
2. dependency and license inventory;
3. prohibited-framework absence proof;
4. Nirvana API audit and any `NIRVANA_API_GAP` records;
5. bootstrap comparison and selected decision;
6. supported-platform/native-artifact matrix;
7. build, test, dist, and isolated global-install transcripts;
8. PTY/tmux/lifecycle restoration results;
9. security analysis;
10. startup, memory, idle, and render/resize measurements;
11. fixture file inventory and categorized line counts; and
12. exact proposed production ownership for CA-19, without implementing it.

## Acceptance Gate

CA-18 passes only when all of the following are true:

- Node `>=26.4.0` and the selected FFI bootstrap coexist with the Nirvana CLI,
  NVB, dist, and global-install paths without regression.
- The imperative core/keymap approach proves every bounded renderer capability.
- No prohibited UI framework or secondary frontend build stack is present.
- Ordinary commands do not initialize OpenTUI and, where the selected design
  permits, do not enable FFI.
- Native artifacts are deterministic and complete for every required target.
- Terminal state is restored on every supported lifecycle path.
- FFI inputs are closed and manifest-controlled.
- The independent reviewer reproduces the critical results.

No conditional acceptance is permitted. A condition becomes a correction and
re-review, or a `FAIL`/`SPEC_BLOCKED` verdict.

## Handoff

On `PASS`, hand CA-19 the exact:

- pinned OpenTUI versions;
- bootstrap boundary;
- generic adapter contract;
- supported terminal/platform matrix;
- native artifact manifest rules;
- lifecycle/restoration contract;
- performance baseline; and
- prohibited dependency list.

Do not hand off spike code as accepted product architecture merely because the
spike worked. CA-19 must implement the accepted ownership cleanly.
