# Agent Launch Prompt — Review Batch RM-02

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for JSON envelope and serialization review`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, implementation report, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent
capable of independently verifying JSON envelope contracts.

You are assigned **review batch RM-02** for the Watchtower v1 wt-read-model
delivery lane. You are the independent acceptance authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-read-model/review-batches/RM-02-review-json-envelopes-and-schema-validation.md`
2. `docs/spec/implementation/wt-read-model/review-batches/README.md`
3. `docs/spec/implementation/wt-read-model/review-batches/00-review-batch-index.md`
4. `docs/spec/implementation/wt-read-model/work-batches/RM-02-json-envelopes-and-schema-validation.md`
5. `.local/agent-reports/wt-read-model/RM-02-json-envelopes-and-schema-validation.md`
6. `docs/spec/v1.md`, `docs/spec/v1-contracts.md` (especially §8)
7. `docs/spec/schemas/v1.schema.json` (especially `$defs.commandResult`, `$defs.commandError`)
8. `docs/spec/implementation/wt-read-model/implementation-quality-and-agent-rules.md`
9. the actual changed source files: `src/foundation/serializer.ts`, `src/foundation/result-renderer.ts`

## Your Review Mission

Independently verify the JSON envelope serializer and result renderer:

1. **Schema validation audit**: Construct every envelope variant (`commandResult` with each data type, `commandError` with each exit code). Serialize, parse, validate against the schema. Verify all pass.
2. **Invalid envelope rejection**: Construct envelopes with missing required fields, wrong types, extra forbidden fields. Verify `validateEnvelope` panics.
3. **`--json` purity**: Invoke `renderResult` with `{ json: true }`. Assert output is exactly one JSON string, no ANSI codes, no emojis, no progress indicators. Parse the output to confirm valid JSON.
4. **Human output**: Invoke with `{ json: false }`. Assert human-readable format, `--no-color` removes ANSI.
5. **Additive compatibility**: Add an extra optional field to a `commandResult`. Verify it serializes and validates.
6. **Layer integrity**: Verify serializer does not define domain types; it type-checks against contracts.
7. **Hard-reject checklist**: Run the 16-item checklist.
8. **Build and test**: Rerun `nvb build` and `nvb test`.

## What You Must Not Do

- Do not trust the implementation report.
- Do not accept if any decorative text appears in JSON output.
- Do not accept if the implementation agent committed.

## Required Independent Proof

- Rerun `nvb build` and `nvb test`.
- Round-trip test every envelope variant with schema validation.
- `--json` purity test.
- Additive compatibility test.

## Acceptance Gate / Rejection Correction Brief Rule / User Rule / Trackers

(Full sections per RM-01 review launch prompt template above.)

## Local Artifact Git Rule / Non-Negotiable Rules / Required Disk Report

Write to: `.local/agent-reports/wt-read-model/reviews/RM-02-json-envelopes-and-schema-validation-review.md`

## If accepted, create the acceptance commit

```
RM-02: JSON envelopes and schema validation accepted
```

## Always plan and make task lists
