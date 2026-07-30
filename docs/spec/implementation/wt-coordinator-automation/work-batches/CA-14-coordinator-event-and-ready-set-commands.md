# Batch CA-14 — Coordinator, Event, and Ready-Set Commands

Status: ❌ Not started
Pack: wt-coordinator-automation (Pack 5)
Phase: Commands and rendering
Depends on: CA-01 through CA-13 accepted
Owned files: commands in `src/commands/`, help fragments in `help/commands/`, `help/help.json`

**Required implementor reasoning class:** `R4`
**Class rationale:** command surface for the full coordinator automation system, with human/JSON output parity, dry-run purity, help registration, and integration of all predecessor foundation modules. The class is a floor; escalate under the pack reasoning rules when source inspection exposes additional risk.

## Objective

Implement the `wt coordinator` command group — index, status, context, explain,
cycle, escalate, events, and ready commands. All commands must support dry-run
(`--dry-run`) and pure mode where applicable. Human-readable and `--json` output
derive from the same contracts. Every command is registered in `help/help.json`
with a complete help fragment.

## Required Work

1. **Read the normative CLI contract.** Study `coordinator-automation.md §19`
   for the complete CLI command table. Study accepted CA-01 through CA-13 for
   the foundation modules each command must consume. Study accepted RM-02 for
   the JSON envelope contract.

2. **Implement coordinator index commands:**
   - `wt coordinator index build [--runtime]` — compiles the sealed-pack index
     (or rebuilds runtime indexes from append-only journals with `--runtime`).
     Depends on CA-01 pack-index compiler. `--dry-run` validates without writing.
   - `wt coordinator index status` — reports pack index freshness, digests,
     counts, compiler compatibility. Read-only. `--json` returns structured data.
   - `wt coordinator index verify` — verifies index integrity (digests, paths,
     cross-references, counts). Read-only. `--json` returns verification results.
   - `wt coordinator index explain <batch-or-requirement>` — shows bounded index
     references and provenance without loading canonical prose. Read-only.
     Depends on CA-02 bounded queries.

3. **Implement coordinator status and context commands:**
   - `wt coordinator status` — shows queue, active cycle, routing, budget, and
     last outcome. Read-only. Derives from CA-13 queue and CA-05 routing.
   - `wt coordinator context --class=<D1|D2|D3> --trigger=<event-id>` —
     previews the decision envelope and size estimates. Read-only. Depends on
     CA-07 envelope construction and CA-08 budget estimates. `--dry-run` is
     the default (this command is always read-only).
   - `wt coordinator explain [--cycle=<id>]` — explains the routing rule,
     guards, endpoint, proposal, and effect result for a completed or active
     cycle. Read-only. Depends on CA-05 routing, CA-07 envelopes, and CA-10
     effect journals.

4. **Implement coordinator cycle and escalate commands:**
   - `wt coordinator cycle --trigger=<event-id> [--dry-run]` — routes and
     processes one idempotent cycle. Depends on CA-05 routing, CA-06 adapter
     eligibility, CA-07 envelopes, CA-08 context broker, CA-09 validator,
     CA-10 executor, and CA-13 queue/cursor. `--dry-run` routes and builds
     the envelope but does not invoke an endpoint or execute effects.
   - `wt coordinator escalate [--cycle=<id>] --reason=<text>` — opens an
     attention operator session and any policy-required safety hold. Depends
     on CA-15 session creation (for the escalation session entry). Records
     `coordinator-escalated` event. `--dry-run` shows the escalation plan
     without creating a session or hold.

5. **Implement events commands:**
   - `wt events tail [--since=<cursor>]` — reads validated durable events
     from the coordinator and effect journals. Read-only. Depends on CA-03
     runtime indexes. `--json` returns an events array with continuation
     cursor.
   - `wt events latest [--batch=<id>]` — shows the latest relevant event
     projection for a batch or the whole lane. Read-only. Depends on CA-03
     runtime projections.

6. **Implement batch-ready command:**
   - `wt batch ready` — calculates ready candidates and blocking reasons.
     Read-only. Depends on CA-04 ready-set projection. `--json` returns
     structured ready/blocked arrays.

7. **Help registration:**
   - Register every command in `help/help.json` under the appropriate group
     (`coordinator`, `events`, `batch`).
   - Create help fragments in `help/commands/` for every command:
     `coordinator-index-build.hlp.json`, `coordinator-index-status.hlp.json`,
     `coordinator-index-verify.hlp.json`, `coordinator-index-explain.hlp.json`,
     `coordinator-status.hlp.json`, `coordinator-context.hlp.json`,
     `coordinator-explain.hlp.json`, `coordinator-cycle.hlp.json`,
     `coordinator-escalate.hlp.json`, `events-tail.hlp.json`,
     `events-latest.hlp.json`, `batch-ready.hlp.json`.
   - Help fragments include command syntax, options, examples, and the
     `--dry-run` and `--json` flags where applicable.

8. **Output contracts:**
   - Human output: tables, status lines, and bounded prose using shared
     rendering utilities.
   - `--json` output: typed JSON envelopes matching the contracts in
     RM-02. Human and JSON output derive from the same underlying data
     — no separate rendering paths that drift.
   - `--dry-run` output: previews exactly what WOULD happen (effects,
     mutations, external invocations) without executing any of them.
   - Dry-run never invokes a model, an endpoint, a Git push, a tmux command,
     or any external process. It must complete entirely deterministically.

9. **Command class pattern:**
   - Each command extends `BaseCommand` and follows the existing pattern
     in `src/commands/`.
   - No product logic in `src/cli.ts` — it routes to the command class.
   - Commands delegate to foundation modules, never duplicate path discovery,
     config reading, or effect execution.

## Expected Ownership

- `src/commands/CoordinatorIndexBuildCommand.ts` through
  `src/commands/BatchReadyCommand.ts` — one file per command, following the
  existing command pattern.
- `help/commands/` — one help fragment per command.
- `help/help.json` — updated with all new commands.
- No command may own business logic that belongs in a foundation module.

## Tests And Evidence

- **Every command with valid args:** Prove each command runs with valid
  arguments and produces correct output (human and `--json`).
- **Every command with invalid args:** Prove each command fails with a clear
  error and correct exit code for: missing required args, invalid class values,
  unknown event IDs, missing indexes, and stale indexes.
- **Dry-run purity:** For every mutating command (`index build`, `cycle`,
  `escalate`), prove `--dry-run` produces a preview without executing any
  external process, writing any file, or invoking any model.
- **Human/JSON parity:** For every read-only command, prove the `--json` output
  contains the same semantic information as the human output. No information
  is only available in one format.
- **Help completeness:** Verify every command is in `help/help.json` and has a
  valid help fragment. Verify `wt help <command>` works for every command.
- **Index commands:** Prove `index status` reports correct freshness and counts.
  Prove `index verify` detects corruption, missing files, and stale indexes.
  Prove `index explain` returns bounded references without loading prose.
- **Status command:** Prove `status` shows queue state, active cycle (if any),
  routing info, and budget.
- **Context command:** Prove `context` previews the envelope with size estimates
  and does not invoke a model.
- **Explain command:** Prove `explain` shows the routing decision, guard inputs,
  and effect outcome for a given cycle.
- **Cycle command:** Prove `cycle` with `--dry-run` shows the complete planned
  processing without execution. Prove `cycle` without `--dry-run` processes a
  real cycle (when infrastructure is available).
- **Escalate command:** Prove `escalate` with `--dry-run` shows the escalation
  plan. Prove `escalate` creates a session and optional hold when executed.
- **Events commands:** Prove `events tail` paginates and `events latest` shows
  the correct projection.
- **Ready command:** Prove `batch ready` calculates correct ready candidates
  and blocking reasons.
- **Model-free proof:** No command invokes a model independently of the
  coordinator cycle pipeline (only `cycle` may route to an endpoint, and only
  when not in `--dry-run` mode).

## What Must Not Change

- Do not add product logic to `src/cli.ts`.
- Do not modify any CA-01 through CA-13 foundation module.
- Do not duplicate path discovery, config parsing, or effect logic in commands.
- Do not change the existing command pattern or BaseCommand contract.

## Review Procedure Highlights

1. Independently run every command with valid and invalid arguments.
2. Prove `--dry-run` purity for every mutating command.
3. Prove human/JSON parity for every read-only command.
4. Verify help registration completeness.
5. Verify all commands delegate to foundation, never reimplement.

---

## Required Reasoning Posture

The command layer is the public surface for the entire coordinator automation
system. It must correctly integrate CA-01 through CA-13 without duplicating
their logic, leaking abstractions, or creating alternative execution paths.
The implementor must reason about every command's dependency chain and every
dry-run guarantee.

## Structural And Module-Size Acceptance

- Each command file target ≤120 lines (thin host delegating to foundation).
  Warning-band at 121–160.
- Help fragments target ≤40 lines each.
- No command file may exceed 200 lines.
- Test modules ≤300 lines; split by command group (index, status/context/explain,
  cycle/escalate, events, ready).

## Required Review Packet

1. Implementation report in `.local/agent-reports/coordinator-automation/`.
2. All `nvb build` and `nvb test` output.
3. Command execution output (human and `--json`) for every command.
4. Dry-run purity evidence for every mutating command.
5. Help registry completeness verification.

## Completion And Handoff

- Implementation report, updated tracker/roadmap.
- CA-15 through CA-18 will add session commands on top of this command
  foundation (using the same patterns).
- Leave the exact command list, their help fragments, and their foundation
  module dependencies for the next agent.
