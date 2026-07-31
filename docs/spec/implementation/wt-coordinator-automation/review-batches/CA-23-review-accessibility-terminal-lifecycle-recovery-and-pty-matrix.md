# Review Batch CA-23 — Accessibility, Terminal Lifecycle, Recovery, and PTY Matrix

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
