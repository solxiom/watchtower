# Review Batch CA-11 — Tmux Prepare/Attempt/Verify Effect Adapter

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
