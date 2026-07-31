# Batch CA-23 — Accessibility, terminal lifecycle, recovery, and PTY matrix

## Synchronized batch execution matrix

- **Accepted-map title:** Accessibility, terminal lifecycle, recovery, and PTY matrix
- **Dependencies:** `CA-18`–`CA-22`
- **Exclusive ownership/interface:** accessibility/restoration/test adapters
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory batch proof:** Exact promoted matrix; no-color/high-contrast/reduced motion; signals/suspend/crash restore; preference/cache migration; semantic visual catalog; emulator/Unicode/resize fixtures
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-23-accessibility-terminal-lifecycle-recovery-and-pty-matrix.md`
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-23-accessibility-terminal-lifecycle-recovery-and-pty-matrix-review.md`
- **Correction report:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-23-accessibility-terminal-lifecycle-recovery-and-pty-matrix-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

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

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **accessibility/restoration/test adapters**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/CA-23-accessibility-terminal-lifecycle-recovery-and-pty-matrix.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`CA-18`–`CA-22`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Exact promoted matrix; no-color/high-contrast/reduced motion; signals/suspend/crash restore; preference/cache migration; semantic visual catalog; emulator/Unicode/resize fixtures**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **accessibility/restoration/test adapters** and **Exact promoted matrix; no-color/high-contrast/reduced motion; signals/suspend/crash restore; preference/cache migration; semantic visual catalog; emulator/Unicode/resize fixtures**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-coordinator-automation/CA-23-accessibility-terminal-lifecycle-recovery-and-pty-matrix.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
