# Review Batch CA-07 — Immutable decision envelopes

## Synchronized batch execution matrix

- **Accepted-map title:** Immutable decision envelopes
- **Dependencies:** `CA-02`–`CA-06`
- **Exclusive ownership/interface:** envelope foundation
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** Stable semantic digest; bounded default context; contradiction/advisor evidence references and impact scope; untrusted-content delimiting
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-07-immutable-decision-envelopes.md`
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-07-immutable-decision-envelopes-review.md`
- **Correction report:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-07-immutable-decision-envelopes-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

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

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **envelope foundation**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/reviews/CA-07-immutable-decision-envelopes-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`CA-02`–`CA-06`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Stable semantic digest; bounded default context; contradiction/advisor evidence references and impact scope; untrusted-content delimiting**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **envelope foundation** and **Stable semantic digest; bounded default context; contradiction/advisor evidence references and impact scope; untrusted-content delimiting**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-07-immutable-decision-envelopes-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-coordinator-automation/reviews/CA-07-immutable-decision-envelopes-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
