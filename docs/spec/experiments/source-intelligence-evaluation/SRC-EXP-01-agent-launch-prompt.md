# Agent Launch Prompt — SRC-EXP-01

Read completely:

1. `AGENTS.md`;
2. `docs/development/engineering-and-review-standard.md`;
3. `docs/spec/source-intelligence-draft.md`; and
4. `docs/spec/experiments/source-intelligence-evaluation/SRC-EXP-01-source-retrieval-quality-and-cost.md`.

Execute only the disposable source-retrieval evaluation. This is not
Watchtower implementation.

Before mutation, declare candidate repositories/commits/disposable worktrees,
fixture root, provider/version/install/cache paths, processes/ports, network and
plugin behavior, measurement method, task ordering, cleanup targets, and every
Watchtower path that could be written. Stop if any active implementation or
review worktree would be touched.

Preserve identical task/rubric/budget conditions across fresh mode contexts.
Keep the expected-evidence set independent. Count verification reads and
fallbacks separately. Never describe an incomplete/failed outcome as a token
saving.

Return exactly one verdict: `ADOPT_BASELINE`, `ADOPT_LIMITED`,
`RESEARCH_BLOCKED`, or `REJECT`. Write only the allowed `.local` report in
Watchtower. Do not amend specs, add dependencies, copy spike code, or commit.
