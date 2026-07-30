# Agent Launch Prompt — Review Batch RM-06

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R5`
- agent suitability: `highest available`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R5`
- agent suitability: `highest available for complete-ambiguity-matrix review`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: agent must retain complete context and exhaustively verify every matrix cell
- final-authority constraint: only this reviewer issues acceptance judgment

You are assigned **review batch RM-06** for the Watchtower v1 wt-read-model
delivery lane. This is the highest-stakes review: any missing cell in the
ambiguity matrix produces silent wrong behavior.

## Read In This Order

Repository prerequisites: `AGENTS.md`. Then review brief, review README, index,
paired work brief, implementation report, v1.md (§9), v1-contracts.md,
architecture.md, quality rules, accepted RM-03/RM-04 source, and all changed files.

## Your Review Mission

Independently verify the complete discovery and selection matrix:

1. **Draw the matrix**: Construct a truth table with rows for every combination
   of: discovered lanes count (0, 1, 2+), lane.json validity (valid, missing
   required field, missing schemaVersion), UUID match (matched, no match),
   slug match (matched, no match), cwd context (inside lane, not inside).
   Columns: expected result. Verify every row is covered by a test.
2. **Independently run discovery**: Build temp workspaces with varying layouts.
   Walk from cwd, from lane dir, from descendant, from above. Verify every
   discovery function returns correct lanes.
3. **Independently run selection**: For every precedence level, set up the
   right fixture and assert correct selection. Test each rule in isolation
   before testing combinations.
4. **Test the boundary**: What happens if `.watchtower/lanes/` exists but is
   empty? Contains only directories without `lane.json`? Contains a directory
   with a completely different structure? Verify all edge cases.
5. **Symlink walk**: Create a symlinked parent directory in the ancestor chain.
   Verify the walk resolves symlinks and finds the correct lanes.
6. **Candidate listing**: Test ambiguity output. Verify it includes laneId,
   slug, initiativeId, kind, and controlHome for every candidate.
7. **Hard-reject checklist**. **Build and test** independently.

## Acceptance Gate / Rejection / User Rule / Trackers / Local Artifact / Non-Negotiable

(Full sections per RM-01 review launch prompt.)

## Required Disk Report

`.local/agent-reports/wt-read-model/reviews/RM-06-home-lane-discovery-and-selection-review.md`

## If accepted, commit: `RM-06: Home-lane discovery and deterministic selection accepted`

## Always plan and make task lists
