# Review Batch CA-07 — Immutable Decision Envelopes

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
Paired work brief: `work-batches/CA-07-immutable-decision-envelopes.md`
Implementation report: `.local/agent-reports/coordinator-automation/CA-07-immutable-decision-envelopes.md`

## Scope Verification

- [ ] `src/contracts/decision.ts` created with `DecisionEnvelope`, `BoundedContext`, and all sub-types
- [ ] `src/foundation/DecisionEnvelope.ts` created with `DecisionEnvelopeBuilder`
- [ ] Envelope schema matches `coordinator-automation.md §8.1`
- [ ] Semantic digest excludes operational metadata (`createdAt`, `cycleId`)
- [ ] Bounded default context: no full-pack, full-history, or unrelated repository preloading
- [ ] Untrusted content properly labeled and delimited

## Required Independent Proof

1. Independently construct envelopes from identical authoritative inputs. Verify identical envelope bytes.
2. Verify semantic digest is stable: same inputs → same digest.
3. Verify semantic digest excludes `createdAt` and `cycleId`: change these fields → digest unchanged.
4. Verify semantic digest changes when authoritative inputs change (pack seal, trigger, lane projection).
5. Verify bounded-context size: no full-pack preloading, no full journal history preloading.
6. Verify untrusted content (worker reports, reviewer prose) is labeled as `untrusted` with provenance.
7. Verify credentials, endpoint configuration, and allocation details are NOT in the envelope.
8. Verify envelope passes JSON Schema validation.
9. Run `nvb build` and `nvb test`. Record output.
10. Verify `git log` shows the implementation agent did not commit.

## Acceptance Gate

- All hard-reject checklist items are clear.
- Deterministic envelope from identical inputs.
- Semantic digest stable and excludes operational metadata.
- Bounded context — no full-pack/history preloading.
- Untrusted content labeled and delimited.
- No credentials in envelopes.
- `nvb build` and `nvb test` pass.
- Tracker and roadmap updated.

## Reject Conditions

- Non-deterministic envelope output.
- Operational metadata included in semantic digest.
- Full-pack or full-history preloading into envelope.
- Credentials or endpoint secrets in envelope.
- Untrusted content not labeled as such.
- Stale tracker/roadmap.
- Implementation agent committed changes.
