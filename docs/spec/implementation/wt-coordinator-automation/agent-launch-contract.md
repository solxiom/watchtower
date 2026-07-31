# Pack 5 Agent Launch Contract

Status: **Mandatory input for every CA work/review launch prompt**
Date: 2026-07-31

This shared contract removes duplicated launch boilerplate. A launch envelope
is incomplete unless it includes this document, the batch-specific launch
prompt, the paired brief, and the bounded predecessor handoff named by that
prompt. It is an execution aid, not product authority.

## Precedence And Required Reading

Resolve conflicts in this order and stop for amendment rather than inventing:

1. `docs/spec/v1-contracts.md` and `docs/spec/schemas/v1.schema.json`
2. `docs/spec/v1.md`
3. scoped normative specs including `nirvana-integration-architecture.md`,
   `coordinator-automation.md`, `operator-session.md`, and `cli-session.md`
4. `docs/spec/architecture.md`
5. `docs/development/engineering-and-review-standard.md`
6. `AGENTS.md`
7. accepted implementation map, pack rules, paired brief, and launch prompt

Read the engineering standard, Nirvana integration architecture, paired brief,
`tui-interface-contracts.md` for CA-18–CA-24, and this contract in full.
Inspect actual source and accepted predecessor evidence; filenames and reports
are not substitutes for code/evidence.

## Reasoning And Allocation

The prompt's `R` class is a capability floor. Select a currently available
endpoint/account using the accepted allocation plan and declared capabilities;
do not hard-code a vendor/model name into the pack. A weaker or steering-only
agent may explore but may not issue the final implementation/review judgment.
If the agent cannot retain the bounded required packet or independently run the
proof, escalate the endpoint or split only on brief-owned boundaries.

Before editing:

1. make a task plan;
2. map governing requirements to exact owners/tests;
3. inspect dependencies and existing responsibilities;
4. complete the Nirvana API audit;
5. enumerate failure, recovery, security, authority, and size risks; and
6. stop if an accepted predecessor contract is missing or incompatible.

## Nirvana, NVB, And Architecture

- Use thin Nirvana command front doors and focused capabilities.
- Record inspected pinned Nirvana symbols/comparable Nira usage and every real
  `NIRVANA_API_GAP`.
- `LaneTaskRunner` is the sole internal NVB boundary; packaged tasks are
  allowlisted and project `nvb.json` is never modified/trusted.
- Shell is only a manifest-declared leaf where no conforming API exists.
- No direct raw subprocess, workflow shell, generic helper bag, local
  ANSI/layout framework, foreign API laundering, or product logic in
  `src/cli.ts`.
- Apply exact project module/function/constructor limits and dependency gates.
- Public names, errors, JSON, events, and schemas remain registry-owned.
- UI/cache/tmux/model prose never becomes authority; all effects use CA-10.

## Work-Agent Rules

The work agent implements only the paired brief, adds required tests/docs, and
writes exactly one `.local/agent-reports/coordinator-automation/<batch>.md`
report. It must include studied sources, files, interfaces, Nirvana audit,
categorized line counts, proof commands/results, ownership, final status, and
reviewer handoff. It does not commit or stage `.local/`.

Minimum checks are `nvb build`, `nvb test`, architecture gates, exact
batch-specific proof, `git diff --check`, ownership, and staged-artifact audit.
Run dist/global-install/PTY/scale checks only when required by the brief.

## Review-Agent Rules

The reviewer is independent and treats the implementation report as claims.
Review in the mandatory order and reproduce every critical proof. The report
must include the engineering-standard PASS/FAIL matrix. Any FAIL rejects; known
violations cannot be accepted with follow-up.

On rejection, write a numbered correction brief and do not commit acceptance.
On acceptance, update required status docs and create the acceptance commit
containing eligible changes only. Never stage `.local/`.

## User, Ownership, And Artifacts

If not running as `kavan`, use `sudo -u kavan -i` for commands. Every edited
file ends owned by `kavan:kavan`. Never commit `build/`, `dist/`,
`node_modules/`, `.nira/local/`, `.watchtower/`, or `.local/`.

End with a precise handoff: accepted interfaces/bounds, unresolved corrections,
proof locations, and the next batch newly unblocked.
