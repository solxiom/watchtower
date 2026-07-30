# Review Batch CA-07 — Immutable Decision Envelopes

Status: ⏳ Awaiting review
Reasoning: `R4`
Paired work brief: `work-batches/CA-07-immutable-decision-envelopes.md`
Implementation report: `.local/agent-reports/coordinator-automation/CA-07-immutable-decision-envelopes.md`

## Scope Verification

- [ ] `src/contracts/decision.ts` created with `DecisionEnvelope`, `BoundedContext`, and all sub-types
- [ ] `src/foundation/decision-envelope.ts` created with `DecisionEnvelopeBuilder`
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
