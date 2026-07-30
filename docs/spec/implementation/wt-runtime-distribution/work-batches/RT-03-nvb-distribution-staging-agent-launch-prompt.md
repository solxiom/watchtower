# Agent Launch Prompt — Work Batch RT-03

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R3`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R3`
- agent suitability: `high for bounded build configuration with focused proof`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent
  re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing
  specs, current source, predecessor handoff, and proof output in context; if it
  cannot do so, escalate the agent rather than shortening or partitioning away
  safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help
  with bounded exploration, but it cannot issue the final implementation or
  acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Product names above are only
non-normative examples and may become unavailable or stale. Select a currently
available agent that can load the complete brief/spec/source context, inspect
and edit the repository with tools, reason across package boundaries, and run
the required proof without replacing evidence with narrative confidence.

- For `R3`, require reliable bounded repository reasoning and focused regression
  work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path
  design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient
  context for state machines, concurrency, graph/planner logic, driver behavior,
  destructive migration safety, or cross-package closure evidence.
- If the assigned agent cannot retain the governing context, independently
  inspect the source, or execute the proof, escalate to a stronger agent or
  split only along the existing brief's ownership boundaries. Never reduce the
  contract to fit a weaker model.

You are assigned **implementation work batch RT-03** for the Watchtower
`wt-runtime-distribution` pack.

This batch configures NVB distribution staging that produces a validated `dist/`
tree including the SQLite native driver from DB-01. The build pipeline must
compare packaged manifests against actual files and fail on any mismatch. This
closes the legacy failure where new scripts were omitted from an init copy list
and ensures the derived-storage driver ships with every distribution.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-runtime-distribution/work-batches/RT-03-nvb-distribution-staging.md`
2. `docs/spec/implementation/wt-runtime-distribution/work-batches/README.md`
3. `docs/spec/implementation/wt-runtime-distribution/work-batches/00-work-batch-index.md`
4. `docs/spec/implementation/wt-runtime-distribution/README.md`
5. `docs/spec/implementation/wt-runtime-distribution/implementation-quality-and-agent-rules.md`
6. `docs/spec/v1.md` — especially §15 (packaging)
7. `docs/spec/v1-contracts.md`
8. The RT-02 manifest types — `src/contracts/manifests.ts`
9. The RT-01 asset inventory — `src/foundation/runtime-assets.ts`
10. The DB-01 SQLite driver selection and feasibility report — driver binary path,
    platform map, loader API, and checksum record from the accepted DB-01 handoff
11. Current `runtime-nvb/` directory and `nira.json`

## Reasoning / Agent Class

- brief-declared reasoning level: `R3`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R3`
- agent suitability: `high for bounded build configuration with focused proof`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent
  re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing
  specs, current source, predecessor handoff, and proof output in context; if it
  cannot do so, escalate the agent rather than shortening or partitioning away
  safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help
  with bounded exploration, but it cannot issue the final implementation or
  acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   NVB tasks, dist layout, and validation points.
2. Inspect the current source and accepted predecessor-batch output. Do not infer
   behavior from filenames, the implementation report, or the launch prompt.
3. Enumerate the required dist layout from `docs/spec/v1.md` §15 and every
   validation check from RT-02's manifest validator.
4. Use counterexamples: identify at least one plausible shortcut that would pass
   a happy-path `nvb dist` while silently omitting a runtime script or skipping
   checksum validation.
5. When a spec and current source disagree, stop that line of implementation.
6. Treat predecessor reports as leads, not proof.

## Structural Design And Module-Size Gate

- NVB task files target concise declarative configuration, not imperative scripts.
- Front doors target 160 lines or fewer. No front door may exceed 300 lines.
- Focused implementation modules target 220 lines or fewer.
- Four hundred physical lines is the absolute ceiling.
- Do not create generic `helpers`, `utils`, `common`, or `misc` overflow bags.

## Your Mission

Configure NVB distribution staging including SQLite driver packaging:

1. Create or extend `runtime-nvb/dist.nvb` with `wt:pack:runtime` and
   `wt:runtime:validate` tasks.
2. Ensure `wt:pack:runtime` copies runtime and knowledge assets into `dist/`
   with the correct layout.
3. Package the SQLite native driver binary from DB-01 into `dist/driver/` for
   all target platforms (linux-x64, linux-arm64, darwin-x64, darwin-arm64).
   Verify the native binary is included and loads correctly from its dist
   location on each target platform.
4. Ensure `wt:runtime:validate` compares packaged manifests against actual files
   and fails on any mismatch.
5. Preserve executable bits on runtime scripts during copy.
6. Update `nira.json` with NVB task registrations.
7. Prove two consecutive `nvb dist` runs produce identical `dist/` trees.

## What You Must Not Do

- Do not add npm convenience scripts — use NVB tasks only.
- Do not copy `node_modules` into `dist/`.
- Do not modify runtime script content.
- Do not introduce catalog, adapter, or managed-link logic.
- Do not commit.

## Required Proof

- `nvb dist` produces correct `dist/` layout
- SQLite native driver binary present in `dist/driver/` for all target platforms
- Native driver module loads from its dist location on each target platform
- Dist manifest includes driver checksum and platform mapping from DB-01
- `wt:runtime:validate` passes on correct dist
- `wt:runtime:validate` fails on missing, extra, checksum-mismatched, and
  mode-mismatched assets
- Executable bits preserved on runtime scripts
- Two consecutive builds produce identical `dist/` trees
- `nvb build` still compiles TypeScript source
- Architecture checks pass
- Exact commands and outcomes recorded

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-runtime-distribution/RT-03-nvb-distribution-staging.md`

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the exact NVB task names, dist layout tree, validation failure codes, and
reproducible build proof. Make explicit that RT-07 depends on this pipeline
producing a valid dist tree.
