# Source Intelligence Evaluation

Status: **Disposable pre-lane experiment — not product implementation**

This experiment evaluates whether a provider-neutral source-intelligence
capability can improve quality-preserving cost per accepted Nirvana task while
maintaining exact worktree isolation and bounded context.

| Artifact | Purpose |
|----------|---------|
| [SRC-EXP-01-source-retrieval-quality-and-cost.md](SRC-EXP-01-source-retrieval-quality-and-cost.md) | Experiment scope, matrix, measurements, safety, and verdict |
| [SRC-EXP-01-agent-launch-prompt.md](SRC-EXP-01-agent-launch-prompt.md) | Bounded experiment-agent handoff |
| [SRC-EXP-01-review.md](SRC-EXP-01-review.md) | Independent evidence and verdict protocol |
| [SRC-EXP-01-review-agent-launch-prompt.md](SRC-EXP-01-review-agent-launch-prompt.md) | Independent reviewer handoff |

The disposable fixture belongs outside the Watchtower repository at
`/home/kavan/Projects/watchtower-source-intelligence-spike`. No spike code,
provider cache, index, dependency, benchmark repository, or result corpus may
be copied into Watchtower. Only reports under Watchtower `.local/` are local
handoff evidence; accepted product decisions require a later spec amendment.
