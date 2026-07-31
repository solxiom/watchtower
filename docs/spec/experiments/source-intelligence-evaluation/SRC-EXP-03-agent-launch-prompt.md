# Agent Launch Prompt — SRC-EXP-03

Read completely:

1. `AGENTS.md`;
2. `docs/development/engineering-and-review-standard.md`;
3. `docs/spec/source-intelligence-draft.md`;
4. `docs/spec/experiments/source-intelligence-evaluation/SRC-EXP-02-outcome.md`;
5. `docs/spec/experiments/source-intelligence-evaluation/SRC-EXP-03-host-route-readiness.md`.

Execute only the disposable installed-host readiness bakeoff. This is research,
not Watchtower implementation.

Declare the fixture, repository/view, host/config/auth/cache/session, process,
network, capture, report, and cleanup boundaries before mutation. Freeze the
complete candidate set before model calls. Test eligible routes sequentially
in the specified host order, with at most one accepted canary model call per
route. Do not install a provider, modify global/project configuration, reuse a
prior fixture, run T1–T7, or use native fallback.

Stop a route immediately on absent outbound tools, zero correlated tool calls,
unbounded behavior, source-view writes, or source transfer outside the allowed
request. Do not infer unobserved causes.

Write only `.local/source-intelligence-experiment/SRC-EXP-03-report.md`, owned
by `kavan` mode `0600`. Return exactly `ROUTE_READY` with scope,
`NO_ELIGIBLE_ROUTE`, `REJECT_ROUTES`, or `RESEARCH_BLOCKED`. Do not amend specs,
clean, or commit.
