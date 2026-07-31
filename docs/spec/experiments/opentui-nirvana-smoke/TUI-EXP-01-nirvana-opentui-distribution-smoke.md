# TUI-EXP-01 — Nirvana/OpenTUI Distribution Smoke

## 1. Status And Authority

Status: **Ready for isolated execution**
Type: disposable architecture experiment
Reasoning floor: executor `R4`; reviewer `R4`

This experiment is non-normative evidence. It cannot:

- modify Watchtower product source, manifests, locks, help, tests, or specs;
- accept or seal an implementation pack;
- satisfy CA-18 by assertion;
- authorize CA-19 or any implementation lane;
- establish a public CLI or adapter contract; or
- transfer spike code into Watchtower.

If it contradicts a normative Watchtower specification, the result is
`SPEC_BLOCKED` and the specification must be discussed separately.

## 2. Question

Can a minimal Nirvana CLI, using the same ecosystem generation and distribution
shape as Watchtower, ship:

- a conventional noninteractive command;
- an imperative `@opentui/core` + `@opentui/keymap` TUI command;
- Node `>=26.4.0` FFI bootstrap isolated to the TUI path; and
- native OpenTUI artifacts through `nvb build`, `nvb test`, `nvb dist`, and an
  isolated global-style installation?

## 3. Isolation Contract

Default sandbox:

```text
/home/kavan/Projects/watchtower-opentui-spike
```

The executor must:

1. run commands as `kavan`;
2. treat `/home/kavan/Projects/watchtower` as read-only;
3. refuse to overwrite or reuse a nonempty sandbox unless the operator
   explicitly authorizes reuse;
4. create no lane, `.watchtower/`, provider session, or model invocation;
5. use an isolated install prefix inside the sandbox;
6. never install the spike into the system-wide npm prefix;
7. leave the sandbox intact for review; and
8. never delete the sandbox automatically.

The executor may inspect pinned Watchtower/Nirvana files and comparable Nira
usage. It may reproduce only the minimal build/distribution conventions needed
for the experiment; it must not copy Watchtower product modules.

## 4. Required Spike Surface

The sandbox contains one package with:

```text
src/
  cli.ts                         # thin Nirvana host
  commands/
    InfoCommand.ts               # non-TUI control
    TuiCommand.ts                # thin TUI front door
  tui/
    TuiBootstrap.ts              # experiment-only flag/re-exec boundary
    OpenTuiAdapter.ts            # sole OpenTUI import owner
    SmokeApplication.ts          # synthetic presentation only
spec/
  basic/
  pty/
help/
runtime-nvb/
nira.json
nvb.json
package.json
package-lock.json
```

The exact scaffold may adapt to pinned Nirvana conventions, but the ownership
boundaries and two-command control experiment must remain.

`info` prints a deterministic Nirvana-rendered record and must not import,
initialize, or require OpenTUI/FFI.

`tui` renders synthetic data only:

- dominant left conversation panel;
- right inspector panel;
- narrow single-pane response;
- focus movement using `@opentui/keymap`;
- multiline input;
- bounded scrolling;
- one overlay;
- synthetic streaming text;
- resize handling; and
- clean detach.

No React, Solid, Ink, JSX/TSX, Babel, Bun runtime migration, OpenTUI framework
binding, model/provider, filesystem workflow, or product behavior is allowed.

## 5. Required Audit Before Construction

Record:

- exact Node and npm versions;
- pinned Watchtower Nirvana package versions and public APIs inspected;
- comparable Nira CLI/build/dist usage;
- exact OpenTUI versions, native packages, install scripts, licenses, and
  transitive dependency tree;
- expected OS/CPU/libc target;
- whether Zig or another compiler is needed at install or runtime; and
- every `NIRVANA_API_GAP` for interactive rendering, FFI bootstrap, TTY/PTY,
  signals, or native distribution.

Do not install a missing Node/toolchain/runtime globally without explicit
operator authorization. If Node `26.4.0` or a required package cannot be
obtained through the existing authorized environment, return `SPEC_BLOCKED`.

## 6. Bootstrap Experiments

Compare:

1. whole-process `--experimental-ffi`;
2. TUI-only POSIX `process.execve()` re-exec; and
3. a focused TUI launcher boundary.

For each, record:

- ordinary `info` behavior without FFI;
- TUI behavior with and without the required flag;
- permission-model behavior with and without explicit `--allow-ffi`;
- preservation of argv, environment, cwd, stdin/stdout/stderr, TTY identity,
  signals, and exit code;
- loop prevention and failure diagnostics;
- platform limitations;
- cold/warm startup and memory; and
- whether OpenTUI/native modules load in the non-TUI process.

Recommend the narrowest strategy that works. Do not silently select a fallback
renderer.

## 7. Build And Distribution Matrix

Required sequence:

1. clean dependency install from the lockfile;
2. `nvb build`;
3. `nvb test`;
4. `nvb dist`;
5. inspect dist package contents and dependency metadata;
6. install dist using an isolated global-style prefix inside the sandbox;
7. run `info` from outside both source and dist directories;
8. run `tui` from outside both source and dist directories in a real PTY; and
9. repeat through tmux.

Prove:

- relocated bin/import resolution;
- native artifact presence and target match;
- no runtime source-tree lookup or undeclared download;
- no ordinary-install Zig or Bun requirement;
- missing/corrupt/wrong-target native artifact diagnostics;
- uninstall/reinstall behavior in the isolated prefix; and
- non-TUI operation remains usable after TUI/native failure.

Generated `build/`, `dist/`, dependencies, install prefix, and captures remain
inside the disposable sandbox and are never copied or committed to Watchtower.

## 8. Terminal And Security Matrix

Exercise:

- direct PTY and tmux;
- wide, standard, narrow, and temporarily unusable dimensions;
- repeated resize and Unicode/wide/combining glyphs;
- multiline input, focus, paste, scroll, overlay, and synthetic streaming;
- normal exit, startup/render error, Ctrl-C, SIGTERM, terminal loss, and
  suspend/resume where supported;
- raw mode, alternate screen, mouse/paste mode, cursor, and signal restoration;
- escape/OSC/title/clipboard/hyperlink/bidi injection in synthetic untrusted
  text; and
- proof that arbitrary input cannot choose FFI library, symbol, signature, or
  native artifact path.

Capture terminal modes before and after every lifecycle case.

## 9. Measurements

Record the machine, terminal, tmux, dimensions, Node, package, and artifact
versions. Measure:

- non-TUI cold/warm startup with the dependency present;
- TUI first usable input;
- typing/focus/resize response;
- idle CPU;
- initial and steady memory; and
- a bounded 30-minute resize/stream/focus smoke for monotonic growth.

These measurements discover risk; they do not replace CA-18’s normative
performance and two-hour soak requirements.

## 10. Verdict

Return exactly one:

- `PASS` — all required control, build, dist, isolated install, native, PTY,
  restoration, and security cases pass with one feasible bootstrap;
- `FAIL` — the approach is reproducibly incompatible or unsafe; or
- `SPEC_BLOCKED` — required tooling/target/authority is unavailable or the
  result requires a normative decision.

No conditional pass. A correctable failure is fixed and the full affected
matrix is rerun before verdict.

## 11. Evidence And Handoff

Write:

```text
/home/kavan/Projects/watchtower/.local/agent-reports/experiments/TUI-EXP-01/
  execution-report.md
  command-transcript.txt
  dependency-inventory.txt
  package-inventory.txt
  bootstrap-matrix.md
  terminal-matrix.md
  measurements.md
```

The report includes exact sandbox commit/tree state, files, commands, outcomes,
limitations, `NIRVANA_API_GAP` records, selected bootstrap recommendation, and
verdict. `.local/` is never staged.

CA-18 may cite accepted evidence and use it to refine its test plan. CA-18 must
still reproduce compatibility against the real Watchtower product, accepted
release targets, manifests, and dependencies.
