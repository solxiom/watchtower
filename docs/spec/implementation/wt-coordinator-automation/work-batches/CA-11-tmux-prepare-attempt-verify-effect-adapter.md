# Batch CA-11 — Tmux Prepare/Attempt/Verify Effect Adapter

Status: ❌ Not started
Pack: wt-coordinator-automation (Pack 5)
Phase: Effect adapters
Depends on: RT-05, CA-10 accepted
Owned files: `src/foundation/tmux-effect.ts`, `src/foundation/tmux-adapter.ts`

**Required implementor reasoning class:** `R4`
**Class rationale:** external effect adapter with prepare/attempt/verify journaling, unknown-launch recovery, duplicate suppression via idempotency key, and strict no-arbitrary-kill/no-shell-escape constraints. The class is a floor; escalate under the pack reasoning rules when source inspection exposes additional risk.

## Objective

Implement the tmux effect adapter that wraps CA-10's effect executor for
tmux-specific effects. Every tmux launch follows prepare (validate
session/window/pane exist), attempt (exec tmux command via central runtime
adapter), and verify (check pane content, exit code) phases. Unknown launch
recovery uses the effect journal. Duplicate launches are suppressed through
idempotency keys. Arbitrary kill and shell escape are forbidden.

## Required Work

1. **Read the normative effect and tmux contracts.** Study `v1-contracts.md §5`
   for the tmux effect types and their permitted parameters. Study
   `v1-contracts.md §12` for external-effect recovery through
   prepare/attempt/verify journals. Study `coordinator-automation.md §12.2–12.3`
   for external-effect handling. Study accepted RT-05 for the central runtime
   invocation adapter contract.

2. **Implement `src/foundation/tmux-adapter.ts`:**
   - `TmuxAdapter` class — wraps runtime invocation for all tmux operations.
   - `prepare(session: string, window: string, pane: string): PrepareResult` —
     validates that the session, window, and pane identifiers are sanitized
     strings matching the tmux naming grammar. Rejects shell metacharacters,
     wildcards, and path-like values. Validates the target exists through
     `tmux list-panes` output.
   - `attempt(command: TmuxEffectCommand, env: TmuxEnv): AttemptResult` —
     executes one bounded tmux command via the central runtime adapter
     (RT-05). Commands are dispatched through `argv`-only invocation; no
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
   - `TmuxEnv` type — the `WT_*` allowlist subset forwarded from the central
     runtime adapter.
   - `PrepareResult` type: `{ok, sessionExists, windowExists, paneExists,
     rejectReason?}`.
   - `AttemptResult` type: `{ok, command, exitCode, stdout, stderr,
     wallTimeMs}`.
   - `VerifyResult` type: `{ok, verified, actualExitCode, actualPaneContent,
     postconditionResults: PostconditionCheck[]}`.

3. **Implement `src/foundation/tmux-effect.ts`:**
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
     instantaneous (does not invoke the runtime adapter) and produces
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

- `src/foundation/tmux-adapter.ts` — owns all direct tmux invocation through
  the central runtime adapter. No other module executes tmux commands.
- `src/foundation/tmux-effect.ts` — owns the prepare/attempt/verify pipeline,
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
  rejects before the runtime adapter is invoked.
- **Model-free proof:** No model invocation in the tmux adapter.

## What Must Not Change

- Do not expand the allowed tmux command set.
- Do not create a direct tmux invocation path outside the adapter.
- Do not modify CA-10's executor or the central runtime adapter (RT-05).
- Do not permit arbitrary kill or shell escape.

## Review Procedure Highlights

1. Independently test every tmux command in the allowed set.
2. Prove every forbidden command is rejected before invocation.
3. Prove duplicate suppression through idempotency key replay.
4. Simulate crash between attempt and verify — prove recovery behavior.
5. Verify no shell metacharacter reaches the runtime adapter.

---

## Required Reasoning Posture

The adapter is a high-trust boundary: it is the ONLY component that executes
tmux commands for coordinator effects. A missed rejection of a forbidden
command, a shell-injection gap in target sanitization, or incorrect
crash-recovery idempotency could result in uncontrolled tmux session state or
shell escape. The implementor must reason about every character class reaching
the runtime adapter and every crash point in the prepare→attempt→verify chain.

## Structural And Module-Size Acceptance

- `src/foundation/tmux-adapter.ts` target ≤200 lines (sanitization, prepare,
  attempt, verify, and command dispatch).
- `src/foundation/tmux-effect.ts` target ≤250 lines (CA-10 integration,
  recovery, duplicate suppression, phase journaling). Responsibility inventory
  at 201–250; warning-band justification at 251–300; split expected if
  recovery logic grows.
- Test modules ≤300 lines; split by prepare, attempt, verify, forbidden,
  idempotency, and recovery families.

## Required Review Packet

1. Implementation report in `.local/agent-reports/coordinator-automation/`.
2. All `nvb build` and `nvb test` output.
3. Targeted test results for every required proof above.
4. Verification that no forbidden command reaches the runtime adapter.
5. Crash-recovery and idempotency replay evidence.

## Completion And Handoff

- Implementation report, updated tracker/roadmap.
- CA-10's typed interface for external effects confirmed compatible.
- CA-12 may begin in parallel (separate adapter, shared CA-10 boundary).
- Leave the exact allowed command list, sanitization grammar, and error
  taxonomy for the next agent.
