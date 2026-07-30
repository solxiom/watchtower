# Agent Launch Prompt — Work Batch RT-02

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high — closed type-system design consumed by all later batches`
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

You are assigned **implementation work batch RT-02** for the Watchtower
`wt-runtime-distribution` pack.

This batch defines closed, versioned manifest schemas with SHA-256 checksums,
mode bits, and action records. Every later foundation module and NVB task
consumes these types. Getting the contract wrong here forces corrections in
RT-03 through RT-07.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-runtime-distribution/work-batches/RT-02-runtime-and-knowledge-manifests.md`
2. `docs/spec/implementation/wt-runtime-distribution/work-batches/README.md`
3. `docs/spec/implementation/wt-runtime-distribution/work-batches/00-work-batch-index.md`
4. `docs/spec/implementation/wt-runtime-distribution/README.md`
5. `docs/spec/implementation/wt-runtime-distribution/implementation-roadmap.md`
6. `docs/spec/implementation/wt-runtime-distribution/implementation-quality-and-agent-rules.md`
7. `docs/spec/v1.md` — especially §§7 (filesystem contract), 12 (runtime invocation), 15 (packaging)
8. `docs/spec/v1-contracts.md` — especially §1 (precedence)
9. `docs/spec/architecture.md` — especially §§4.5 (runtime adapter), 5.1 (package)
10. `docs/spec/schemas/v1.schema.json` — JSON Schema bundle
11. The RT-01 audit output — `src/foundation/runtime-assets.ts` and
    `src/foundation/asset-audit.ts`
12. The current source under `src/contracts/` — to place manifest types

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high — closed type-system design consumed by all later batches`
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
   contracts, foundation modules, tests, and status artifacts affected by this
   batch.
2. Inspect the current source and accepted predecessor-batch output. Do not infer
   behavior from filenames, the implementation report, or the launch prompt.
3. Enumerate public invariants, invalid states, and compatibility constraints
   before choosing or evaluating a design.
4. Use counterexamples: identify at least one plausible shortcut that would pass
   a happy-path test while violating type safety, completeness, or validation
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

Define and validate manifest schemas for every bundled asset:

1. Define `RuntimeManifestV1`, `RuntimeAssetV1`, `KnowledgeManifestV1`, and
   `KnowledgeAssetV1` in `src/contracts/manifests.ts`. Include `schemaVersion`,
   `sha256`, `executable`, `actions`, `role`, `requiredCommands`, and
   `compatibleLaneSchemaVersions` / `compatibleRuntimeVersions`.
2. Define `ValidationResult`, `ValidationError`, and `ValidationWarning` types.
   Error codes: `MISSING_ASSET`, `EXTRA_ASSET`, `CHECKSUM_MISMATCH`,
   `MODE_MISMATCH`, `UNKNOWN_SCHEMA_VERSION`.
3. Implement `ManifestValidator` in `src/foundation/manifest-validator.ts`:
   - `validateRuntimeManifest(manifest: RuntimeManifestV1, actualDir: string): ValidationResult`
   - `validateKnowledgeManifest(manifest: KnowledgeManifestV1, actualDir: string): ValidationResult`
4. Add `$defs.runtimeManifest` and `$defs.knowledgeManifest` to
   `docs/spec/schemas/v1.schema.json` if not already present.
5. Verify every RT-01 inventoried asset fits the manifest types.

## What You Must Not Do

- Do not create a second manifest type owner.
- Do not add runtime execution or subprocess spawning to the validator.
- Do not create actual `manifest.json` files in the source tree — only type
  definitions and schema templates.
- Do not introduce NVB staging, catalog, or adapter logic.
- Do not add npm scripts or NVB tasks for this batch.
- Do not commit.

## Required Proof

Before finishing, verify and report:

- `RuntimeManifestV1` and `KnowledgeManifestV1` validate against JSON Schema bundle
- validator rejects missing file, extra file, checksum mismatch, mode mismatch,
  and unknown schema version
- validator preserves unknown fields within schema version 1
- every RT-01 inventoried asset is representable in manifest types
- exact proof commands used
- final `git status --short`
- proof that `.local/` is not staged

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

- `docs/spec/implementation/wt-runtime-distribution/implementation-tracker.md`
- `docs/spec/implementation/wt-runtime-distribution/implementation-roadmap.md`

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`

## Non-Negotiable Rules

- manifest types must be closed — no `any` or `unknown` fields for required data
- every rejection path must be independently testable
- unknown schema versions must fail closed
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-runtime-distribution/RT-02-runtime-and-knowledge-manifests.md`

The report must include: documents studied, exact files changed, line counts for
all new files, each rejection path verified, JSON Schema validation results, proof
commands and outcomes, final `git status --short`, one proposed commit message.

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the exact manifest type shapes, all five validator rejection paths and
their error codes, the JSON Schema bundle location, and the validation result
for the synthetic valid manifest fixture. Make explicit that RT-03 must use these
types to validate the NVB dist layout, and RT-04 must use them to stage
immutable runtimes.
