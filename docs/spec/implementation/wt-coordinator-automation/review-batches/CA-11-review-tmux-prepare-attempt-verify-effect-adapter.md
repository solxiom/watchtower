# Review Batch CA-11 — Tmux prepare/attempt/verify effect handler

## Synchronized batch execution matrix

- **Accepted-map title:** Tmux prepare/attempt/verify effect handler
- **Dependencies:** `RT-05`, `CA-10`
- **Exclusive ownership/interface:** focused TaskHandler and tmux leaf
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** Unknown launch recovery; duplicate suppression; no arbitrary task/kill/shell
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-11-tmux-prepare-attempt-verify-effect-adapter.md`
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-11-tmux-prepare-attempt-verify-effect-adapter-review.md`
- **Correction report:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-11-tmux-prepare-attempt-verify-effect-adapter-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ❌ Not started
Paired work batch: CA-11
Reviewer owns the acceptance commit.

## Scope Verification

1. **File ownership:** Verify `src/foundation/TmuxAdapter.ts` and
   `src/foundation/TmuxEffect.ts` are the only files introduced by this batch.
   No other module gained tmux execution capability.
2. **Dependency direction:** Verify the adapter depends on CA-10's typed
   external-effect interface and RT-05's `LaneTaskRunner`/TaskHandler/leaf
   contracts, not the reverse. No CA-10 or RT-05 internals were modified.
3. **Spec compliance:** Every allowed tmux command is from the closed registry
   defined in `v1-contracts.md §5`. Every forbidden command is blocked.
   Prepare/attempt/verify journaling matches `coordinator-automation.md §12.2`.
4. **Layer integrity:** No coordinator policy, routing, or semantic judgment
   exists in the tmux adapter. No model invocation. No direct filesystem or
   Git access.
5. **Command audit:** Verify the adapter rejects at minimum: `kill-session`,
   `kill-window`, `kill-pane`, `run-shell`, `shell`, `pipe-pane`, `source-file`,
   and any raw `eval` or `if-shell` patterns.
6. **Sanitization audit:** Verify target identifiers reject all shell
   metacharacters: `;`, `|`, `$`, `` ` ``, `\`, `(`, `)`, `{`, `}`, `<`, `>`,
   `&`, `*`, `?`, `~`, `!`, newline, and path-like values containing `/` or `..`.

## Mandatory TaskHandler/Leaf Proof

Independently trace the catalog action through `LaneTaskRunner`, valid CA-10
single-use envelope, focused tmux TaskHandler, and `LeafRuntimeInvoker`.
Prove the handler owns only prepare/attempt/verify mechanics and structured
results, and the leaf accepts only the closed typed tmux operation/argv.
Reject direct tmux/NVB calls, workflow shell, arbitrary task/kill/command/
target/environment/path selection, or authority/journal policy in the handler.

## Required Independent Proof

- **Command coverage:** Independently test every allowed tmux command through
  the full prepare→attempt→verify chain. Prove each succeeds with valid inputs.
- **Forbidden-command block:** For every forbidden command listed above,
  independently prove rejection occurs before `LeafRuntimeInvoker` is invoked.
  Verify zero network or process contributes through the explicit composition rootfor forbidden commands.
- **Sanitization edge cases:** Test every shell metacharacter individually and
  in combination. Test Unicode, null bytes, ANSI escapes, and unusual whitespace.
- **Idempotent duplicate:** Execute a tmux effect, verify it succeeds. Execute
  the same effect with the same idempotency key. Prove the second call returns
  the first call's outcome without re-executing the tmux command.
- **Unknown-launch recovery:** Simulate a crash between attempt and verify.
  Restart. Prove the recovery probe detects the uncertain state and returns
  `TMUX_RECOVERY_UNCERTAIN` without re-executing the original command.
- **Crash before attempt:** Simulate a crash before the attempt phase. Restart.
  Prove the effect is safely re-executed (no recorded outcome for that
  idempotency key).
- **Crash after verify:** Simulate a crash after the verify phase but before
  journal fsync completes. Restart. Prove the idempotency key yields the
  recorded outcome.
- **Build and test:** Run `nvb build` and `nvb test` independently. Record
  exact output. Verify zero failures.
- **Model-free audit:** grep the adapter source for any model or provider
  invocation. Prove none exist.
- **Layer audit:** Verify no imports from CLI, session, watcher, or
  routing modules.

## Required Reasoning Posture

The reviewer must independently reason through every crash point in the
prepare→attempt→verify→journal chain. The reviewer must identify every
character class that could reach `LeafRuntimeInvoker` through the sanitizer
and prove each is rejected. The reviewer must prove that no sequence of
adapter contributes through the explicit composition rootcan produce an arbitrary shell command or arbitrary tmux kill.

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

1. Independent re-execution of every allowed tmux command.
2. Independent re-execution of every forbidden command block.
3. Crash-recovery proof at every journal phase boundary.
4. `nvb build` and `nvb test` output.
5. Model-free and layer-integrity audit results.
6. Sanitization edge-case results for every metacharacter class.

## Acceptance Gate

The batch is accepted only when:
- Every allowed tmux command succeeds through prepare→attempt→verify.
- Every forbidden command is rejected before any runtime invocation.
- All shell metacharacters are rejected in target identifiers.
- Idempotent duplicate suppression returns the prior recorded outcome.
- Unknown-launch recovery probes without re-executing.
- Crash recovery is correct at every phase boundary.
- `nvb build` and `nvb test` pass independently.
- Zero model invocations exist in adapter code.
- Layer dependencies point only to CA-10 and RT-05.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Reject Conditions

Reject immediately if:
- Any forbidden command reaches `LeafRuntimeInvoker` or is not blocked.
- Any shell metacharacter passes sanitization.
- The adapter invokes a model.
- The adapter bypasses CA-10's typed external-effect interface.
- The adapter modifies CA-10 or RT-05 internals.
- Idempotency key is not checked, or a duplicate re-executes.
- Unknown-launch recovery re-executes an ambiguous command.
- Build or tests fail.
- `.local/` artifacts are staged.
- The implementation agent committed.
- Any file exceeds the structural ceiling without documented reviewer acceptance.
- Any error code, command set, or sanitization behavior diverges from spec
  without a recorded specification amendment.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **focused TaskHandler and tmux leaf**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/reviews/CA-11-tmux-prepare-attempt-verify-effect-adapter-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RT-05`, `CA-10`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Unknown launch recovery; duplicate suppression; no arbitrary task/kill/shell**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **focused TaskHandler and tmux leaf** and **Unknown launch recovery; duplicate suppression; no arbitrary task/kill/shell**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-11-tmux-prepare-attempt-verify-effect-adapter-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-coordinator-automation/reviews/CA-11-tmux-prepare-attempt-verify-effect-adapter-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
