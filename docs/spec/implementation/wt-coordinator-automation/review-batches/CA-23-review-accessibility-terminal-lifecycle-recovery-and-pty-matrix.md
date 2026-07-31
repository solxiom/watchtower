# Review Batch CA-23 — Accessibility, terminal lifecycle, recovery, and PTY matrix

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
Paired work: CA-23
Reviewer floor: `R5`; reviewer owns acceptance commit.

Read the paired brief, all governing sources including
`tui-operational-experience.md`, and accepted CA-18 platform evidence. Apply
the engineering review matrix and independently reproduce
terminal safety; visual inspection alone is insufficient.
Verify the exact file and interface surface in the paired brief and
`tui-interface-contracts.md §CA-23`.

## Independent Proof

- In every required platform/emulator, capture terminal modes before/after
  normal exit, startup/render/uncaught failure, SIGHUP, SIGINT, SIGTERM,
  terminal loss, repeated cleanup, suspend, and resume.
- Verify one idempotent restoration owner and no session/lane write from
  emergency cleanup.
- Reproduce Ctrl-C/Ctrl-D/resize/suspend semantics at editing, preflight,
  invocation, and confirmation stages; provisional output never becomes final.
- Inject C0/C1, CSI/OSC/DCS/APC/PM, title, clipboard, hyperlink, bidi, markup,
  malformed UTF-8, extreme tokens, and hostile content through every surface
  and copy/debug route.
- Reproduce keyboard-only, monochrome, no-color, high contrast, reduced motion,
  accessible linear focus/announcements, Unicode width, narrow layout, and
  repeated resize.
- Prove renderer/native failure restores the terminal and leaves `ask` and
  ordinary CLI usable.
- Reproduce every exact promoted local/tmux/direct-SSH/SSH+tmux tuple and every
  semantic visual-catalog state; verify preference/cache migration and safe
  failure on unpromoted tuples. Pixel snapshots are not acceptance proof.
- Run build/test, required packaged PTY smoke, architecture gates, and
  independent size/Nirvana audits.

Reject on terminal damage, duplicated restoration ownership, missing required
target, unsafe escape/clipboard/title path, color/mouse/motion-only semantics,
emergency mutation, silent fallback console, or any mandatory gate failure.
No conditional acceptance.

Write
`.local/agent-reports/coordinator-automation/reviews/CA-23-accessibility-terminal-lifecycle-recovery-and-pty-matrix-review.md`
and hand the exact conformance matrix to CA-24.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **accessibility/restoration/test adapters**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/reviews/CA-23-accessibility-terminal-lifecycle-recovery-and-pty-matrix-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`CA-18`–`CA-22`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Exact promoted matrix; no-color/high-contrast/reduced motion; signals/suspend/crash restore; preference/cache migration; semantic visual catalog; emulator/Unicode/resize fixtures**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **accessibility/restoration/test adapters** and **Exact promoted matrix; no-color/high-contrast/reduced motion; signals/suspend/crash restore; preference/cache migration; semantic visual catalog; emulator/Unicode/resize fixtures**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-23-accessibility-terminal-lifecycle-recovery-and-pty-matrix-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-coordinator-automation/reviews/CA-23-accessibility-terminal-lifecycle-recovery-and-pty-matrix-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
