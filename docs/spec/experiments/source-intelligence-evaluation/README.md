# Source Intelligence Evaluation

Status: **Active disposable research sequence — not product implementation**

This experiment evaluates whether a provider-neutral source-intelligence
capability can improve quality-preserving cost per accepted Nirvana task while
maintaining exact worktree isolation and bounded context.

| Artifact | Purpose |
|----------|---------|
| [SRC-EXP-01-source-retrieval-quality-and-cost.md](SRC-EXP-01-source-retrieval-quality-and-cost.md) | Experiment scope, matrix, measurements, safety, and verdict |
| [SRC-EXP-01-agent-launch-prompt.md](SRC-EXP-01-agent-launch-prompt.md) | Bounded experiment-agent handoff |
| [SRC-EXP-01-review.md](SRC-EXP-01-review.md) | Independent evidence and verdict protocol |
| [SRC-EXP-01-review-agent-launch-prompt.md](SRC-EXP-01-review-agent-launch-prompt.md) | Independent reviewer handoff |
| [SRC-EXP-01-outcome.md](SRC-EXP-01-outcome.md) | Accepted blocked outcome and limitations carried into the correction |
| [SRC-EXP-02-corrected-provider-evaluation.md](SRC-EXP-02-corrected-provider-evaluation.md) | Hard-gated provider-readiness and corrected comparative protocol |
| [SRC-EXP-02-outcome.md](SRC-EXP-02-outcome.md) | Independently reviewed provider-readiness rejection and future constraint |
| [SRC-EXP-02-preparer-launch-prompt.md](SRC-EXP-02-preparer-launch-prompt.md) | Independent prompt, schedule, hidden-evidence, and digest-commitment handoff |
| [SRC-EXP-02-agent-launch-prompt.md](SRC-EXP-02-agent-launch-prompt.md) | Bounded corrected experiment-agent handoff |
| [SRC-EXP-02-review.md](SRC-EXP-02-review.md) | Independent readiness, evidence, scoring, and verdict protocol |
| [SRC-EXP-02-review-agent-launch-prompt.md](SRC-EXP-02-review-agent-launch-prompt.md) | Independent corrected-experiment reviewer handoff |
| [SRC-EXP-03-host-route-readiness.md](SRC-EXP-03-host-route-readiness.md) | Low-cost readiness bakeoff for installed host-native structural retrieval routes |
| [SRC-EXP-03-agent-launch-prompt.md](SRC-EXP-03-agent-launch-prompt.md) | Bounded route-inventory and canary runner handoff |
| [SRC-EXP-03-review.md](SRC-EXP-03-review.md) | Independent route-readiness evidence and verdict protocol |
| [SRC-EXP-03-review-agent-launch-prompt.md](SRC-EXP-03-review-agent-launch-prompt.md) | Independent SRC-EXP-03 reviewer handoff |
| [SRC-EXP-03-R1-correction.md](SRC-EXP-03-R1-correction.md) | Corrected rerun after incomplete OpenCode execution and omitted Claude inventory |
| [SRC-EXP-03-R1-agent-launch-prompt.md](SRC-EXP-03-R1-agent-launch-prompt.md) | Corrected OpenCode-then-Claude readiness runner handoff |
| [SRC-EXP-03-R1-review-agent-launch-prompt.md](SRC-EXP-03-R1-review-agent-launch-prompt.md) | Independent corrected-rerun reviewer handoff |

Each disposable fixture belongs outside the Watchtower repository. SRC-EXP-01
remains preserved at `/home/kavan/Projects/watchtower-source-intelligence-spike`
until explicitly pruned. SRC-EXP-02 uses a separate fixture root and may not
alter or reuse the retained evidence as mutable state. No spike code, provider
cache, index, dependency, benchmark repository, or result corpus may be copied
into Watchtower. Only reports under Watchtower `.local/` are local handoff
evidence; accepted product decisions require a later spec amendment.
