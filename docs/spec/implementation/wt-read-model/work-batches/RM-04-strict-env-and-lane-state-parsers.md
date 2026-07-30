# Batch RM-04 — Strict Env And Lane-State Parsers

Status: ❌ Pending
Phase: Parser foundation
Depends on: RM-01 accepted

**Required implementor reasoning class:** `R4`
**Class rationale:** strict parsers with shell safety; malicious-shell corpus must never execute. Wrong parser silently accepts injection.

## Objective

Parse `lane.config.env` scalar grammar and lane-state files. Accept known keys,
preserve unknown keys. Malicious shell corpus must never execute.

## Required Work

1. Create `src/foundation/parsers.ts`: shared parser utilities — line-splitting,
   comment stripping, blank-line detection, scalar-value classification
   (unquoted, single-quoted, double-quoted).
2. Create `src/foundation/env-parser.ts`: strict non-executing env-file scanner.
   Accept: blank lines, `#` comments, `KEY=value` with unquoted,
   single-quoted, or double-quoted scalar values. Reject with line-number
   diagnostics: command substitution, variable expansion, shell operators,
   unclosed quotes, non-scalar values.
3. Create `src/foundation/state-parser.ts`: lane-state file parser. Parse
   `state/coordinator-lane-state.txt` as `KEY=value` records. Normalize known
   keys (`lane_status`) into status projection. Preserve unknown keys in
   diagnostics map. Report contradictory state as `unknown`/`invalid`.
4. Write focused specs: 30+ fixture malicious-shell corpus (zero executions),
   known-key parsing with exact values, unknown-key preservation, contradictory
   state detection, line-number diagnostics.

## Expected Ownership

- `src/foundation/parsers.ts`, `src/foundation/env-parser.ts`, `src/foundation/state-parser.ts`
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

Per the quality rules: 160/220/300/350/400-line bands. No `helpers`/`utils` bags.
Record line counts.

## Required Review Packet

Include: changed files, line counts, responsibility inventories, proof commands,
git status, `.local/` not staged.

## Completion And Handoff

The strict parsers are accepted. RM-06 consumes state parsing for lane status.
RM-09 consumes env parsing for config display. No downstream batch may
`source` or `eval` lane config or state.
