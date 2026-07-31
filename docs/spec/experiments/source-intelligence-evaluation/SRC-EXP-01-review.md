# Independent Review — SRC-EXP-01

Status: **Required before experiment evidence may inform a spec amendment**

The reviewer must be independent of experiment execution and must not rely on
the experiment report as proof.

## Required review

1. Verify repository/commit/worktree/provider/config identities and isolation.
2. Confirm Watchtower was unchanged except permitted `.local` reports.
3. Reconstruct task equality, mode order, fresh-context separation, budgets,
   and expected-evidence independence.
4. Recalculate returned bytes, estimated schema/context overhead, tool calls,
   latency, resources, quality, correction, and accepted-outcome metrics from
   raw records.
5. Sample or rerun at least one structural task in `NATIVE` and `SYMBOL` modes.
6. Independently run the two-worktree canary, dirty/stale view, bounds,
   exclusions, provider-restart, and no-hidden-network/plugin/build checks.
7. Verify every provider limitation and incomplete result was represented
   honestly; `no matches` must not be treated as runtime completeness.
8. Confirm index build/startup/refresh and MCP/tool-schema overhead were not
   excluded from the claimed break-even point.
9. Apply the verdict thresholds exactly and identify any task/language/cache
   limitation.
10. Verify cleanup targets are exact and no cleanup removed user/project data.

## Immediate rejection

- expected evidence was created after seeing compared results;
- task/source/model/budget conditions differed materially without correction;
- one mode inherited source answers from another;
- a missed expected reference or failed review was reported as cheaper success;
- cross-worktree, ignored/secret, symlink, network, plugin, or project-mutation
  isolation failed;
- provider fallback/native verification was hidden or unmetered;
- measurement excludes tool descriptions, provider startup/build, or operator
  correction while claiming end-to-end savings;
- raw evidence cannot reproduce reported aggregates; or
- the report recommends production implementation/dependency adoption without
  a separate specification amendment.

## Verdict

Return exactly one:

- `ACCEPT_ADOPT_BASELINE_EVIDENCE`;
- `ACCEPT_ADOPT_LIMITED_EVIDENCE` with the exact limited scope;
- `RESEARCH_BLOCKED` with the missing evidence/decision; or
- `REJECT` with numbered findings.

Acceptance means only that the experiment may inform a source-intelligence
specification amendment. It does not accept a provider dependency, production
architecture, implementation pack, or release claim.

Write
`.local/source-intelligence-experiment/SRC-EXP-01-review.md`. Do not commit.
