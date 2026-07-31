# TUI-EXP-01 — Nirvana/OpenTUI Distribution Smoke

Status: **Ready for isolated execution**
Authority: **Disposable pre-lane experiment; not product implementation**

This experiment answers one early question: can the Watchtower Nirvana/NVB
toolchain package and run a plain-TypeScript imperative OpenTUI application on
Node `>=26.4.0` without breaking ordinary CLI behavior?

Required artifacts:

- [experiment specification](TUI-EXP-01-nirvana-opentui-distribution-smoke.md)
- [execution prompt](TUI-EXP-01-agent-launch-prompt.md)
- [independent review brief](TUI-EXP-01-review.md)
- [independent review prompt](TUI-EXP-01-review-agent-launch-prompt.md)

The executor works only in an isolated disposable sibling repository. The
Watchtower repository is read-only except for an untracked `.local` evidence
report. No experiment source may be copied into Watchtower. A `PASS` is useful
evidence for CA-18, not CA-18 acceptance or permission to start CA-19.
