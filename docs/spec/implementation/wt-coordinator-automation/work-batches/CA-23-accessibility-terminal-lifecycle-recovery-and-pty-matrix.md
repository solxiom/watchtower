# Batch CA-23 — Accessibility, Terminal Lifecycle, Recovery, and PTY Matrix

## Authority And Status

Governing sources: `AGENTS.md`, the mandatory engineering standard,
`v1-contracts.md`, `v1.md`, `nirvana-integration-architecture.md`,
`architecture.md`, `v1-implementation-map.md`, `operator-session.md`,
`cli-session.md`, `tui-operational-experience.md`, accepted CA-18 evidence, and
pack quality rules.
Required interfaces are normative in this pack's
`tui-interface-contracts.md §CA-23 Terminal Safety Contract`.

Status: ❌ Not started
Depends on: CA-18 through CA-22 accepted
Unblocks: CA-24
Reasoning floor: implementor `R5`; reviewer `R5`

## Objective

Close full-screen terminal safety and inclusive-use risk independently:
idempotent lifecycle/restoration, signal and suspend recovery, untrusted
terminal-content security, no-color/high-contrast/reduced-motion/accessible
operation, emulator/Unicode compatibility, and deterministic PTY qualification.

## Owned Capabilities

- one terminal lifecycle/restoration controller over the CA-18 adapter
- terminal-content sanitizer and safe-reference/hyperlink presentation boundary
- accessible linear/announcement presenter and semantic-state assertions
- PTY/emulator, signal, Unicode, resize, failure, and recovery fixtures
- lifecycle/restoration conformance matrix
- semantic visual-state catalog and preference/cache migration qualification

Exact owned production modules:

- `src/contracts/tuiAccessibility.ts`
- `src/presentation/tui/TerminalLifecycleController.ts`
- `src/presentation/tui/TerminalContentSanitizer.ts`
- `src/presentation/tui/AccessibleTuiPresenter.ts`

Exact deterministic specs mirror these modules under `spec/basic/tui/`.
PTY/emulator fixtures live under `spec/support/tuiPty/`, and the single matrix
entry is `spec/integration/tui/TuiTerminalConformanceSpec.ts`. No second
restoration or sanitization owner is permitted.

## Required Interfaces And Work

1. Provide one idempotent owner for raw mode, alternate screen, mouse, bracketed
   paste, cursor, title, keyboard protocol, and signal handlers.
2. Restore on normal exit, startup/render error, uncaught error, SIGHUP,
   SIGINT/SIGTERM paths, terminal loss, and before suspend; redraw verified
   current state after resume. Emergency restore has no lane/session writes.
3. Implement exact Ctrl-C/Ctrl-D/SIGWINCH/SIGTSTP/SIGCONT semantics without
   treating provisional output as final or closing the durable session.
4. Sanitize C0/C1, CSI/OSC/DCS/APC/PM/device control, title, clipboard,
   hyperlink, bidi, malformed UTF-8, markup interpolation, and extreme text on
   every presentation/copy/debug path. Only direct operator copy may use OSC 52.
5. Prove every semantic state without color, mouse, animation, Unicode icons,
   highlighting, or hyperlinks. Accessible mode uses linear focus, restrained
   redraw, region titles, static progress, and append-only announcements.
6. Reconcile CA-18's platform/emulator matrix; do not silently reduce it.
7. Qualify the exact required local/tmux/direct-SSH/SSH+tmux target matrix and
   prove unpromoted tuples fail safely while preserving non-TUI commands.
8. Exercise every operational visual-catalog state and preference/cache
   migration/fallback path through semantic, keyboard, accessibility, and
   terminal-restoration assertions; pixel snapshots alone are insufficient.

## Exclusions

- No product policy, session persistence, model/provider behavior, command
  integration, new renderer selection, or fallback interactive console.
- No terminal state restoration duplicated across components.

## Required Proof

- Deterministic lifecycle state-machine tests plus real PTY/tmux signal,
  suspend/resume, crash, repeated cleanup, and startup-failure tests.
- Terminal mode before/after byte/state proof for every path.
- Escape/OSC/clipboard/title/hyperlink/bidi/markup injection through timeline,
  composer, inspector, overlay, toast, error, copy, and debug surfaces.
- Unicode width, combining, emoji, malformed input, long tokens, code/diff,
  repeated resize, and all required emulators/platforms.
- Keyboard-only, monochrome, no-color, high-contrast, reduced-motion, and
  accessible announcement golden/semantic tests.
- Every `tui-operational-experience.md §11` catalog state at declared
  wide/standard/narrow dimensions, including conflict and recovery states.
- Renderer/native failure leaves `ask` and noninteractive CLI usable.
- `nvb build`, `nvb test`, packaged PTY smoke where required, architecture
  gates, line counts, and Nirvana audit.

## Documentation And Report

Write
`.local/agent-reports/coordinator-automation/CA-23-accessibility-terminal-lifecycle-recovery-and-pty-matrix.md`
with platform/emulator matrix, terminal before/after evidence, sanitizer
coverage, accessibility matrix, files, line counts, and CA-24 handoff. Do not
commit.

## Independent Review

Use
`../review-batches/CA-23-review-accessibility-terminal-lifecycle-recovery-and-pty-matrix.md`.
The reviewer independently reproduces terminal state, signals, injection,
accessibility, platform, structure, and packaged PTY evidence.
