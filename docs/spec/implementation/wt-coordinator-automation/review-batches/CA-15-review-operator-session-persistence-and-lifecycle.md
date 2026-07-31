# Review Batch CA-15 — Operator-session persistence and lifecycle

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
Paired work batch: CA-15
Reviewer owns the acceptance commit.

## Scope Verification

1. **File ownership:** Verify `src/foundation/SessionStore.ts` and
   `src/foundation/SessionLifecycle.ts` are the only new files. No other
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

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **session store/contracts**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/reviews/CA-15-operator-session-persistence-and-lifecycle-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`CA-03`, `UK-02`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Many sessions; one active turn each; immutable closed history; crash-safe journals**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **session store/contracts** and **Many sessions; one active turn each; immutable closed history; crash-safe journals**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-15-operator-session-persistence-and-lifecycle-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-coordinator-automation/reviews/CA-15-operator-session-persistence-and-lifecycle-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
