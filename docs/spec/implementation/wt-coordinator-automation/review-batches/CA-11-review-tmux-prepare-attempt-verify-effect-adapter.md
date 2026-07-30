# Review Batch CA-11 — Tmux Prepare/Attempt/Verify Effect Adapter

Status: ❌ Not started
Paired work batch: CA-11
Reviewer owns the acceptance commit.

## Scope Verification

1. **File ownership:** Verify `src/foundation/tmux-adapter.ts` and
   `src/foundation/tmux-effect.ts` are the only files introduced by this batch.
   No other module gained tmux execution capability.
2. **Dependency direction:** Verify the adapter depends on CA-10's typed
   external-effect interface and RT-05's central runtime adapter, not the
   reverse. No CA-10 or RT-05 internals were modified.
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

## Required Independent Proof

- **Command coverage:** Independently test every allowed tmux command through
  the full prepare→attempt→verify chain. Prove each succeeds with valid inputs.
- **Forbidden-command block:** For every forbidden command listed above,
  independently prove the adapter rejects before the runtime adapter is invoked.
  Verify zero network or process calls for forbidden commands.
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
character class that could reach the runtime adapter through the sanitizer
and prove each is rejected. The reviewer must prove that no sequence of
adapter calls can produce an arbitrary shell command or arbitrary tmux kill.

## Structural And Module-Size Acceptance

- `src/foundation/tmux-adapter.ts` ≤200 lines. Verify physical line count.
- `src/foundation/tmux-effect.ts` ≤250 lines (≤300 with warning-band
  justification). Verify physical line count and responsibility inventory.
- Test modules ≤300 lines each. Verify split by concern family.
- No generic `helpers`, `utils`, or `common` overflow modules.

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
- Any forbidden command reaches the runtime adapter or is not blocked.
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
