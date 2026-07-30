# Batch CA-11 — Tmux Prepare/Attempt/Verify Effect Adapter

## Mandatory Governing References

This draft brief is subordinate to:

- `AGENTS.md`
- `docs/development/engineering-and-review-standard.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/schemas/v1.schema.json`
- `docs/spec/v1.md`
- `docs/spec/nirvana-integration-architecture.md`
- `docs/spec/architecture.md`
- `docs/spec/v1-implementation-map.md`
- `docs/spec/coordinator-automation.md`
- `docs/spec/operator-session.md`
- `docs/spec/cli-session.md`
- this pack's `implementation-quality-and-agent-rules.md`

Only the references relevant to the batch's accepted scope need drive its
product logic, but the engineering and Nirvana/NVB architecture standards
always apply. If this brief names a stale path, title, size threshold, or
mechanism, follow the governing source and correct the brief/report rather than
implementing the stale claim. Stop for a specification amendment when the
governing sources leave a product decision unresolved.

## Mandatory Cross-Cutting Acceptance

- Include a Nirvana API usage audit with inspected packages/symbols, comparable
  Nira usage, selected APIs, and any proven `NIRVANA_API_GAP`.
- Keep commands as thin Nirvana front doors and place behavior in
  capability-oriented foundation owners.
- Use the packaged immutable NVB task catalog for substantial mechanical
  workflows. `LaneTaskRunner` is the sole task invocation boundary; project
  `nvb.json` files are never modified or trusted as Watchtower authority.
- Retain shell only as a manifest-declared leaf adapter. Workflow-level shell,
  arbitrary task selection, and direct raw subprocess use are hard rejects.
- Apply the exact module/function/constructor limits and reviewer matrix from
  the mandatory engineering standard. A pack-local statement cannot relax
  those limits.
- Reconcile every reason code, exit mapping, event name, and schema identifier
  with accepted RM-01 contracts and `docs/spec/schemas/v1.schema.json`; a local
  illustrative name does not silently create a public identifier.

Status: ❌ Not started
Pack: wt-coordinator-automation (Pack 5)
Phase: Effect adapters
Depends on: RT-05, CA-10 accepted
Owned files: `src/foundation/TmuxEffect.ts`, `src/foundation/TmuxAdapter.ts`

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

2. **Implement `src/foundation/TmuxAdapter.ts`:**
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

3. **Implement `src/foundation/TmuxEffect.ts`:**
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

- `src/foundation/TmuxAdapter.ts` — owns the typed tmux capability used by the
  focused packaged handler. Only that handler reaches `LeafRuntimeInvoker`; no
  other module executes tmux commands.
- `src/foundation/TmuxEffect.ts` — owns the prepare/attempt/verify pipeline,
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
