# Review Batch RM-04 — Strict Env And Lane-State Parsers

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

Status: ⏳ Awaiting review
Reasoning: `R4`
Paired work brief: `work-batches/RM-04-strict-env-and-lane-state-parsers.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-04-strict-env-and-lane-state-parsers.md`

## Scope Verification

- [ ] `src/foundation/scalarLineParser.ts` with shared parser utilities
- [ ] `src/foundation/EnvParser.ts` with strict non-executing scanner and redaction
- [ ] `src/foundation/StateParser.ts` with state parser and status normalization
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
