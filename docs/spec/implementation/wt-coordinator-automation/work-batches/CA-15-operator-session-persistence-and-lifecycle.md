# Batch CA-15 — Operator-Session Persistence and Lifecycle

Status: ❌ Not started
Pack: wt-coordinator-automation (Pack 5)
Phase: Operator session foundation
Depends on: CA-03, UK-02 accepted
Owned files: `src/foundation/session-store.ts`, `src/foundation/session-lifecycle.ts`

**Required implementor reasoning class:** `R4`
**Class rationale:** durable operator-session persistence with many sessions per lane, immutable closed history, crash-safe journal append, and the full lifecycle state machine (open → active-turn → suspended → closed → archived → pruned). The class is a floor; escalate under the pack reasoning rules when source inspection exposes additional risk.

## Objective

Implement operator-session persistence and the complete lifecycle state machine.
A lane supports many operator sessions (not limited to one). Each session has
at most one active turn. Closed history is immutable — turns are appended, never
mutated. Journal appends are crash-safe (atomic line write). Session identity
is a durable JSON record.

## Required Work

1. **Read the normative operator-session contract.** Study
   `operator-session.md` §6 for the lifecycle state machine. Study
   `operator-session.md` §7 for session identity. Study `operator-session.md`
   §8 for turn processing. Study `operator-session.md` §20 for the filesystem
   contract. Study `v1-contracts.md` §9 for operator-session types and
   durability guarantees. Study accepted UK-02 for session/index migration
   compatibility.

2. **Implement `src/foundation/session-store.ts`:**
   - `SessionStore` class — manages operator-session persistence on disk.
   - **Session identity (durable JSON):**
     - `createSession(params: CreateSessionParams): OperatorSession` — creates
       a new operator session with a unique `operatorSessionId`, writes
       `operator-session.json` to `<lane>/coordinator/operator-sessions/<id>/`,
       and appends an `operator-session-opened` event to the session journal.
     - `OperatorSession` type matching `operator-session.md §7`: schemaVersion,
       operatorSessionId, laneId, origin (operator | system-escalation),
       policyProfileId, tags, state, topic, createdAt, lastTurnAt, turnCount,
       parentOperatorSessionId, retentionPolicy, budgetSegmentId, pinnedRefs.
     - `loadSession(sessionId: string): OperatorSession` — loads the session
       identity from disk. Raises `OPERATOR_SESSION_NOT_FOUND` if missing.
     - `listSessions(filters: SessionFilters): OperatorSession[]` — lists
       sessions filtered by state, origin, policyProfile, tags, topic,
       time range, holds, and unapplied proposals. Supports bounded limit
       and opaque cursor for pagination.
   - **Session journal:**
     - `appendJournalEntry(sessionId: string, entry: SessionJournalEntry): void` —
       appends one JSON line to `<session>/journal.jsonl` using atomic line
       write (write full line + newline in a single `write` call). This is
       crash-safe: a partial write leaves a truncated last line, never corrupts
       prior entries.
     - `readJournal(sessionId: string, since?: string): SessionJournalEntry[]` —
       reads journal entries from the given cursor (turnId or eventId).
     - `SessionJournalEntry` type — a union of all operator-session event
       types defined in `operator-session.md §22`.
   - **Turn storage:**
     - `appendTurn(sessionId: string, turn: TurnRecord): void` — writes turn
       files to `<session>/turns/<turn-id>/`: `operator.md` (operator message),
       `response.json` (structured response), `coordinator.md` (advisory answer),
       `snapshot.json` (snapshot metadata), `usage.json` (usage telemetry).
       Appends `operator-session-operator-message` and
       `operator-session-response-complete` journal entries.
     - `readTurn(sessionId: string, turnId: string): TurnRecord` — loads a
       complete turn record.
     - `listTurns(sessionId: string, filters: TurnFilters): TurnRecord[]` —
       lists turns with bounded limit and cursor pagination.
     - `TurnRecord` type matching `operator-session.md §8.3`: turnId,
       operatorSessionId, turn number, state, operatorMessage, resolvedRefs,
       unresolvedRefs, snapshot, decisionClass, routingRuleId, endpointId,
       response, usage, stale, completedAt.
   - **Immutable closed history:** Once a session enters `closed` state, the
     store refuses any modification to existing turns. Turn files are never
     opened for write after closure. The journal may still receive
     `operator-session-archived` or `operator-session-pruned` events.

3. **Implement `src/foundation/session-lifecycle.ts`:**
   - `SessionLifecycle` class — manages the full lifecycle state machine.
   - `transition(session: OperatorSession, target: SessionState, reason: string):
     OperatorSession` — validates and executes a state transition.
   - **Lifecycle states and valid transitions:**
     - `open` ↔ `active-turn` (when a turn starts / completes)
     - `open` ↔ `suspended` (explicit suspend / resume)
     - `open` → `closed` (terminal close)
     - `closed` → (no further transitions; requires fork for continuation)
     - `closed` → `archived` (policy-driven, schema reserved for v1+)
     - `archived` → `pruned` (explicit or policy-scheduled)
     - Any non-pruned → new `open` child session (fork)
   - `validateTransition(from: SessionState, to: SessionState): ValidationResult`
     — validates the transition is legal. Returns `OPERATOR_SESSION_STATE_INVALID`
     for illegal transitions.
   - `forkSession(parent: OperatorSession, params: ForkSessionParams):
     OperatorSession` — creates a new child session referencing the parent,
     with explicit inherited pins and turn refs.
   - **Concurrency:** One session has at most one active turn. The lifecycle
     manager enforces this: `validateTurnStart` fails with
     `OPERATOR_SESSION_TURN_ACTIVE` if another turn is running.
   - **Idempotent transitions:** Repeated `suspend` on an already-suspended
     session is a no-op (idempotent). Repeated `resume` on an open session
     is a no-op.
   - `getNextValidTransitions(state: SessionState): SessionState[]` — returns
     the allowed target states.

4. **Filesystem layout (per `operator-session.md §20`):**
   ```
   coordinator/operator-sessions/<id>/
     operator-session.json          # session identity
     journal.jsonl                  # append-only event journal
     turns/<turn-id>/
       operator.md                  # operator message
       response.json                # structured advisory response
       coordinator.md               # coordinator answer prose
       snapshot.json                # turn snapshot metadata
       usage.json                   # usage telemetry
     compactions/                   # derived continuity artifacts
     proposals/                     # unapplied session proposals
   ```

5. **Error taxonomy:**
   - `OPERATOR_SESSION_NOT_FOUND` — session ID unknown in lane.
   - `OPERATOR_SESSION_STATE_INVALID` — illegal lifecycle transition.
   - `OPERATOR_SESSION_TURN_ACTIVE` — another turn already runs.
   - `OPERATOR_SESSION_JOURNAL_WRITE_FAILED` — unable to append to journal.
   - `OPERATOR_SESSION_TURN_WRITE_FAILED` — unable to write turn files.

## Expected Ownership

- `src/foundation/session-store.ts` — owns all operator-session persistence:
  creation, loading, listing, journal append, turn storage, and turn retrieval.
- `src/foundation/session-lifecycle.ts` — owns the lifecycle state machine:
  transition validation, execution, fork creation, and concurrency enforcement.
- No other module may create operator sessions, append to session journals,
  or change session lifecycle state.

## Tests And Evidence

- **Session creation:** Create a session. Verify `operator-session.json` is
  written with correct fields. Verify `journal.jsonl` contains the
  `operator-session-opened` event.
- **Multiple sessions per lane:** Create three sessions. Prove all three exist
  and are independently addressable. Prove each has its own journal.
- **Lifecycle state machine:** Walk a session through: create (open) →
  active-turn → open → suspended → resumed (open) → closed. Prove every
  transition produces the correct journal event.
- **Illegal transitions:** Attempt: closed → open (fail), active-turn → closed
  with turn running (fail), suspended → closed (should work). Prove correct
  rejections and acceptances.
- **One active turn:** Start a turn on session A. Attempt to start another
  turn on session A. Prove `OPERATOR_SESSION_TURN_ACTIVE`.
- **Immutable closed history:** Close a session. Attempt to modify an existing
  turn. Prove the store refuses.
- **Crash-safe journal:** Write a journal entry. Kill the process mid-write.
  On restart, verify the journal is readable up to the last complete line.
  Verify the partial line is detectable and recoverable.
- **Fork:** Fork a closed session. Verify the child has a new ID, references
  the parent, and inherits only explicitly requested pins/refs.
- **Idempotent transitions:** Suspend an already-suspended session. Prove
  no-op (no error, no duplicate journal event).
- **Model-free proof:** No model invocation in session-store or
  session-lifecycle.

## What Must Not Change

- Do not limit sessions to one per lane.
- Do not modify existing turns after a session is closed.
- Do not modify UK-02 migration registry.
- Do not create session indexes — that is CA-16.

## Review Procedure Highlights

1. Independently create multiple sessions and verify isolation.
2. Walk the full lifecycle state machine — prove every valid and invalid
   transition.
3. Prove crash-safe journal append — partial writes are recoverable.
4. Prove closed history is immutable.
5. Prove fork creates a correct child with explicit inheritance.

---

## Required Reasoning Posture

The session store is the durable operator-interaction boundary. A lifecycle
transition bug could leave sessions in unrecoverable states, lose operator
messages, or allow concurrent turns to corrupt session history. The implementor
must reason about every state transition, every crash point in journal append,
and every concurrency scenario.

## Structural And Module-Size Acceptance

- `src/foundation/session-store.ts` target ≤300 lines (creation, loading,
  listing, journal, turns). Responsibility inventory at 221+; warning-band
  justification at 301–350. Splitting into `session-journal.ts` and
  `session-turns.ts` is expected as the store grows.
- `src/foundation/session-lifecycle.ts` target ≤200 lines (state machine,
  validation, fork). Responsibility inventory at 161+.
- Test modules ≤300 lines; split by creation, lifecycle, journal, turns,
  concurrency, and fork families.

## Required Review Packet

1. Implementation report in `.local/agent-reports/coordinator-automation/`.
2. All `nvb build` and `nvb test` output.
3. Targeted test results for every required proof above.
4. Crash-safe journal evidence — partial-write recovery.
5. Full lifecycle state-machine walkthrough evidence.

## Completion And Handoff

- Implementation report, updated tracker/roadmap.
- CA-16 will build the SQLite session index on top of this persistence layer.
- CA-17 will build session routing, budgets, proposals, and holds on top of
  the lifecycle and store.
- Leave the exact session identity schema, lifecycle state machine, and journal
  event types for the next agent.
