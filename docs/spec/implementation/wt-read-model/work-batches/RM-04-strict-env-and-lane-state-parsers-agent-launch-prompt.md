# Agent Launch Prompt — Work Batch RM-04

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for strict parser and shell-safety work`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent that
can load the complete brief/spec/source context, reason across security
boundaries, and run the required proof.

You are assigned **implementation work batch RM-04** for the Watchtower v1
wt-read-model delivery lane.

This batch implements strict non-executing env and lane-state parsers. The
malicious-shell corpus must never execute.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-read-model/work-batches/RM-04-strict-env-and-lane-state-parsers.md`
2. `docs/spec/implementation/wt-read-model/work-batches/README.md`
3. `docs/spec/implementation/wt-read-model/work-batches/00-work-batch-index.md`
4. `docs/spec/v1.md` (especially §8 — Lane configuration contract, §13 — State and event compatibility)
5. `docs/spec/v1-contracts.md`
6. `docs/spec/architecture.md` (especially §9.1 — Trust zones)
7. `docs/spec/implementation/wt-read-model/implementation-roadmap.md`
8. `docs/spec/implementation/wt-read-model/implementation-tracker.md`
9. `docs/spec/implementation/wt-read-model/implementation-quality-and-agent-rules.md`
10. the canonical source owners:
    - `src/foundation/parsers.ts` (create)
    - `src/foundation/env-parser.ts` (create)
    - `src/foundation/state-parser.ts` (create)

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high for strict parser and shell-safety work`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing specs, current source, predecessor handoff, and proof output in context; if it cannot do so, escalate the agent rather than shortening or partitioning away safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help with bounded exploration, but it cannot issue the final implementation or acceptance judgment for this batch

## Mandatory Reasoning Protocol

1. Build a dependency map from the specs to the exact grammar rules, parser
   modules, tests, and status artifacts.
2. Inspect the current source and accepted RM-01 output.
3. Enumerate every accepted input form (blank, comment, KEY=value with three
   quoting styles) and every rejected construct (command substitution,
   variable expansion, shell operators, unclosed quotes, executable statements).
4. Use counterexamples: a double-quoted string containing `$(...)` should be
   rejected because it looks like a string but contains command substitution.
   A bare `KEY=value` with `$VAR` in the value should be rejected.
5. Build the malicious-shell corpus from known shell injection techniques.
6. Never execute, `eval`, or `source` any config text during parsing or testing.

## Structural Design And Module-Size Gate

Per quality rules: 160/220/300/350/400-line bands. No `helpers`/`utils` bags.

## Your Mission

Implement strict env and lane-state parsers:

1. Create `src/foundation/parsers.ts`:
   - `splitLines(content: string): string[]` — split content into lines preserving line numbers.
   - `isBlankLine(line: string): boolean` — detect whitespace-only or empty lines.
   - `isCommentLine(line: string): boolean` — detect `#`-prefixed comment lines (after trimming).
   - `classifyScalarValue(value: string): 'unquoted' | 'single-quoted' | 'double-quoted' | 'invalid'` — classify a value by quoting style; reject unclosed quotes.
   - `parseKeyValue(line: string): { key: string; value: string; quoting: 'unquoted' | 'single-quoted' | 'double-quoted' } | null` — parse `KEY=value`, return null for non-kv lines.
2. Create `src/foundation/env-parser.ts`:
   - `parseEnvConfig(content: string): EnvConfigResult` — parse a complete env file. Return parsed keys as `Record<string, string>` and any warnings with line numbers.
   - The parser must reject: command substitution `$(...)` and backticks, variable expansion `${...}` and `$VAR`, shell operators (`&&`, `||`, `|`, `;`, `&`, `<`, `>`, `>>`), executable statements, unclosed quotes.
   - The parser must accept: blank lines, `#` comment lines, `KEY=value` with unquoted, single-quoted, or double-quoted scalar values.
   - `redactSensitiveKeys(config: Record<string, string>): { redacted: Record<string, string>; redactedKeys: string[] }` — redact values whose keys match `TOKEN`, `SECRET`, `PASSWORD`, `KEY`, or `CREDENTIAL`.
3. Create `src/foundation/state-parser.ts`:
   - `parseLaneState(content: string): LaneStateResult` — parse a lane-state file as `KEY=value` records.
   - `normalizeLaneStatus(rawState: Record<string, string>): LaneLifecycle` — normalize known `lane_status` into `bootstrap` | `active` | `paused` | `complete` | `unknown`.
   - `detectContradictions(state: Record<string, string>, lifecycle: LaneLifecycle): string[]` — detect contradictory state (e.g., `complete` + active batch).
4. Write focused Jasmine specs:
   - 30+ fixture malicious-shell corpus: each fixture must be rejected with a line-number diagnostic.
   - Known-key parsing: every recognized key parses to exact value.
   - Unknown-key preservation: keys not in known set appear in diagnostics.
   - Quoting edge cases: single-quote inside double-quote OK, unclosed quote rejected.
   - Blank lines and comments silently skipped.
   - Contradictory state detection: each contradiction class produces a diagnostic.
   - Redaction: sensitive keys redacted, non-sensitive keys preserved.

## What You Must Not Do

- Do not execute, `source`, `eval`, or shell-invoke any config text.
- Do not import command classes.
- Do not silently repair contradictory state.
- Do not commit.

## Required Proof

- 30+ malicious-shell fixtures all rejected; zero executed.
- Known-key parsing with exact value reproduction.
- Unknown-key preservation.
- Contradictory state detection.
- `nvb build` and `nvb test` pass.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

Keep `implementation-tracker.md` and `implementation-roadmap.md` updated.

## Local Artifact Git Rule

Write `.local/...` reports on disk only; never stage or commit.

## Non-Negotiable Rules

- no shell execution of config or state text
- every injection class must be rejected with line-number diagnostics
- unknown keys must be preserved, never silently dropped
- contradictory state must be diagnosed, never repaired
- do not add `.local` artifacts to git
- do not commit
- use `sudo -u kavan -i` when needed and keep touched files owned by `kavan`

## Required Disk Report

Write to: `.local/agent-reports/wt-read-model/RM-04-strict-env-and-lane-state-parsers.md`

Include: documents studied, exact files changed, line counts, proof commands
and outcomes, final `git status --short`, proposed commit message.

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the env parser API (`parseEnvConfig`, `redactSensitiveKeys`), state
parser API (`parseLaneState`, `normalizeLaneStatus`, `detectContradictions`),
and the accepted grammar rules. RM-06 consumes state parsing for lane status.
RM-09 consumes env parsing for config display. No downstream batch may execute
or source config text.
