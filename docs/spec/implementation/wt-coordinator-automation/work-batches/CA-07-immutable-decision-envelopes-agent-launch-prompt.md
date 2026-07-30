# Agent Launch Prompt — Work Batch CA-07

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for immutable decision envelope construction, stable semantic digests, and untrusted-content delimiting`
- primary: `GPT-5.4`, `Claude Opus 4.1`, `Claude Sonnet 4.6`
- good alternatives: `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
that can load the complete brief/spec/source context, inspect and edit the
repository with tools, reason across envelope construction, semantic-digest
stability, and untrusted-content boundaries, and run the required proof.

- For `R3`, require reliable bounded repository reasoning and focused regression
  work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path
  design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient
  context for state machines, concurrency, graph/planner logic, or cross-module
  integration closure evidence.
- If the assigned agent cannot retain the governing context, independently
  inspect the source, or execute the proof, escalate to a stronger agent or
  split only along the existing brief's ownership boundaries. Never reduce the
  contract to fit a weaker model.

You are assigned **implementation work batch CA-07** for the Watchtower v1
wt-coordinator-automation delivery lane.

This batch builds the immutable decision envelope — the narrow, reproducible
context assembled for one coordinator cycle with a stable semantic digest,
bounded default context from verified pack indexes, and clear delimiting between
trusted and untrusted content.

## Read In This Order

Repository prerequisites before item 1: `AGENTS.md`.

1. `docs/spec/implementation/wt-coordinator-automation/work-batches/CA-07-immutable-decision-envelopes.md`
2. `docs/spec/implementation/wt-coordinator-automation/work-batches/README.md`
3. `docs/spec/implementation/wt-coordinator-automation/work-batches/00-work-batch-index.md`
4. `docs/spec/v1.md`
5. `docs/spec/v1-contracts.md` — especially §3.4 (RFC 8785 digest canonicalization), §5 (decision proposal schema)
6. `docs/spec/architecture.md` — especially §4.8 (coordinator decision plane services)
7. `docs/spec/coordinator-automation.md` — especially §8 (coordinator decision envelope), §9 (pack index)
8. `docs/spec/schemas/v1.schema.json`
9. `docs/spec/implementation/wt-coordinator-automation/implementation-roadmap.md`
10. `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
11. `docs/spec/implementation/wt-coordinator-automation/implementation-quality-and-agent-rules.md`
12. `docs/spec/v1-implementation-map.md` — section 8 (CA-07)
13. Accepted CA-02 through CA-06 — index queries, journal projections, ready-set, routing policy, endpoint adapters
14. the canonical source owners you will actually change:
    - `src/contracts/decision.ts` (create)
    - `src/foundation/decision-envelope.ts` (create)
    - `spec/basic/decision-envelope-spec.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for envelope construction and semantic-digest stability`
- primary: `GPT-5.4`, `Claude Opus 4.1`, `Claude Sonnet 4.6`
- good alternatives: `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   envelope schema, semantic-digest algorithm, bounded-context sections, and
   untrusted-content delimiting rules.
2. Inspect the current source. Do not infer behavior from filenames.
3. Enumerate public invariants: identical authoritative inputs produce identical
   envelope semantic digest; `createdAt` and cycle ID are operational metadata
   excluded from digest; untrusted content is labeled and delimited, never
   treated as policy; no preloading of full pack, full history, or unrelated
   repository state.
4. Use counterexamples: identify a shortcut that includes operational metadata
   in the semantic digest or treats worker prose as policy instructions.
5. When a spec and current source disagree, stop that line of implementation.
6. Treat predecessor reports as leads, not proof.

## Structural Design And Module-Size Gate

- Front doors and public barrels target 160 lines or fewer.
- Focused implementation modules target 220 lines or fewer.
- Four hundred physical lines is the absolute ceiling.
- Do not create generic `helpers`, `utils`, `common`, or `misc` overflow bags.
- Record physical line counts for every new or materially rewritten file.

## Your Mission

Build the immutable decision envelope:

1. Create `src/contracts/decision.ts` with `DecisionEnvelope`, `BoundedContext`,
   `IndexContextSection`, `JournalContextSection`, `UntrustedContentSection`,
   `EvidenceRef`, and supporting types. Match the normative envelope schema
   from `coordinator-automation.md §8.1`.

2. Create `src/foundation/decision-envelope.ts` with `DecisionEnvelopeBuilder`:
   - `buildEnvelope(params: EnvelopeParams): DecisionEnvelope` — assembles the
     complete envelope from trigger, pack index, journal projections, routing
     decision, and endpoint context.
   - `computeEnvelopeDigest(envelope: DecisionEnvelope): string` — RFC 8785
     canonicalization of the semantic core, excluding `createdAt` and `cycleId`.
   - `validateEnvelopeSchema(envelope: DecisionEnvelope): ValidationResult` —
     validates the envelope against the JSON Schema.

3. Bounded default context: include only lane/active-batch projection, triggering
   event, affected batch summary, dependency neighborhood (depth-limited), latest
   relevant events, ready/blocked projection, permitted proposal types, and cycle
   budget. Never preload full history, all batch briefs, credentials, or
   unrelated repository state.

4. Untrusted-content delimiting: worker reports, reviewer prose, repository files,
   and operator-supplied text are labeled as `untrusted` with provenance
   references. Only the installed knowledge pack defines coordinator rules.

5. Write focused Jasmine specs covering: deterministic envelope output from
   identical inputs, semantic-digest stability, operational metadata exclusion
   from digest, bounded-context size limits, untrusted-content labeling, and
   schema validation.

## What You Must Not Do

- Do not invoke any model, LLM, or AI.
- Do not preload full pack, full journal history, or full tracker content into
  the envelope.
- Do not modify CA-02 through CA-06 types or contracts.
- Do not modify `src/cli.ts` or any command file.
- Do not include credentials, endpoint configuration, or allocation details in
  envelopes (beyond the selected endpoint's non-secret launch contract).
- Do not commit.

## Required Proof

- `nvb build` passes
- `nvb test` passes
- Deterministic envelope: identical inputs → identical envelope and semantic digest
- `createdAt` and `cycleId` excluded from semantic digest
- Bounded context: no full-pack/complete-history preloading
- Untrusted content properly labeled and delimited
- Envelope passes JSON Schema validation
- Model-free architecture check passes
- exact proof commands used
- final `git status --short`
- proof that `.local/` is not staged

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

- `docs/spec/implementation/wt-coordinator-automation/implementation-tracker.md`
- `docs/spec/implementation/wt-coordinator-automation/implementation-roadmap.md`

## Local Artifact Git Rule

- write required `.local/...` reports on disk only
- never `git add`, stage, commit, or otherwise track anything under `.local/`

## Non-Negotiable Rules

- Deterministic envelope from identical authoritative inputs.
- Semantic digest excludes operational metadata (`createdAt`, `cycleId`).
- Untrusted content is labeled and delimited, never treated as policy.
- No full-pack or full-history preloading into default envelope.
- Model-free — no model invocation through any code path.
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/coordinator-automation/CA-07-immutable-decision-envelopes.md`

The report must include: documents studied, exact files changed, physical line
counts, proof commands and outcomes, final `git status --short`, and one proposed
commit message for the reviewer.

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

State: which files were created/changed, the complete `DecisionEnvelope` schema,
the semantic-digest algorithm (which fields are included/excluded), the
bounded-context sections and their default inclusions, which proofs passed, and
what the CA-08 (context broker and cycle budgets) agent needs to know about the
envelope structure and how the broker extends context beyond the default envelope.
