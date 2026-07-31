# Batch RM-04 — Strict env and lane-state parsers

## Synchronized batch execution matrix

- **Accepted-map title:** Strict env and lane-state parsers
- **Dependencies:** `RM-01`
- **Exclusive ownership/interface:** parser foundation
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** Accepted scalar grammar; malicious shell corpus never executes; unknown-key preservation
- **Implementation report:** `.local/agent-reports/wt-read-model/RM-04-strict-env-and-lane-state-parsers.md`
- **Review report:** `.local/agent-reports/wt-read-model/reviews/RM-04-strict-env-and-lane-state-parsers-review.md`
- **Correction report:** `.local/agent-reports/wt-read-model/reviews/corrections/RM-04-strict-env-and-lane-state-parsers-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

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

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **parser foundation**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-read-model/RM-04-strict-env-and-lane-state-parsers.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-01`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Accepted scalar grammar; malicious shell corpus never executes; unknown-key preservation**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **parser foundation** and **Accepted scalar grammar; malicious shell corpus never executes; unknown-key preservation**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-read-model/RM-04-strict-env-and-lane-state-parsers.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
