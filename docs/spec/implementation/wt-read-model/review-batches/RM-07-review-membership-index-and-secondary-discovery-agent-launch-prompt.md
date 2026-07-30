# Agent Launch Prompt — Review Batch RM-07

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for membership validation review`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: agent must retain complete context
- final-authority constraint: only this reviewer issues acceptance judgment

You are assigned **review batch RM-07**.

## Read Order / Review Mission

Independently verify membership-index validation and secondary discovery:

1. **Build temp index fixtures**: Valid entries, stale entries (each class), mixed entries, missing file.
2. **Validate each stale class independently**: PATH_MISSING, LANE_JSON_MISSING, BINDING_MISMATCH. Verify correct reason codes and diagnostics.
3. **No-repair proof**: Capture index file stat (mtime, size, hash) before each operation. Compare after. Verify zero changes.
4. **Secondary discovery**: Set up a membership index with lanes at different homes. From a participating repo path, verify the correct lanes are returned.
5. **Edge cases**: Index with empty entries array, index with invalid JSON, index at a non-canonical path.
6. **Hard-reject checklist**. **Build and test** independently.

## Acceptance Gate / Rejection / User Rule / Trackers / Local Artifact / Non-Negotiable

(Full sections per RM-01. The index is advisory only; lane.json is always the authority.)

## Required Disk Report

`.local/agent-reports/wt-read-model/reviews/RM-07-membership-index-and-secondary-discovery-review.md`

## If accepted, commit: `RM-07: Membership index and secondary-repository discovery accepted`
