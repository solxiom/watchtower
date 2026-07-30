# Agent Launch Prompt — Review Batch RM-05

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for event-parsing and malformation-handling review`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: agent must retain complete context
- final-authority constraint: only this reviewer issues acceptance judgment

You are assigned **review batch RM-05** for the Watchtower v1 wt-read-model
delivery lane.

## Read In This Order

Repository prerequisites: `AGENTS.md`. Then review brief, review README, index,
paired work brief, implementation report, v1.md (§13), v1-contracts.md (§9),
v1.schema.json (`$defs.durableEvent`), quality rules, and all changed source.

## Your Review Mission

Independently verify the event parser:

1. **Valid events**: Construct JSONL with all four event types, both roles, with/without commits. Verify all parse correctly.
2. **Compatibility matrix**: Test implementer `accept` → warning, reviewer `handoff` → warning. Records included.
3. **Malformation coverage**: Build adversarial JSONL: bad JSON (`{broken`), missing required fields, wrong field types, partial final line, empty records, very large records. Verify every class produces correct diagnostics and valid records are preserved.
4. **Bounded lookup**: Test latest(10) with 0, 1, 5, 15, 100 records. Test latest(100) with large inputs. Verify stable ordering.
5. **Edge cases**: Empty file, file with only blank lines, file with only comments (not valid JSON), file with BOM, file with mixed line endings.
6. **Hard-reject checklist**. **Build and test** independently.

## Acceptance Gate / Rejection / User Rule / Trackers / Local Artifact / Non-Negotiable

(Full sections per RM-01 review launch prompt.)

## Required Disk Report

`.local/agent-reports/wt-read-model/reviews/RM-05-durable-worker-event-jsonl-parser-review.md`

## If accepted, commit: `RM-05: Durable worker-event JSONL parser accepted`
