# Agent Launch Prompt — Work Batch RM-09

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R3`
- agent suitability: `high for bounded observation work`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R3`
- agent suitability: `high for bounded observation work`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. For `R3`, require reliable bounded
repository reasoning; a fast low-reasoning model is still unsuitable for final
acceptance. Select a currently available agent.

You are assigned **implementation work batch RM-09** for the Watchtower v1
wt-read-model delivery lane.

This batch implements tmux session reading, heartbeat detection, and worker
observations — presence reading only, never lifecycle authority.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-read-model/work-batches/RM-09-tmux-watcher-heartbeat-and-worker-observations.md`
2. `docs/spec/implementation/wt-read-model/work-batches/README.md`
3. `docs/spec/implementation/wt-read-model/work-batches/00-work-batch-index.md`
4. `docs/spec/v1.md` (especially §11.3 wt status, §13 — State and event compatibility)
5. `docs/spec/v1-contracts.md`
6. `docs/spec/architecture.md`
7. `docs/spec/implementation/wt-read-model/implementation-roadmap.md`
8. `docs/spec/implementation/wt-read-model/implementation-tracker.md`
9. `docs/spec/implementation/wt-read-model/implementation-quality-and-agent-rules.md`
10. the canonical source owners:
    - `src/foundation/observations.ts` (create)
    - `src/foundation/heartbeat.ts` (create)
    - `src/foundation/jsonl-parser.ts` (from RM-05)

## Reasoning / Agent Class — R3 with full forwarding profile as above.

## Mandatory Reasoning Protocol

1. Enumerate every observation type and its bounded authority.
2. Inspect the accepted RM-04 and RM-05 output.
3. Prove that no observation writes state or advances cursors.
4. Use counterexamples: a stale heartbeat must not be treated as "watcher
   dead" — it's a presence observation, not a lifecycle judgment.

## Structural Design And Module-Size Gate

Per quality rules. No `helpers`/`utils` bags.

## Your Mission

1. Create `src/foundation/observations.ts`:
   - `readTmuxSessions(): string[]` — execute `tmux list-sessions -F '#{session_name}'` (or accept an injected executor for testing). Return list of session names.
   - `findTmuxSession(sessions: string[], prefix: string): string | null` — find a tmux session by prefix match. Return qualified name or null.
   - `readWorkerPresence(laneDir: string, parser: JsonlParser): WorkerPresence` — read the latest valid worker event per role (implementer, reviewer) from the parsed JSONL stream. Return the latest event per role or null.

2. Create `src/foundation/heartbeat.ts`:
   - `readHeartbeat(laneDir: string): HeartbeatState` — read the heartbeat file from the lane's state directory. Return `{ timestamp: Date, state: 'fresh' | 'stale' | 'absent' }` based on a configurable threshold (default: 300 seconds).
   - `isHeartbeatStale(timestamp: Date, thresholdSeconds: number): boolean` — compare heartbeat timestamp against current time minus threshold.

3. Write focused Jasmine specs:
   - Tmux session reading: mock `tmux` binary returns session list; parsed correctly.
   - Tmux session matching: prefix match finds correct session; no match returns null.
   - Heartbeat: fresh timestamp → `fresh`; old timestamp → `stale`; no file → `absent`.
   - Heartbeat threshold: default 300s; configurable via parameter.
   - Worker presence: latest implementer event, latest reviewer event from parsed stream.
   - No-mutation proof: after every observation function, verify the state directory has zero new files, zero modified files, zero cursor advances.

## What You Must Not Do

- Do not write heartbeat files, tmux state, or worker events.
- Do not create or kill tmux sessions.
- Do not advance the watcher cursor.
- Do not infer lifecycle status from presence observations.
- Do not commit.

## Required Proof

- Tmux session reading and matching.
- Heartbeat classification: fresh, stale, absent.
- Worker presence from parsed events.
- No-mutation proof.
- `nvb build` and `nvb test` pass.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep `implementation-tracker.md` and `implementation-roadmap.md` updated.

## Local Artifact Git Rule

Write `.local/...` reports on disk only; never stage or commit.

## Non-Negotiable Rules

- observations are presence readings only; no lifecycle authority
- no state files written, no cursors advanced
- heartbeat staleness is a configurable threshold, not a fixed value
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write to: `.local/agent-reports/wt-read-model/RM-09-tmux-watcher-heartbeat-and-worker-observations.md`

## Always plan and make task lists

## Leave a helpful handoff message for the next agent

Record the observation API (`readTmuxSessions`, `findTmuxSession`,
`readWorkerPresence`), heartbeat API (`readHeartbeat`, `isHeartbeatStale`),
and the no-mutation contract. RM-10 consumes observations for status display.
No observation output implies lifecycle authority.
