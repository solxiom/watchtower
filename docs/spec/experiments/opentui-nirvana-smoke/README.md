# TUI-EXP-01 — Nirvana/OpenTUI Distribution Smoke

Status: **Closed — technical feasibility PASS; experiment compliance FAIL**
Authority: **Disposable pre-lane experiment; not product implementation**

This experiment answers one early question: can the Watchtower Nirvana/NVB
toolchain package and run a plain-TypeScript imperative OpenTUI application on
Node `>=26.4.0` without breaking ordinary CLI behavior?

Required artifacts:

- [accepted outcome](TUI-EXP-01-outcome.md)
- [experiment specification](TUI-EXP-01-nirvana-opentui-distribution-smoke.md)
- [execution prompt](TUI-EXP-01-agent-launch-prompt.md)
- [independent review brief](TUI-EXP-01-review.md)
- [independent review prompt](TUI-EXP-01-review-agent-launch-prompt.md)

The experiment is complete and must not receive further correction or review
cycles. It established that imperative OpenTUI works with the Nirvana/NVB,
Node/FFI, native-distribution, PTY, and tmux shape required by Watchtower. Its
formal review rejected protocol compliance because of disposable-host mutation,
incomplete evidence cases, and spike engineering issues. Those findings inform
CA-18 but do not reject OpenTUI suitability or reopen engine selection.

No experiment source may be copied into Watchtower. CA-18 remains responsible
for production qualification against the real package and supported platform
matrix before CA-19 begins.
