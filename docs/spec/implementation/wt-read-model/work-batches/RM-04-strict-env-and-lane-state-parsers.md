# Batch RM-04 — Strict Env And Lane-State Parsers

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

Status: ❌ Pending
Phase: Parser foundation
Depends on: RM-01 accepted

**Required implementor reasoning class:** `R4`
**Class rationale:** strict parsers with shell safety; malicious-shell corpus must never execute. Wrong parser silently accepts injection.

## Objective

Parse `lane.config.env` scalar grammar and lane-state files. Accept known keys,
preserve unknown keys. Malicious shell corpus must never execute.

## Required Work

1. Create `src/foundation/scalarLineParser.ts`: shared parser utilities — line-splitting,
   comment stripping, blank-line detection, scalar-value classification
   (unquoted, single-quoted, double-quoted).
2. Create `src/foundation/EnvParser.ts`: strict non-executing env-file scanner.
   Accept: blank lines, `#` comments, `KEY=value` with unquoted,
   single-quoted, or double-quoted scalar values. Reject with line-number
   diagnostics: command substitution, variable expansion, shell operators,
   unclosed quotes, non-scalar values.
3. Create `src/foundation/StateParser.ts`: lane-state file parser. Parse
   `state/coordinator-lane-state.txt` as `KEY=value` records. Normalize known
   keys (`lane_status`) into status projection. Preserve unknown keys in
   diagnostics map. Report contradictory state as `unknown`/`invalid`.
4. Write focused specs: 30+ fixture malicious-shell corpus (zero executions),
   known-key parsing with exact values, unknown-key preservation, contradictory
   state detection, line-number diagnostics.

## Expected Ownership

- `src/foundation/scalarLineParser.ts`, `src/foundation/EnvParser.ts`, `src/foundation/StateParser.ts`
- Respective focused specs.

## Tests And Evidence

- Malicious-shell corpus: `$(...)`, backticks, `${...}`, `$VAR`, `&&`, `||`, `|`, `;`, `&`, `<`, `>`, `>>`, unclosed quotes, executable statements, here-docs — all rejected, zero executed.
- Known-key parsing: exact values for every recognized key.
- Unknown-key preservation: keys not in the known set are preserved, not dropped.
- Contradictory state: `complete` + active batch → `unknown`/`invalid`.
- Line-number diagnostics for every rejection class.
- `nvb build` and `nvb test` pass.

## What Must Not Change

- Do not execute, `source`, or `eval` any config text.
- Do not import shell utilities into the parser.
- Do not silently repair contradictory state.

## Review Procedure Highlights

1. Verify the 30+ malicious-shell corpus covers every shell injection class.
2. Confirm parse output contains no executed commands.
3. Trace unknown-key preservation through known-key normalization.
4. Verify contradictory state produces `unknown`/`invalid`.

## Required Reasoning Posture

The assigned agent must reason from governing specs and source. Enumerate every
accepted grammar rule and every rejected construct. Build the malicious-shell
corpus from known injection techniques. Prove that happy-path parsing does not
hide an injection path through quoting edge cases.

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

Include: changed files, line counts, responsibility inventories, proof commands,
git status, `.local/` not staged.

## Completion And Handoff

The strict parsers are accepted. RM-06 consumes state parsing for lane status.
RM-09 consumes env parsing for config display. No downstream batch may
`source` or `eval` lane config or state.
