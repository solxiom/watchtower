# Batch CA-11 — Tmux prepare/attempt/verify effect handler

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
Pack: wt-coordinator-automation (Pack 5)
Phase: Effect adapters
Depends on: RT-05, CA-10 accepted
Owned files: `src/foundation/effect/TmuxEffect.ts`, `src/foundation/runtime/leaf/TmuxAdapter.ts`

Path amendment (2026-08-07): the original root-level paths were superseded
before handoff by the accepted foundation capability-tree guardrail. The effect
bridge belongs to the existing `effect/` capability and the tmux leaf adapter
belongs to the existing `runtime/leaf/` capability. This preserves exclusive
CA-11 ownership while satisfying FLG-02's prohibition on new foundation-root
files; no CA-10 or RT-05 owner was changed.

**Required implementor reasoning class:** `R4`
**Class rationale:** external effect adapter with prepare/attempt/verify journaling, unknown-launch recovery, duplicate suppression via idempotency key, and strict no-arbitrary-kill/no-shell-escape constraints. The class is a floor; escalate under the pack reasoning rules when source inspection exposes additional risk.

## Objective

Implement the tmux effect adapter that wraps CA-10's effect executor for
tmux-specific effects. Every tmux launch follows prepare (validate
session/window/pane exist), attempt (run the cataloged tmux operation through
the owning TaskHandler and `LeafRuntimeInvoker`), and verify (check pane
content and exit code) phases. Unknown launch
recovery uses the effect journal. Duplicate launches are suppressed through
idempotency keys. Arbitrary kill and shell escape are forbidden.

## Required NVB TaskHandler And Leaf Shape

Implement this capability as one focused packaged tmux effect `TaskHandler`
selected through `LaneTaskRunner` with a valid CA-10 single-use invocation
envelope. The handler owns prepare → attempt → verify mechanics and structured
results; it owns no proposal policy, authority decision, terminal rendering, or
journal truth.

Actual tmux integration is a manifest-declared leaf behind
`LeafRuntimeInvoker`. The handler passes a closed typed operation/argv shape;
the leaf cannot accept arbitrary tasks, tmux commands, kill variants, shell
text, config/module targets, environment maps, or paths. References below to a
generic runtime invocation boundary mean this accepted TaskHandler/leaf
boundary.
Any retained shell is a bounded audited tmux leaf, never workflow orchestration.

## Required Work

1. **Read the normative effect and tmux contracts.** Study `v1-contracts.md §5`
   for the tmux effect types and their permitted parameters. Study
   `v1-contracts.md §12` for external-effect recovery through
   prepare/attempt/verify journals. Study `coordinator-automation.md §12.2–12.3`
   for external-effect handling. Study accepted RT-05 for the central runtime
   `LaneTaskRunner`, TaskHandler, and leaf-invocation contracts.

2. **Implement `src/foundation/runtime/leaf/TmuxAdapter.ts`:**
   - `TmuxAdapter` class — wraps runtime invocation for all tmux operations.
   - `prepare(session: string, window: string, pane: string): PrepareResult` —
     validates that the session, window, and pane identifiers are sanitized
     strings matching the tmux naming grammar. Rejects shell metacharacters,
     wildcards, and path-like values. Validates the target exists through
     `tmux list-panes` output.
   - `attempt(command: TmuxEffectCommand, env: TmuxEnv): AttemptResult` —
     submits one closed tmux operation to the focused packaged TaskHandler
     through `LaneTaskRunner`; only that handler may reach
     `LeafRuntimeInvoker` (RT-05). The leaf uses argv-only invocation with no
     intermediary shell. Supports the closed command set: `new-session`,
     `new-window`, `send-keys`, `capture-pane`, `list-panes`, `list-windows`,
     `list-sessions`, and `has-session`. Returns the raw result plus exit
     code.
   - `verify(result: AttemptResult, expected: TmuxPostcondition): VerifyResult` —
     checks pane content (via `capture-pane`), exit code, and session/window
     liveness against expected postconditions. Distinguishes between verified
     success, verified failure, and uncertain outcome.
   - `TmuxEffectCommand` type — a typed command descriptor with command name, argv
     list, and expected sanitized targets. Never a raw shell string.
   - `TmuxEnv` type — the `WT_*` allowlist subset admitted by the RT-05
     task/leaf boundary.
   - `PrepareResult` type: `{ok, sessionExists, windowExists, paneExists,
     rejectReason?}`.
   - `AttemptResult` type: `{ok, command, exitCode, stdout, stderr,
     wallTimeMs}`.
   - `VerifyResult` type: `{ok, verified, actualExitCode, actualPaneContent,
     postconditionResults: PostconditionCheck[]}`.

3. **Implement `src/foundation/effect/TmuxEffect.ts`:**
   - `TmuxEffectExecutor` class — bridges CA-10's executor to tmux-specific
     effects.
   - `executeTmuxEffect(boundedEffect: BoundedEffect, plan: EffectPlan):
     TmuxEffectOutcome` — the single entry point for tmux effects within the
     CA-10 pipeline. Calls prepare → attempt → verify in sequence, records
     each phase in the effect journal through CA-10's journal interface.
   - **Unknown-launch recovery:** If a prior attempt's postcondition is
     uncertain (process terminated mid-command, session disappeared, exit
     code ambiguous), the adapter checks the effect journal for the
     idempotency key. If the prior attempt recorded an `effect-verified`
     outcome, return that outcome. If the prior attempt's outcome is
     `effect-uncertain`, the adapter performs a safe recovery probe:
     check session/window/pane existence, capture current pane content,
     and determine whether the command effect took hold. If recovery is
     still uncertain, record `effect-uncertain` again and escalate; never
     re-execute an ambiguous external command.
   - **Duplicate suppression:** Every tmux effect carries the plan's
     idempotency key. Before `attempt`, the adapter checks the effect
     journal for a prior completed attempt with the same key. If found,
     return the recorded outcome without re-executing.
   - **Forbidden operations:** The adapter must reject any request involving:
     arbitrary `shell` command execution, `kill-session`/`kill-window`/
     `kill-pane`, `run-shell`, `pipe-pane` to external processes, `source-file`,
     or any command that escapes the tmux execution boundary. Rejection is
     instantaneous (does not invoke `LeafRuntimeInvoker`) and produces
     `COORDINATOR_EFFECT_CONFLICT` with a descriptive reason.
   - `TmuxEffectOutcome` type: `{success, outcomeId, phases:
     {prepare, attempt, verify}, idempotencyKey, recoveryAttempted?,
     escalated?}`.

4. **Integration with CA-10:**
   - CA-10's executor detects effect type `tmux-launch` and delegates to
     `TmuxEffectExecutor` through a typed interface — not by inspecting
     plan internals.
   - The phase journaling (prepare-written, attempt-started,
     attempt-completed, verify-completed) uses CA-10's effect journal
     format with `effect-type: tmux-launch`.
   - Idempotency keys are shared — the CA-10 executor and tmux adapter
     use the same key for the same plan execution.

5. **Error taxonomy:**
   - `TMUX_INVALID_TARGET` — session/window/pane identifier contains illegal
     characters or fails validation.
   - `TMUX_TARGET_NOT_FOUND` — validated target does not exist.
   - `TMUX_COMMAND_FORBIDDEN` — requested command is not in the allowed set.
   - `TMUX_COMMAND_FAILED` — allowed command returned non-zero exit code.
   - `TMUX_VERIFY_FAILED` — postcondition check failed while command appeared
     to succeed.
   - `TMUX_VERIFY_UNCERTAIN` — postcondition cannot be determined.
   - `TMUX_DUPLICATE_SUPPRESSED` — idempotency key matched a prior completed
     tmux effect.
   - `TMUX_RECOVERY_UNCERTAIN` — recovery probe could not determine prior
     attempt outcome.

## Expected Ownership

- `src/foundation/runtime/leaf/TmuxAdapter.ts` — owns the typed tmux capability used by the
  focused packaged handler. Only that handler reaches `LeafRuntimeInvoker`; no
  other module executes tmux commands.
- `src/foundation/effect/TmuxEffect.ts` — owns the prepare/attempt/verify pipeline,
  unknown-launch recovery, duplicate suppression, and CA-10 integration.
- No other module may launch tmux sessions/windows/panes or capture tmux
  output for coordinator effects.

## Tests And Evidence

- **Valid prepare:** Validate a known session/window/pane. Prove `ok: true`.
- **Invalid target:** Pass a target containing `;`, `|`, `$`, `/`, `..`, or
  wildcards. Prove `TMUX_INVALID_TARGET`.
- **Missing target:** Validate a non-existent session. Prove
  `TMUX_TARGET_NOT_FOUND`.
- **Forbidden command:** Request `kill-session`, `run-shell`, `shell`,
  `source-file`, or `pipe-pane`. Prove `TMUX_COMMAND_FORBIDDEN` without
  runtime invocation.
- **Successful attempt→verify:** Launch a tmux command. Verify the
  postcondition. Prove the complete prepare→attempt→verify chain.
- **Failed command:** Execute an allowed command that returns non-zero. Prove
  `TMUX_COMMAND_FAILED`.
- **Uncertain verify:** Simulate a command that succeeds but where the pane
  content does not match the expected postcondition. Prove `TMUX_VERIFY_UNCERTAIN`.
- **Idempotent duplicate:** Execute the same tmux effect twice. Prove the
  second call returns `TMUX_DUPLICATE_SUPPRESSED` with the first call's outcome.
- **Unknown-launch recovery:** Simulate a crash between attempt and verify.
  On restart, prove the recovery probe detects the uncertain state and
  returns `TMUX_RECOVERY_UNCERTAIN` without re-executing.
- **No shell escape:** For every forbidden command pattern, prove the adapter
  rejects before `LeafRuntimeInvoker` is invoked.
- **Model-free proof:** No model invocation in the tmux adapter.

## What Must Not Change

- Do not expand the allowed tmux command set.
- Do not create a direct tmux invocation path outside the adapter.
- Do not modify CA-10's executor or RT-05's task/leaf boundaries.
- Do not permit arbitrary kill or shell escape.

## Review Procedure Highlights

1. Independently test every tmux command in the allowed set.
2. Prove every forbidden command is rejected before invocation.
3. Prove duplicate suppression through idempotency key replay.
4. Simulate crash between attempt and verify — prove recovery behavior.
5. Verify no shell metacharacter reaches `LeafRuntimeInvoker`.

---

## Required Reasoning Posture

The adapter is a high-trust boundary: it is the ONLY component that executes
tmux commands for coordinator effects. A missed rejection of a forbidden
command, a shell-injection gap in target sanitization, or incorrect
crash-recovery idempotency could result in uncontrolled tmux session state or
shell escape. The implementor must reason about every character class reaching
the typed TaskHandler/leaf boundary and every crash point in the
prepare→attempt→verify chain.

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
4. Verification that no forbidden command reaches `LeafRuntimeInvoker`.
5. Crash-recovery and idempotency replay evidence.

## Completion And Handoff

- Implementation report, updated tracker/roadmap.
- CA-10's typed interface for external effects confirmed compatible.
- CA-12 may begin in parallel (separate adapter, shared CA-10 boundary).
- Leave the exact allowed command list, sanitization grammar, and error
  taxonomy for the next agent.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **focused TaskHandler and tmux leaf**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/CA-11-tmux-prepare-attempt-verify-effect-adapter.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RT-05`, `CA-10`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Unknown launch recovery; duplicate suppression; no arbitrary task/kill/shell**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **focused TaskHandler and tmux leaf** and **Unknown launch recovery; duplicate suppression; no arbitrary task/kill/shell**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-coordinator-automation/CA-11-tmux-prepare-attempt-verify-effect-adapter.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
