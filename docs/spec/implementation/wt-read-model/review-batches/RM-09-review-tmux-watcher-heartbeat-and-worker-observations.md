# Review Batch RM-09 — Tmux, watcher, heartbeat, and worker observations

## Synchronized batch execution matrix

- **Accepted-map title:** Tmux, watcher, heartbeat, and worker observations
- **Dependencies:** `RM-04`, `RM-05`
- **Exclusive ownership/interface:** observation foundation
- **Implementer/reviewer floor:** R3 / R3
- **Mandatory batch proof:** Qualified names; stale heartbeat; presence never treated as lifecycle authority
- **Implementation report:** `.local/agent-reports/wt-read-model/RM-09-tmux-watcher-heartbeat-and-worker-observations.md`
- **Review report:** `.local/agent-reports/wt-read-model/reviews/RM-09-tmux-watcher-heartbeat-and-worker-observations-review.md`
- **Correction report:** `.local/agent-reports/wt-read-model/reviews/corrections/RM-09-tmux-watcher-heartbeat-and-worker-observations-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ⏳ Awaiting review
Reasoning: `R3`
Paired work brief: `work-batches/RM-09-tmux-watcher-heartbeat-and-worker-observations.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-09-tmux-watcher-heartbeat-and-worker-observations.md`

## Scope Verification

- [ ] `src/foundation/runtimeObservations.ts` with tmux, watcher, and worker qualified-name reading
- [ ] `src/foundation/NirvanaTmuxObserver.ts` is the sole read-only tmux
      execution owner and uses the pinned Nirvana command facade
- [ ] `src/foundation/heartbeatObservation.ts` with heartbeat staleness detection

## Required Independent Proof

1. **Tmux session reading**: Verify qualified tmux session names are read
   through the injected Nirvana command port using fixed argv
   `tmux list-sessions -F '#{session_name}'`. Assert cwd, environment,
   timeout, and output bounds; prove no shell/direct child-process path. Verify
   zero, one, and multiple sessions.
2. **Qualified-name identity**: Verify only a fully constructed exact session
   name matches. Prefix-only, adjacent-lane, case-variant, and
   Unicode-confusable names must not match.
3. **Heartbeat — fresh**: Create a heartbeat file with a timestamp within the configured threshold. Verify classification is `fresh`.
4. **Heartbeat — stale**: Create a heartbeat file with a timestamp exceeding the configured threshold. Verify classification is `stale` and the staleness reason includes the last heartbeat time.
5. **Heartbeat — absent**: Verify that when no heartbeat file exists, classification is `absent`.
6. **Heartbeat — configurable threshold**: Verify the staleness threshold is configurable. Test with a short threshold (e.g., 5 seconds) and a long threshold (e.g., 300 seconds) and confirm classification changes accordingly.
7. **Worker-event reading**: From a parsed JSONL stream (consuming the RM-05 parser), verify the latest valid worker event per role (implementer, reviewer) is surfaced correctly.
8. **No-mutation proof**: After running every observation function, verify that no state files are written, no event cursors are advanced, and no heartbeat files are created or modified. Compute a directory hash before and after all observations.
9. **Presence not authority**: Verify that no observation function infers lifecycle status, worker health, or automation decisions from presence data. Observations expose raw facts only.
10. Run `nvb build` and `nvb test` independently.

## Required Reasoning Posture

The reviewer must reason from the governing specifications and current source,
not from the implementation report alone. Inspect every observation function
independently. Verify the Nirvana command port is injectable for tests. Confirm
no state mutation occurs during any observation. Verify heartbeat classification
is based solely on timestamps and the configured threshold.

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

The review report must include: independently rerun proof commands and outcomes,
structural verification results, line-count verification, no-mutation proof
(before/after directory hash), tracker/roadmap sync status, and the acceptance
or rejection decision.

## Acceptance Gate

- Tmux session reading returns correct qualified session names.
- Heartbeat classification correctly handles fresh, stale, and absent states.
- Heartbeat staleness threshold is configurable.
- Worker-event reading consumes the RM-05 parser correctly.
- No state files written, cursors advanced, or heartbeat files modified during
  any observation.
- No observation function implies lifecycle authority.
- Build and tests pass independently.

## Reject Conditions

- Any observation function writes state or advances cursors.
- Heartbeat classification is hardcoded rather than configurable.
- Observation function infers lifecycle status from presence data.
- Tmux binary dependency is not mockable for tests.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **observation foundation**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-read-model/reviews/RM-09-tmux-watcher-heartbeat-and-worker-observations-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-04`, `RM-05`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Qualified names; stale heartbeat; presence never treated as lifecycle authority**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **observation foundation** and **Qualified names; stale heartbeat; presence never treated as lifecycle authority**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-read-model/reviews/corrections/RM-09-tmux-watcher-heartbeat-and-worker-observations-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-read-model/reviews/RM-09-tmux-watcher-heartbeat-and-worker-observations-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
