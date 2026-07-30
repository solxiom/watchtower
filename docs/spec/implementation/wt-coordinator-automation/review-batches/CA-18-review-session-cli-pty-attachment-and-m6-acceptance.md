# Review Batch CA-18 — Session CLI/PTY Attachment and M6 Acceptance

> **Superseded on 2026-07-31. Do not review or accept.** The full-screen TUI
> amendment decomposes this scope into `CA-18` through `CA-24` in
> `docs/spec/v1-implementation-map.md §8`. This historical brief is not review
> authority.

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
