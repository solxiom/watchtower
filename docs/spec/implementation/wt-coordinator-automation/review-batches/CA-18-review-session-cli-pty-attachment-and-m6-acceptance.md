# Review Batch CA-18 — Session CLI/PTY Attachment and M6 Acceptance

Status: ❌ Not started
Paired work batch: CA-18
Reviewer owns the acceptance commit.

## Scope Verification

1. **File ownership:** Verify new session command files exist in `src/commands/`
   with correct names. Verify terminal renderer and PTY attachment modules exist
   in the designated location. Verify help fragments for all new commands exist
   and `help/help.json` is updated. No other command files were added.
2. **Dependency direction:** All commands delegate to CA-15 through CA-17
   foundations. No foundation module was modified. The attachment is a
   presentation client consuming typed events — it does not own session state,
   memory, or effect authority.
3. **Spec compliance:** Every session command in `operator-session.md §19.1`
   and `operator-session.md §19.2` is implemented. PTY behavior matches
   `cli-session.md` §§4–14. Presentation events match `cli-session.md §6`.
   Slash-command registry matches `cli-session.md §9`. Signal handling matches
   `cli-session.md §13`.
4. **Layer integrity:** `src/cli.ts` contains no new product logic. Commands
   are thin hosts. The renderer contains no coordinator policy or effect logic.
   The attachment is a presentation client.
5. **Pack-exit gate:** This batch completes Pack 5 (M6). The complete M6
   acceptance criteria in `coordinator-automation.md §24` must be verified.
   The scaling proof must demonstrate that pack growth does not increase
   ordinary model context.

## Required Independent Proof

- **Every session command:** Independently run each command with valid and
  invalid arguments. Verify correct output (human and `--json`). Verify
  `--dry-run` purity for mutating commands.
- **Interactive attachment:** Independently create a session, attach, submit
  a turn, and verify the response is rendered. Detach without closing the
  session. Verify the session remains open.
- **Observer attachment:** Independently create an observer attachment. Verify
  it can issue M0 slash commands but cannot submit natural-language turns.
- **Slash-command audit:** Independently run every slash command. Verify M0
  commands invoke no model. Independently run an unknown `/word`. Prove it
  produces an error and does not invoke a model. Run `//text`. Prove it
  routes as a natural-language turn.
- **Streaming audit:** Independently submit a turn with a streaming-capable
  adapter. Verify provisional chunks are marked non-authoritative. Verify only
  the complete validated response is recorded. Verify buffered fallback when
  the adapter lacks streaming.
- **Signal audit — editing:** Independently Ctrl-C mid-edit. Verify the input
  is cleared and the prompt resets.
- **Signal audit — preflight:** Independently trigger preflight confirmation
  mode. Ctrl-C during confirmation. Verify the turn is cancelled before
  invocation and `operator-session-turn-cancelled-before-invocation` is
  journaled. Verify zero model usage.
- **Signal audit — after invocation:** Independently submit a turn with a long
  response. Ctrl-C mid-response. Verify the turn is journaled as `interrupted`
  and no effect is applied. Verify the session remains open and resumable.
- **Signal audit — at confirmation:** Independently trigger an effect
  confirmation. Ctrl-C at the confirmation prompt. Verify no effect is applied.
- **Signal audit — Ctrl-D:** Independently press Ctrl-D at an empty prompt.
  Verify the attachment detaches but the operator session remains open.
- **Signal audit — SIGHUP:** Independently send SIGHUP during an active turn.
  Verify the session state is preserved and no partial effect exists in the
  journal.
- **Accessibility audit:** Independently run with `--no-color` and
  `NO_COLOR=1`. Verify output is readable without ANSI codes. Independently
  test screen-reader mode: verify append-only output lines (no cursor rewriting).
- **Scaling proof — envelope:** Generate sealed fixtures at 30, 300, 3,000,
  and 10,000 batches. For each, measure M0/D1/ordinary-D2 envelope bytes.
  Independently verify they remain within the same configured bound across all
  scales.
- **Scaling proof — context:** Independently verify that unrelated batch growth
  adds no additional broker context records to a routine trigger's envelope
  at any scale.
- **Scaling proof — ready set:** Trigger an acceptance at each scale.
  Independently verify the ready-set update inspects only the changed batch's
  outgoing dependency edges, not all batches.
- **Scaling proof — latest event:** Independently verify the latest-event
  lookup uses an indexed path (O(1) or O(log n)), not a full journal scan,
  at every scale point.
- **Scaling proof — index:** Independently verify index build time is measured
  and is O(F + B + E + R + C), not superlinear. Verify index query time is
  bounded regardless of scale.
- **Scaling proof — session:** Independently verify session attachment startup
  time is not proportional to total lane history.
- **Scaling proof — model-free:** Independently verify zero model invocations
  for M0 slash commands, index builds, index queries, latest-event lookups,
  and ready-set updates at every scale point.
- **Scaling proof — long-lane replay:** Simulate many completed cycles.
  Independently verify the default session working set stays within configured
  bounds regardless of lane history length.
- **Help completeness:** Independently verify every session command is in
  `help/help.json` with a valid help fragment. Run `wt help <command>` for
  each.
- **Build and test:** Run `nvb build` and `nvb test` independently. Verify
  zero failures.
- **Layer audit:** Verify `src/cli.ts` has not grown materially.

## Required Reasoning Posture

The reviewer must independently reproduce the scaling proof at all four scale
points. The reviewer must independently test every signal-handling scenario and
prove no scenario produces a partial effect or loses durable state. The reviewer
must prove that the attachment is truly a presentation client — removing it
does not affect session state, memory, or effect authority.

## Structural And Module-Size Acceptance

- Each command file ≤120 lines (≤160 with justification). Verify physical line
  counts for every new command file.
- Terminal renderer ≤300 lines (≤350 with warning-band justification). Verify
  physical line count and responsibility inventory.
- PTY attachment ≤250 lines (≤300 with justification). Verify physical line
  count and responsibility inventory.
- Help fragments ≤40 lines each.
- Scale-proof fixtures in `.local/` only (not committed).
- Test modules ≤300 lines. Verify split by concern family.

## Required Review Packet

1. Independent execution output for every session command.
2. Interactive attachment walkthrough with turn submission/detachment.
3. Slash-command registry audit (M0 model-free proof, unknown-slash error,
   `//text` escape).
4. Signal-handling matrix (every Ctrl-C stage, Ctrl-D, SIGHUP).
5. Streaming provisional/validated separation proof.
6. Accessibility verification (no-color, screen-reader mode).
7. Complete scaling proof tables at 30/300/3,000/10,000 batches.
8. Long-lane replay context-bound proof.
9. M6 pack-exit criteria verification against `coordinator-automation.md §24`.
10. `nvb build` and `nvb test` output.

## Acceptance Gate

The batch (and Pack 5) is accepted only when:
- Every session command is implemented, working, and help-registered.
- The interactive attachment is a correct, safe, presentation-only client.
- Slash commands are deterministic; M0 commands invoke zero models; unknown
  `/word` errors without model invocation.
- Streaming is visibly provisional; only validated response is authoritative.
- Every signal scenario produces safe behavior with no partial effects.
- Accessibility modes produce readable output.
- Scaling proof at 30/300/3,000/10,000 batches demonstrates bounded model
  context, bounded query/index cost, and zero model invocations for
  mechanical operations.
- Long-lane replay does not grow the default working set.
- All M6 acceptance criteria in `coordinator-automation.md §24` are verified.
- `nvb build` and `nvb test` pass independently.
- Tracker and roadmap are updated.
- No `.local/` artifacts are staged.
- The implementation agent did not commit.

## Reject Conditions

Reject immediately if:
- Any slash-command typo or unknown `/word` invokes a model.
- Provisional streaming text becomes authoritative.
- Ctrl-C or SIGHUP produces a partial effect or loses durable state.
- Ctrl-D closes the operator session.
- The attachment owns session state, memory, or effect authority.
- Any scaling measurement shows pack-size-proportional model context growth.
- An M0 operation invokes a model at any scale point.
- The scaling proof is missing any scale point.
- Build or tests fail.
- `.local/` artifacts are staged.
- The implementation agent committed.
- Any file exceeds the structural ceiling without documented reviewer acceptance.
- Any M6 acceptance criterion in `coordinator-automation.md §24` is unmet.
