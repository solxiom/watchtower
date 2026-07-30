# Agent Launch Prompt — Work Batch RM-07

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for membership validation and staleness detection`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent.

You are assigned **implementation work batch RM-07** for the Watchtower v1
wt-read-model delivery lane.

This batch implements advisory membership-index validation and secondary-
repository lane discovery. Stale entries are ignored and reported; reads never
repair the index.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-read-model/work-batches/RM-07-membership-index-and-secondary-discovery.md`
2. `docs/spec/implementation/wt-read-model/work-batches/README.md`
3. `docs/spec/implementation/wt-read-model/work-batches/00-work-batch-index.md`
4. `docs/spec/v1.md` (especially §7.1 — repository-memberships.json, §9.2 — Lane discovery from secondary repository)
5. `docs/spec/v1-contracts.md`
6. `docs/spec/architecture.md`
7. `docs/spec/implementation/wt-read-model/implementation-roadmap.md`
8. `docs/spec/implementation/wt-read-model/implementation-tracker.md`
9. `docs/spec/implementation/wt-read-model/implementation-quality-and-agent-rules.md`
10. the canonical source owners:
    - `src/foundation/membership.ts` (create)
    - `src/foundation/secondary-discovery.ts` (create)
    - `src/foundation/paths.ts` (from RM-03)
    - `src/foundation/discovery.ts` (from RM-06)

## Reasoning / Agent Class — R4 with full forwarding profile as above.

## Mandatory Reasoning Protocol

1. Enumerate every staleness class before writing code.
2. Inspect the accepted RM-03 and RM-06 output.
3. Prove that every stale entry is reported but not repaired.
4. Use counterexamples: stale index with one valid and one stale entry — the
   valid entry should still work.

## Structural Design And Module-Size Gate

Per quality rules. No `helpers`/`utils` bags.

## Your Mission

1. Create `src/foundation/membership.ts`:
   - `loadMembershipIndex(dataHome: string): MembershipIndex | null` — load and parse the membership index file. Return `null` if the file does not exist.
   - `validateMembershipEntry(entry: MembershipEntry): MembershipValidationResult` — validate a single entry: canonicalize the worktree path, verify the path exists, load and validate the referenced `lane.json` from the lane home, verify the lane.json contains a binding matching the entry's path. Return valid or stale with reason.
   - `validateMembershipIndex(index: MembershipIndex): MembershipValidationReport` — validate all entries in the index. Return valid entries, stale entries (with reasons), and total warnings.
   - Stale reason codes: `PATH_MISSING`, `LANE_JSON_MISSING`, `BINDING_MISMATCH`.

2. Create `src/foundation/secondary-discovery.ts`:
   - `discoverSecondaryLanes(dataHome: string, worktreePath: string, discovery: DiscoveryService): SecondaryDiscoveryResult` — find lanes from a participating secondary repository. Load the membership index, filter entries matching the canonical worktree path, validate each candidate, and return discovered lanes. Stale entries are returned as warnings.
   - `resolveLanesFromMembership(dataHome: string, worktreePath: string, discovery: DiscoveryService): ResolvedLane[]` — same as above but returns only valid resolved lanes.

3. Write focused Jasmine specs:
   - Valid index: all entries resolve to valid lane.json.
   - Stale — path removed: entry path no longer exists → stale warning, `PATH_MISSING`.
   - Stale — lane.json missing: referenced lane home has no lane.json → stale warning, `LANE_JSON_MISSING`.
   - Stale — binding mismatch: lane.json exists but no binding matches the entry path → stale warning, `BINDING_MISMATCH`.
   - Missing index file: returns `null`/empty, no error.
   - Mixed index: one valid + one stale → valid returned, stale warned.
   - No-repair proof: after reading the index, the file modification time and content remain unchanged.
   - Secondary discovery: from a participating repo path, resolves lanes through validated index.

## What You Must Not Do

- Do not write to the membership index file.
- Do not remove, update, or repair stale entries.
- Do not treat the index as lane authority; every candidate must resolve to
  valid lane.json.
- Do not commit.

## Required Proof

- Valid index validation.
- Stale entry detection for all three classes.
- Missing index handling.
- No-repair proof.
- `nvb build` and `nvb test` pass.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep `implementation-tracker.md` and `implementation-roadmap.md` updated.

## Local Artifact Git Rule

Write `.local/...` reports on disk only; never stage or commit.

## Non-Negotiable Rules

- the index is advisory: lane.json is always the authority
- stale entries must be reported, never silently repaired or deleted
- reads must never modify the index file
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write to: `.local/agent-reports/wt-read-model/RM-07-membership-index-and-secondary-discovery.md`

## Always plan and make task lists

## Leave a helpful handoff message for the next agent

Record the membership API, staleness reason codes, and secondary-discovery
API. RM-08 consumes membership for conflict inspection. RM-10 consumes
secondary discovery for multi-repository status. No consumer may repair
stale index entries silently.
