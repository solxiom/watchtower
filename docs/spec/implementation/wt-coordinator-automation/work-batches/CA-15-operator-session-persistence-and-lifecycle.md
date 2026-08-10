# Batch CA-15 — Operator-session persistence and lifecycle

## Synchronized batch execution matrix

- **Accepted-map title:** Operator-session persistence and lifecycle
- **Dependencies:** `CA-03`, `UK-02`
- **Exclusive ownership/interface:** session store/contracts
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** Many sessions; one active turn each; immutable closed history; crash-safe journals
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-15-operator-session-persistence-and-lifecycle.md`
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-15-operator-session-persistence-and-lifecycle-review.md`
- **Correction report:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-15-operator-session-persistence-and-lifecycle-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ❌ Not started
Pack: wt-coordinator-automation (Pack 5)
Phase: Operator session foundation
Depends on: CA-03, UK-02 accepted
Owned files: `src/foundation/SessionStore.ts`, `src/foundation/SessionLifecycle.ts`

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

2. **Implement `src/foundation/SessionStore.ts`:**
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

3. **Implement `src/foundation/SessionLifecycle.ts`:**
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

- `src/foundation/SessionStore.ts` — owns all operator-session persistence:
  creation, loading, listing, journal append, turn storage, and turn retrieval.
- `src/foundation/SessionLifecycle.ts` — owns the lifecycle state machine:
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
- Do not create session indexes — that is CA-16R.

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

Line count is a design alarm, never permission to accumulate unrelated work.
Count physical lines, including comments and blanks, in new and materially
rewritten hand-maintained files. Generated artifacts are excluded only when
their generator ownership is explicit and they contain no hand-maintained
behavior.

Use the exact project-wide matrix:

| Category | Preferred maximum | Warning band | Hard reject |
| --- | ---: | ---: | ---: |
| CLI command, NVB TaskHandler/front door, registry, renderer, public barrel | 120 | 121–160 | over 180 |
| Orchestrator, controller, coordinator, presenter | 140 | 141–180 | over 200 |
| Foundation service, planner, validator, adapter, store | 200 | 201–260 | over 300 |
| Contract/type-only module | 240 | 241–320 | over 400 |
| Test/spec module | 300 | 301–420 | over 500 |

Functions target 40 lines, warn at 41–60, and reject above 80. Constructors
target 25 lines, warn at 26–40, and reject above 50. Warning-band owners require
a responsibility inventory and explicit reviewer judgment.

Every module has one primary responsibility and one cohesive reason to change.
Commands and TaskHandlers validate, normalize, delegate, and map results.
Orchestrators sequence collaborators without absorbing their algorithms.
Storage, validation, rendering, subprocess/leaf I/O, and state-machine policy do
not accumulate in one owner. Three independently nameable responsibilities
require a split even below a preferred maximum.

Class-owning TypeScript modules use PascalCase filenames; function/value modules
use lowerCamelCase. New source filenames do not use dashes or underscores.
Generic `helpers`, `utils`, `common`, and `misc` overflow bags are rejected.

Any size exception must be approved before implementation and name the exact
file, proposed maximum, cohesion reason, reviewer, and expiry/follow-up batch.
Existing oversized files are not precedent: when touched they become smaller,
split, or remain line-count neutral under an approved extraction plan.

The implementation report records categorized line counts for every new or
materially rewritten file plus warning-band functions/constructors. The
reviewer reproduces those counts and independently judges cohesion. Passing a
line-count check never overrides the responsibility gate.

# Agent Launch Prompt — Work Batch RT-05

## Required Review Packet

1. Implementation report in `.local/agent-reports/coordinator-automation/`.
2. All `nvb build` and `nvb test` output.
3. Targeted test results for every required proof above.
4. Crash-safe journal evidence — partial-write recovery.
5. Full lifecycle state-machine walkthrough evidence.

## Completion And Handoff

- Implementation report, updated tracker/roadmap.
- CA-16R builds the SQLite session index on top of this persistence layer.
- CA-17 will build session routing, budgets, proposals, and holds on top of
  the lifecycle and store.
- Leave the exact session identity schema, lifecycle state machine, and journal
  event types for the next agent.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **session store/contracts**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/CA-15-operator-session-persistence-and-lifecycle.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`CA-03`, `UK-02`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Many sessions; one active turn each; immutable closed history; crash-safe journals**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **session store/contracts** and **Many sessions; one active turn each; immutable closed history; crash-safe journals**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-coordinator-automation/CA-15-operator-session-persistence-and-lifecycle.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
