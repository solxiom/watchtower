# Review Batch RM-04 — Strict env and lane-state parsers

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

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **parser foundation**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-read-model/reviews/RM-04-strict-env-and-lane-state-parsers-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-01`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Accepted scalar grammar; malicious shell corpus never executes; unknown-key preservation**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **parser foundation** and **Accepted scalar grammar; malicious shell corpus never executes; unknown-key preservation**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-read-model/reviews/corrections/RM-04-strict-env-and-lane-state-parsers-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-read-model/reviews/RM-04-strict-env-and-lane-state-parsers-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
