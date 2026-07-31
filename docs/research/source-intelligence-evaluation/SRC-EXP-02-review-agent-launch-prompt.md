# Review Agent Launch Prompt — SRC-EXP-02

Read completely:

1. `AGENTS.md`;
2. `docs/development/engineering-and-review-standard.md`;
3. `docs/research/source-intelligence-rejected.md`;
4. `docs/research/source-intelligence-evaluation/SRC-EXP-01-outcome.md`;
5. `docs/research/source-intelligence-evaluation/SRC-EXP-02-corrected-provider-evaluation.md`;
6. `docs/research/source-intelligence-evaluation/SRC-EXP-02-review.md`;
7. the runner report and raw SRC-EXP-02 fixture evidence; and
8. the preparer's hidden bundle only after execution, verifying it against the
   pre-run commitment.

Act only as independent evidence reviewer. Treat the runner report as a map,
recompute its claims, and do not repair the experiment. Do not issue new model
calls or install anything.

Review provider readiness before comparative evidence. If readiness did not
pass before the first task prompt, stop classification at `REJECT_PROVIDER` or
`RESEARCH_BLOCKED`; no later output can establish adoption. Distinguish proven
facts from causal hypotheses, provider-native behavior from wrapper behavior,
and lexical fixture checks from provider-semantic checks.

Return exactly `ACCEPT_ADOPT_BASELINE_EVIDENCE`,
`ACCEPT_ADOPT_LIMITED_EVIDENCE` with scope, `REJECT_PROVIDER`, or
`RESEARCH_BLOCKED`. Write only
`.local/source-intelligence-experiment/SRC-EXP-02-review.md`, owned by `kavan`.
Do not amend specs, clean fixtures, install dependencies, or commit.
