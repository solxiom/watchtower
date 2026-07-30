# Agent Launch Prompt — Review Batch REL-01

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.6 Terra`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.6 Sol` only with strong steering and full pipeline reproduction
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, `GPT-5.2`, or any fast/low-reasoning configuration
- selection constraint: the agent must reproduce the complete pipeline spanning all six packs; the full context of the governing specs, the implementation report, and the source tree must be retained
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.6 Terra`
- good alternatives: `Claude Sonnet 4.6` only with strong steering and full pipeline reproduction
- acceptable only with strong human steering and mandatory independent re-review: `GPT-5.6 Sol`, `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku`, `GPT-5.2`, or any fast/low-reasoning configuration
- selection constraint: the agent must retain full context of governing specs, implementation report, and source tree
- final-authority constraint: a steering-only or lower-reasoning agent cannot issue the final acceptance judgment

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Product names above are only non-normative examples and may become unavailable or stale. Select a currently available agent that can load the complete brief/spec/source context, inspect and edit the repository with tools, reason across package boundaries, and run the required proof without replacing evidence with narrative confidence.

- For `R3`, require reliable bounded repository reasoning and focused regression work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient context for state machines, concurrency, graph/planner logic, driver behavior, destructive migration safety, or cross-package closure evidence. This review batch is R5 because the reviewer must independently reproduce the complete end-to-end pipeline spanning all six packs, exercise every command through the globally installed binary, verify journal integrity and schema conformance, and diagnose any failure by tracing through accepted source.
- If the assigned agent cannot retain the governing context, independently inspect the source, or execute the proof, escalate to a stronger agent or split only along the existing brief's ownership boundaries. Never reduce the contract to fit a weaker model.

You are assigned **review batch REL-01** — the independent review of the fresh-lane implementer→reviewer→accept trial. You must independently reproduce the complete pipeline, verify every claim in the implementation report, and either accept with an acceptance commit or reject with a correction brief.

## Read: review brief, impl report, work brief, governing specs, implementation map, quality rules.

## Expanded Read And Verification Order

1. Repository prerequisites: `AGENTS.md`, `docs/spec/v1-implementation-map.md`.
2. The durable review brief: `REL-01-review-fresh-lane-implementer-reviewer-accept-trial.md`.
3. The paired work brief: `REL-01-fresh-lane-implementer-reviewer-accept-trial.md`.
4. The governing specs: `docs/spec/v1.md` (entire), `docs/spec/v1-contracts.md` (entire), `docs/spec/architecture.md`, `docs/spec/coordinator-automation.md`, `docs/spec/operator-session.md`, `docs/spec/cli-session.md`.
5. The implementation report at `.local/agent-reports/watchtower-release/REL-01-fresh-lane-trial.md`.
6. The actual `git diff` from the baseline commit. Verify only spec files and trackers changed.
7. The current source: every command class, foundation module, and contract that the pipeline exercises.
8. The pack 1–5 trackers to verify prerequisite acceptance status.
9. `nvb.json` — available NVB task surfaces.
10. Final git status and file ownership.

## Reviewer Class: R5

### Complete local forwarding and reasoning profile — mandatory

[same details as in Recommended agent/model class section above]

## Mandatory Reasoning Protocol

1. Build a dependency map from the pipeline steps to the underlying command classes, foundation services, and runtime actions.
2. Verify prerequisite packs are accepted. Run `nvb build` and `nvb test` independently.
3. Execute every pipeline step independently. Do not trust the implementation report — re-run every command.
4. Enumerate public invariants, invalid states, failure precedence, compatibility constraints, and deliberately unsupported behavior.
5. Use counterexamples: identify at least one plausible defect that the implementation report might have missed — such as a symlink resolution bug that makes `bin/` links appear copied, a JSON output field missing from the schema, or a negative case that passes when it should fail.
6. Treat the implementation report as a lead, not proof.

## Structural Design And Module-Size Gate

- E2E spec files must not exceed 400 physical lines each.
- No new product source modules in the diff.
- No generic helper bags.
- No npm convenience scripts.

## Your Review Mission

Perform an independent review of REL-01's implementation. You are the reviewer, not a second implementer.

### Review Pass 1 — Prerequisites

1. Verify packs 1–5 are all independently accepted. Read their trackers. Run `nvb build` and `nvb test`.
2. Verify `hello` is gone: `src/commands/HelloCommand.ts`, `help/commands/hello.hlp.json`, any hello spec.
3. Record the baseline commit hash and current git status.

### Review Pass 2 — Global Install

1. Run `nvb dist` and verify exit code.
2. List `dist/` contents. Verify every required directory exists.
3. For a sample of managed assets in `dist/runtime/manifest.json`, compute actual SHA-256 and compare.
4. Run `npm install -g ./dist`. Verify exit code.
5. Run `wt --version`. Verify exit 0 and correct version.
6. Run `wt help`. Verify no `hello` command listed.

### Review Pass 3 — Init Trial

1. Independently create a valid implementation pack fixture (or reuse the REL-01 fixture).
2. Run `wt init` with the fixture. Verify exit 0.
3. Inspect `.watchtower/lanes/<slug>/lane.json`. Verify every required field.
4. Inspect `.watchtower/lanes/<slug>/install.json`. Verify `cliVersion`, `runtimeVersion`, `knowledgeVersion`, `mode`.
5. Inspect `.watchtower/lanes/<slug>/repositories.local.json`. Verify binding matches.
6. Run `ls -la .watchtower/lanes/<slug>/bin/`. Verify every entry is a symlink to the XDG runtime store, NOT a copied regular file.
7. Verify no runtime tree was copied by comparing the `bin/` link targets against `~/.local/share/watchtower/runtimes/`.

### Review Pass 4 — Init Refusal

Independently attempt each negative case:
1. Unaccepted pack → refusal with diagnostic referencing acceptance.
2. Unsealed pack → refusal with diagnostic referencing seal.
3. Uncommitted sealed file → refusal.
4. Critically drifted pack → refusal.
5. Existing lane with same slug → refusal.
6. Missing `.watchtower/` in `.gitignore`, no `--update-gitignore` → preflight failure.

### Review Pass 5 — Discovery, Status, Watch

1. From control home root: `wt list` shows the lane.
2. From descendant: `wt list` shows the lane.
3. From lane directory: `wt list` shows the lane.
4. From unrelated directory: `wt list` shows empty or no error.
5. Run `wt status --json`. Validate against `docs/spec/schemas/v1.schema.json`.
6. Run `wt watch` with `timeout 5`. Verify heartbeats on stdout. Verify clean exit.

### Review Pass 6 — Cycle, Sessions, Doctor, Upgrade

1. Trace the implementer→reviewer→accept cycle through coordinator journals.
2. Run operator session create → ask → hold → release → close.
3. Run `wt doctor` healthy, then break a check, re-run, verify fail/warn.
4. Run `wt upgrade` preview, `wt upgrade --apply`, verify managed-path-only changes, verify session history preserved, verify downgrade refusal.

### Review Pass 7 — Evidence Packet

1. Read the release evidence packet. Verify every command is documented with exact invocation and output.
2. Verify no secrets, passwords, tokens, or connection URLs appear.
3. Verify environmental limitations are documented honestly.

### Review Pass 8 — Architecture

1. Verify diff touches only spec files, trackers, and `.local/` reports.
2. Run `nvb check:architecture`. Must exit 0.
3. Verify no prohibited artifacts in git.

## What You Must Not Do

- Do not fix the batch while reviewing unless reassigned as an implementation correction.
- Do not accept a batch where the pipeline cannot be independently reproduced.
- Do not accept a batch where `wt init` copies the runtime tree.
- Do not accept a batch where an init refusal negative case silently passes.
- Do not accept a batch where `wt status --json` fails schema validation.
- Do not trust the implementation report without independent verification.
- Do not commit unless delivering an ACCEPT verdict.

## Verdict, Correction, And Commit Ownership

- On rejection: create `corrections/REL-01-correction-NN.md` with exact defects, evidence, required correction, and proof to rerun.
- On acceptance: synchronize trackers, create the acceptance commit, write the review report to `.local/agent-reports/watchtower-release/reviews/REL-01-fresh-lane-trial-review.md`.
- REL-02 is blocked until REL-01 is accepted.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Required Disk Report

Write exactly one review report to:

- `.local/agent-reports/watchtower-release/reviews/REL-01-fresh-lane-trial-review.md`

## Always plan and make task lists

## Leave a helpful handoff message for the next agent

This is the first of four release review batches. After acceptance, the next review batch is REL-02 (concurrent and multi-repository recovery trials). Record the independent proof results, the exact acceptance commit hash, and the synchronized tracker state. The handoff must note that REL-02 review depends on REL-01 acceptance.
