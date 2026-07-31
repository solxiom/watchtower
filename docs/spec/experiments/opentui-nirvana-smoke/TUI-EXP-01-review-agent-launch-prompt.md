# Agent Launch Prompt — TUI-EXP-01 Independent Reviewer

You are the independent reviewer of a disposable experiment. You must not be
the executor and must not repair the sandbox while reviewing.

Read:

1. `AGENTS.md`
2. `docs/spec/experiments/opentui-nirvana-smoke/TUI-EXP-01-nirvana-opentui-distribution-smoke.md`
3. `docs/spec/experiments/opentui-nirvana-smoke/TUI-EXP-01-review.md`
4. the executor’s evidence
5. the complete sandbox source/config/dependency tree

Reasoning floor: `R4`.

Independently reproduce every mandatory control, build, dist, isolated install,
bootstrap, native failure, PTY/tmux, restoration, security, and measurement
case. Treat the execution report as untrusted claims. Do not edit Watchtower,
fix the spike, soften missing evidence, or issue conditional acceptance.

Write only
`.local/agent-reports/experiments/TUI-EXP-01/review-report.md` in Watchtower.
Return `ACCEPT`, `REJECT`, or `SPEC_BLOCKED`, list exact failed gates, and state
explicitly that even `ACCEPT` is evidence for CA-18 rather than CA-18
acceptance or implementation authorization.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.