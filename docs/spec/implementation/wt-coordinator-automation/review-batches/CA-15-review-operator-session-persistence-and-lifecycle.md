# Review Batch CA-15 — Operator-Session Persistence and Lifecycle

Status: ❌ Not started
Paired work batch: CA-15
Reviewer owns the acceptance commit.

## Scope Verification

1. **File ownership:** Verify `src/foundation/session-store.ts` and
   `src/foundation/session-lifecycle.ts` are the only new files. No other
   module gained session-creation or lifecycle-management capability.
2. **Dependency direction:** Verify the session store depends on the lane
   filesystem contract and standard types. Verify no dependency from CA-03
   or UK-02 on the session store (session store consumes them, not vice versa).
3. **Spec compliance:** Session identity matches `operator-session.md §7`.
   Lifecycle state machine matches `operator-session.md §6` (open, active-turn,
   suspended, closed, archived, pruned). Journal events match
   `operator-session.md §22`. Filesystem layout matches
   `operator-session.md §20`.
4. **Layer integrity:** No coordinator policy, routing, or model invocation
   in session persistence or lifecycle logic. No session index creation (that
   is CA-16). No session routing or budgets (that is CA-17).
5. **Multi-session proof:** Verify the store supports creating and managing
   multiple independent operator sessions. No artificial one-session-per-lane
   limit.

## Required Independent Proof

- **Session creation:** Independently create a session. Verify
  `operator-session.json` content and `journal.jsonl` opening event.
- **Multiple sessions:** Independently create three sessions. Verify all have
  distinct IDs, independent journals, and independent turn storage.
- **Full lifecycle walkthrough:** Independently walk a session through: create
  (open) → start turn (active-turn) → complete turn (open) → suspend
  (suspended) → resume (open) → close (closed). Verify every transition
  writes the correct journal event.
- **Illegal transitions:** Independently attempt: closed → open, active-turn →
  closed without completing turn, archived → open. Verify every one is rejected
  with `OPERATOR_SESSION_STATE_INVALID`.
- **Concurrent turn:** Start a turn on session A. Independently attempt to
  start another turn on session A from a different process. Verify
  `OPERATOR_SESSION_TURN_ACTIVE`.
- **Immutable closed history:** Close a session. Independently attempt to
  overwrite an existing turn's operator message. Verify the store refuses.
- **Crash-safe journal:** Write 10 journal entries. Kill the process during
  the 8th write. Independently restart and verify the journal is readable up
  to entry 7 (or 8 if atomic write completed). Verify the partial/corrupted
  line is detectable.
- **Fork:** Fork a closed session with explicitly requested pins and turn refs.
  Independently verify the child has a new ID, the parent reference, and only
  the explicitly requested inheritance.
- **Idempotent transitions:** Independently suspend a suspended session, resume
  an open session, close a closed session. Verify no errors and no duplicate
  journal entries.
- **Session listing:** Independently create sessions in different states, with
  different origins and tags. Verify listing with filters returns correct
  subsets and pagination works.
- **Build and test:** Run `nvb build` and `nvb test` independently. Verify
  zero failures.
- **Model-free audit:** grep session store and lifecycle for any model
  invocation. Prove none exist.

## Required Reasoning Posture

The reviewer must independently reason through every state transition and
every concurrency scenario. The reviewer must prove that no sequence of
lifecycle operations can produce an unrecoverable state, lose a turn, or
allow concurrent mutation of session history.

## Structural And Module-Size Acceptance

- `src/foundation/session-store.ts` ≤300 lines (≤350 with warning-band
  justification). Verify physical line count and responsibility inventory.
- `src/foundation/session-lifecycle.ts` ≤200 lines. Verify physical line count.
- Test modules ≤300 lines. Verify split by concern family.

## Required Review Packet

1. Independent session creation and multi-session verification.
2. Full lifecycle walkthrough with journal event audit.
3. Illegal-transition rejection proof (every invalid transition).
4. Concurrent-turn enforcement proof.
5. Closed-history immutability proof.
6. Crash-safe journal partial-write recovery proof.
7. `nvb build` and `nvb test` output.
8. Model-free audit results.

## Acceptance Gate

The batch is accepted only when:
- Multiple sessions per lane are independently addressable.
- Lifecycle state machine matches `operator-session.md §6` exactly.
- Every valid transition writes the correct journal event.
- Every illegal transition is rejected.
- One active turn per session is enforced.
- Closed history is immutable.
- Journal is crash-safe (atomic line write, partial-write recovery).
- Fork creates a correct child with explicit inheritance.
- Idempotent transitions are no-ops.
- `nvb build` and `nvb test` pass independently.
- Zero model invocations in session persistence or lifecycle.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Reject Conditions

Reject immediately if:
- Sessions are artificially limited to one per lane.
- Any turn modification is possible after session closure.
- A lifecycle transition diverges from `operator-session.md §6`.
- Journal appends are not crash-safe (non-atomic writes).
- Two turns can be active for the same session simultaneously.
- The store invokes a model.
- Build or tests fail.
- `.local/` artifacts are staged.
- The implementation agent committed.
