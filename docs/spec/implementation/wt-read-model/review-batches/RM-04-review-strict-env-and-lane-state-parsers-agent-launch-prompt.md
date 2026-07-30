# Agent Launch Prompt — Review Batch RM-04

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for strict-parser and shell-safety review`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: agent must retain complete context and independently reproduce all proof
- final-authority constraint: only this reviewer issues acceptance judgment

You are assigned **review batch RM-04** for the Watchtower v1 wt-read-model
delivery lane.

## Read In This Order

Repository prerequisites: `AGENTS.md`. Then review brief, review README, index,
paired work brief, implementation report, v1.md (§8, §13), v1-contracts.md,
architecture.md (§9.1), quality rules, and all changed source files.

## Your Review Mission

Independently verify the strict parsers:

1. **Malicious-shell corpus**: Independently run every injection fixture. Confirm each is rejected with a line-number diagnostic. Probe additional edge cases: embedded newlines, Unicode escapes, env-var syntax in values, nested quoting tricks. Verify zero commands are executed.
2. **Known-key parsing**: Parse canonical env files with every documented key. Verify exact value reproduction.
3. **Unknown-key handling**: Parse files with extra keys. Verify preserved in diagnostics, not dropped.
4. **Redaction**: Test each of the five key patterns (TOKEN, SECRET, PASSWORD, KEY, CREDENTIAL) in various positions. Verify redacted in output and `redactedKeys` array.
5. **State normalization**: Parse each valid lifecycle state. Test contradictions: complete + active batch, paused + watcher running, unknown input. Verify each yields correct health.
6. **Layer integrity**: Verify no shell evaluation, `exec`, or `source` anywhere.
7. **Hard-reject checklist**. **Build and test** independently.

## Acceptance Gate / Rejection / User Rule / Trackers / Local Artifact / Non-Negotiable

(Full sections per RM-01 review launch prompt.)

## Required Disk Report

`.local/agent-reports/wt-read-model/reviews/RM-04-strict-env-and-lane-state-parsers-review.md`

## If accepted, commit: `RM-04: Strict env and lane-state parsers accepted`
