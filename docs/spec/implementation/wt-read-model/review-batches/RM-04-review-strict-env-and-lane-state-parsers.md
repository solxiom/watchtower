# Review Batch RM-04 — Strict Env And Lane-State Parsers

Status: ⏳ Awaiting review
Reasoning: `R4`
Paired work brief: `work-batches/RM-04-strict-env-and-lane-state-parsers.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-04-strict-env-and-lane-state-parsers.md`

## Scope Verification

- [ ] `src/foundation/parsers.ts` with shared parser utilities
- [ ] `src/foundation/env-parser.ts` with strict non-executing scanner and redaction
- [ ] `src/foundation/state-parser.ts` with state parser and status normalization
- [ ] No shell execution of config text anywhere

## Required Independent Proof

1. Independently run the 30+ fixture malicious-shell corpus. Verify every injection class (`$(...)`, backticks, `${...}`, `$VAR`, `&&`, `||`, `|`, `;`, `&`, `<`, `>`, unclosed quotes, here-docs) is rejected with a line-number diagnostic. Verify zero commands were executed.
2. Verify known-key parsing: each recognized key parses to the exact value.
3. Verify unknown-key preservation: keys not in the known set appear in the diagnostics map, not silently dropped.
4. Verify quoting edge cases: single-quote inside double-quote OK; unclosed quote rejected; mixed quoting handled correctly.
5. Verify redaction: key names matching TOKEN/SECRET/PASSWORD/KEY/CREDENTIAL are redacted; non-matching keys preserved; redaction in both `redactSensitiveKeys` output and parsed config output.
6. Verify contradictory state: `complete` + active batch → `unknown`/`invalid`. Test each contradiction class independently.
7. Run `nvb build` and `nvb test` independently.

## Acceptance Gate

- All 30+ malicious-shell fixtures rejected; zero executions.
- Known keys parse correctly; unknown keys preserved.
- Redaction covers all five patterns.
- Contradictory state detected.
- Build and tests pass independently.

## Reject Conditions

- Any shell injection accepted.
- Unknown keys silently dropped.
- Contradictory state silently normalized.
- Stale tracker/roadmap. Implementation agent committed.
