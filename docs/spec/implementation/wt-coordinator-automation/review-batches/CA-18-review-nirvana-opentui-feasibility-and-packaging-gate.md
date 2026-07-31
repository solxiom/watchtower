# Review Batch CA-18 — Nirvana/OpenTUI Feasibility and Packaging Gate

## Mandatory Governing References

This review is subordinate to:

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
- `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-18-nirvana-opentui-feasibility-and-packaging-gate.md`
- this pack's `implementation-quality-and-agent-rules.md`

Status: ❌ Not started — repacked draft; it is not acceptance authority until
independent pack review and sealing

Paired work batch: CA-18

Reviewer owns the acceptance verdict and must be independent of the implementor.

**Required reviewer reasoning class:** `R4`

## Review Objective

Treat `docs/spec/tui-operational-experience.md §2` as the exact platform,
invocation, promotion, and fail-closed contract. Evidence from one tuple cannot
be generalized to another.

Independently determine whether imperative OpenTUI on Node `>=26.4.0`, including
its experimental FFI requirement, is a safe and distributable Watchtower v1
TUI foundation that does not compromise Nirvana architecture or ordinary CLI
behavior.

The reviewer returns exactly one verdict:

- `ACCEPT` — every mandatory result is reproduced;
- `REJECT` — one or more correctable requirements fail; or
- `SPEC_BLOCKED` — a governing platform, packaging, runtime, or security
  decision cannot be satisfied without changing the spec.

There is no conditional acceptance.

## Scope And Architecture Verification

Verify:

1. the work is a bounded feasibility fixture, not an operator-session
   implementation;
2. no public command behavior or real lane mutation was introduced;
3. `src/cli.ts` did not gain renderer, FFI, bootstrap, packaging, or lifecycle
   logic;
4. the implementation uses plain TypeScript with only imperative
   `@opentui/core` and framework-neutral `@opentui/keymap`;
5. React, Solid, Ink, JSX/TSX, Babel, OpenTUI framework bindings, and a second
   frontend build pipeline are absent;
6. direct Node platform APIs are confined to capability-named adapters backed
   by a complete `NIRVANA_API_GAP`;
7. no project `nvb.json` was modified; and
8. no generated or local runtime artifact is staged.

Inspect both declared and transitive dependencies, source imports, TypeScript
configuration, build configuration, lifecycle scripts, and lockfile changes.
A package-name grep alone is not sufficient evidence.

## Required Independent Reproduction

### 1. Runtime and flag behavior

Independently run the required matrix with Node `26.4.0` and one later
supported version. Verify:

- the TUI diagnostic is bounded and actionable without
  `--experimental-ffi`;
- permission-model behavior correctly accounts for `--allow-ffi`;
- the chosen bootstrap preserves arguments, environment, current directory,
  standard streams, TTY identity, signals, and exit status;
- recursion or re-exec loops are impossible; and
- ordinary non-TUI commands do not initialize the renderer.

If the selected design enables FFI for the entire CLI process, require an
explicit, evidence-backed justification that narrower designs failed. Reject
convenience as the sole reason.

### 2. Nirvana regression audit

Reinspect the pinned Nirvana/Nira evidence rather than accepting the
implementor's inventory. Independently verify:

- CLI parsing and help remain conforming;
- `nvb build`, `nvb test`, and `nvb dist` succeed;
- the dist bin resolves correctly;
- the global CLI works outside the repository; and
- any direct Node API has a real, narrowly stated Nirvana gap.

Reject a generic process, subprocess, terminal, or platform utility introduced
as a shortcut.

### 3. Renderer capability

In a real PTY and tmux, reproduce:

- renderer start and clean stop;
- wide left-conversation/right-inspector layout;
- standard and narrow reflow;
- resize behavior;
- focus movement and key bindings;
- multiline editing;
- bounded scrolling;
- overlay behavior;
- synthetic streaming;
- reduced-motion handling;
- Unicode and sanitized hostile text; and
- terminal restoration after normal exit, startup/render failure, `SIGINT`,
  `SIGTERM`, and suspend/resume where supported.

Visual plausibility is insufficient. Capture deterministic state or terminal
fixtures where possible and document the remaining human-observation checks.

### 4. Packaging and native artifacts

From a clean checkout and an isolated test home:

1. install dependencies from the lockfile;
2. run build, test, and dist;
3. inspect the produced package contents;
4. globally install the package from outside the repository;
5. run representative ordinary commands and the TUI fixture; and
6. reproduce missing/corrupt/wrong-target native artifact failures.

For every RT-03 release target, verify the declared OpenTUI native package,
CPU/libc constraints, integrity identity, and installation behavior. Confirm an
ordinary supported install and run needs no Zig compiler. Reject undeclared
runtime download or source-tree fallback.

### 5. Security boundary

Independently trace every value reaching FFI. Prove:

- only the manifest-verified OpenTUI library is opened;
- no operator, lane, environment, plugin, or config value selects a library
  path, symbol, ABI signature, or arbitrary FFI call;
- FFI has presentation authority only;
- untrusted terminal content is sanitized;
- secrets do not appear in output or captured evidence; and
- renderer failure cannot reach lane mutation or bypass the effect executor.

### 6. Performance and structure

Reproduce startup latency, idle CPU, memory, and render/resize responsiveness.
Compare representative ordinary command startup with and without the TUI
dependency present. Investigate material regressions rather than accepting an
unexplained threshold.

Reproduce categorized physical line counts and responsibility inventories under
the mandatory engineering standard. Working spike code is not exempt from hard
ceilings or generic-helper rejection.

## Required Review Packet

The review report at
`.local/agent-reports/coordinator-automation/reviews/CA-18-nirvana-opentui-feasibility-and-packaging-gate-review.md`
must include:

1. final verdict and blocking findings;
2. independent command/test transcripts;
3. dependency and prohibited-framework audit;
4. Nirvana API/gap audit;
5. bootstrap reproduction;
6. platform and native-artifact matrix;
7. PTY/tmux/lifecycle results;
8. security data-flow review;
9. independent performance measurements;
10. structural counts and ownership judgment; and
11. whether CA-19 is authorized.

## Acceptance Conditions

Accept only if:

- every required platform and Node version passes;
- the chosen bootstrap is bounded, loop-safe, and preserves CLI semantics;
- non-TUI commands remain renderer-independent;
- Nirvana/NVB/build/dist/global-install behavior has no unresolved regression;
- the plain-TypeScript imperative renderer proves the required capabilities;
- the dependency and build graph contains no prohibited framework stack;
- native artifacts are deterministic, complete, and fail safely;
- terminal restoration passes every supported lifecycle case;
- FFI is closed to untrusted selection and presentation-only;
- structural gates pass; and
- the implementor's `PASS` verdict is independently reproducible.

## Immediate Reject Conditions

Reject if:

- OpenTUI or FFI is loaded by ordinary commands without accepted necessity;
- the selected launcher loses arguments, environment, streams, TTY, signals,
  or exit codes, or can loop;
- a prohibited framework/toolchain enters the dependency or build graph;
- `src/cli.ts` becomes the TUI/bootstrap implementation owner;
- a direct Node API lacks a demonstrated Nirvana gap and narrow adapter;
- a required platform has no deterministic native artifact;
- install or runtime depends on an undeclared download, source tree, or Zig
  compiler;
- terminal state remains damaged after a tested exit path;
- untrusted data may choose any FFI library/symbol/signature;
- the spike mutates a real lane or gains effect authority;
- build or tests fail;
- generated/local artifacts are staged; or
- a hard structural gate fails.

## Verdict Handoff

On `ACCEPT`, record the exact versions, bootstrap boundary, adapter contract,
platform matrix, native manifest rules, lifecycle contract, and performance
baseline that CA-19 must follow.

On `REJECT`, issue a bounded correction brief and require full re-review of
affected evidence.

On `SPEC_BLOCKED`, name the governing decision and affected release target.
Do not select a fallback renderer or silently narrow v1 scope.
