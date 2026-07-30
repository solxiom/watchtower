# Agent Launch Prompt — Work Batch RT-01

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high — deep asset audit with provenance and behavioral mapping`
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

You are assigned **implementation work batch RT-01** for the Watchtower
`wt-runtime-distribution` pack.

This batch audits and imports every inherited shell runtime script and
coordinator knowledge asset from the `implementation-lane-coordinator` source.
It records full provenance and builds a complete behavioral inventory. No later
batch may package an asset that is not represented in this audit.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-runtime-distribution/work-batches/RT-01-runtime-and-knowledge-asset-audit-import.md`
2. `docs/spec/implementation/wt-runtime-distribution/work-batches/README.md`
3. `docs/spec/implementation/wt-runtime-distribution/work-batches/00-work-batch-index.md`
4. `docs/spec/implementation/wt-runtime-distribution/README.md`
5. `docs/spec/implementation/wt-runtime-distribution/implementation-roadmap.md`
6. `docs/spec/implementation/wt-runtime-distribution/implementation-tracker.md`
7. `docs/spec/implementation/wt-runtime-distribution/implementation-quality-and-agent-rules.md`
8. `docs/spec/v1.md` — especially §§12 (runtime invocation contract), 15 (packaging)
9. `docs/spec/v1-contracts.md` — especially §§1 (precedence), 4 (routing)
10. `docs/spec/architecture.md` — especially §§4.5 (runtime adapter), 4.6 (knowledge pack)
11. `docs/spec/coordinator-automation.md` — for the canonical coordinator action vocabulary
12. The inherited `implementation-lane-coordinator` source — every shell script
    and knowledge doc
13. The current source under `src/foundation/` and `src/contracts/` — to place
    records where they belong

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high — deep asset audit with provenance and behavioral mapping`
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
   contracts, foundation modules, and status artifacts affected by this batch.
2. Inspect the current source and accepted predecessor-batch output. Do not infer
   behavior from filenames, the implementation report, or the launch prompt.
3. Enumerate public invariants, invalid states, and compatibility constraints
   before choosing or evaluating a design.
4. Use counterexamples: identify at least one plausible shortcut that would pass
   a happy-path test while violating ownership, completeness, or provenance
   accuracy, then ensure focused proof rejects it.
5. When a spec and current source disagree, stop that line of implementation,
   record the contradiction precisely, and resolve it through the correction
   process. Do not silently choose the easier interpretation.
6. Treat predecessor reports as leads, not proof. Re-open the actual changed
   files and reproduce all acceptance-critical evidence from the current tree.

## Structural Design And Module-Size Gate

The batch must preserve focused ownership and must not produce a ball of mud,
god object, giant coordinator, or overflow helper module.

- Front doors, factories, registries, commands, renderers, and public
  barrels target 160 lines or fewer. Files from 161 through 220 lines require an
  explicit cohesion justification. A hand-maintained front door over 220 lines
  is rejectable without a narrow pre-existing constraint, and no front door may
  exceed 300 lines.
- Focused implementation modules target 220 lines or fewer. Files from 221
  through 300 lines require a responsibility inventory and independent reviewer
  scrutiny. Files from 301 through 350 lines are expected to split; acceptance
  requires a source-backed reason why splitting would reduce ownership clarity.
  New or materially rewritten implementation modules above 350 lines are
  rejected.
- Four hundred physical lines is the absolute ceiling for every hand-maintained
  JS/TS source or spec module touched by this pack. The ceiling does not make a
  mixed-responsibility file acceptable.
- Split a module below those thresholds when it owns three or more independently
  nameable concerns or combines state policy, I/O, normalization, planning,
  error translation, or rendering.
- Coordinators sequence focused collaborators; they do not absorb collaborator
  algorithms. Barrels expose a local capsule; they do not launder foreign APIs.
- Do not create generic `helpers`, `utils`, `common`, or `misc` overflow bags.
  Use feature-local capsules with explicit owner names.
- Record physical line counts for every new or materially rewritten file. The
  reviewer must independently verify warning-band files and reject unjustified
  growth in an existing oversized module.

## Your Mission

Audit and import every inherited runtime and knowledge asset with complete
provenance:

1. Discover every shell runtime script in the inherited
   `implementation-lane-coordinator` source. Record source path, SHA-256 digest,
   line count, description, and coordinator action(s) for each script.
2. Discover every coordinator knowledge doc in the inherited source. Record
   source path, SHA-256 digest, title, and behavioral role for each doc.
3. Build a complete behavioral inventory. Map every known coordinator action to
   the script(s) that perform it and the doc(s) that describe it. Map every asset
   to at least one coordinator action.
4. Write the audit into `src/foundation/runtime-assets.ts` (runtime script
   records) and `src/foundation/asset-audit.ts` (behavioral inventory).
5. Add asset record types to `src/contracts/manifests.ts` if not already defined
   by RM-01.
6. Cross-reference against `docs/spec/coordinator-automation.md` to verify no
   coordinator action or doc is omitted.

## What You Must Not Do

- Do not modify any inherited shell script or knowledge doc content.
- Do not execute any inherited shell script during audit.
- Do not import or depend on the coordinator source repository at build time.
- Do not create new runtime scripts or knowledge docs.
- Do not introduce NVB staging, catalog, or adapter logic.
- Do not add npm scripts or NVB tasks for this batch.
- Do not commit.

## Required Proof

Before finishing, verify and report:

- exact count of shell scripts found and recorded
- exact count of knowledge docs found and recorded
- behavioral inventory completeness (no orphan actions, no orphan assets)
- SHA-256 digest accuracy against inherited source
- import provenance record (source repository URI, commit hash, import date)
- cross-reference against `docs/spec/coordinator-automation.md` for omissions
- exact proof commands used
- final `git status --short`
- proof that `.local/` is not staged

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep all trackers and status docs updated if this batch changes concrete shape
or accepted status:

- `docs/spec/implementation/wt-runtime-distribution/implementation-tracker.md`
- `docs/spec/implementation/wt-runtime-distribution/implementation-roadmap.md`
- `docs/spec/v1-implementation-map.md` (section 5)

Also update these if your accepted implementation changes what they claim:

- `docs/spec/architecture.md`

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`
- agent reports must never be included in a commit

## Non-Negotiable Rules

- do not modify inherited source content — audit only
- do not execute inherited scripts during audit
- behavioral inventory must be complete — no orphan actions or assets
- provenance must include exact source URI, commit hash, and import date
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-runtime-distribution/RT-01-runtime-and-knowledge-asset-audit-import.md`

The report must include:

- documents studied
- exact files changed
- exact asset counts (scripts and docs)
- behavioral inventory statistics (actions, mappings, completeness)
- SHA-256 digest verification summary
- import provenance record
- proof commands and outcomes
- final `git status --short`
- one proposed commit message for the reviewer

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the exact count of runtime scripts and knowledge docs, the behavioral
inventory coverage percentage, any identified spec/import gaps (actions without
assets), and the provenance source URI and commit hash. Make explicit that
RT-02 must define manifest types against this complete asset inventory.
