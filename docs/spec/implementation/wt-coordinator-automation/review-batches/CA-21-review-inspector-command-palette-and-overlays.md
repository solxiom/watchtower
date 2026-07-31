# Review Batch CA-21 — Inspector views, command palette, and overlays

## Synchronized batch execution matrix

- **Accepted-map title:** Inspector views, command palette, and overlays
- **Dependencies:** `CA-14`, `CA-17`, `CA-19`, `CA-26`, `CA-27`
- **Exclusive ownership/interface:** inspector/action/overlay components
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** All bounded inspector states; projection-only agent/allocation view; bounded search/attention; canonical action parity; confirmation, diagnostics, and details overlays
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-21-inspector-command-palette-and-overlays.md`
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-21-inspector-command-palette-and-overlays-review.md`
- **Correction report:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-21-inspector-command-palette-and-overlays-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ⏳ Awaiting independent review
Paired work: ../work-batches/CA-21-inspector-command-palette-and-overlays.md
Dependencies: CA-14, CA-17, CA-19, CA-26, CA-27

Read AGENTS.md; docs/development/engineering-and-review-standard.md; docs/spec/v1.md; docs/spec/v1-contracts.md; docs/spec/nirvana-integration-architecture.md; docs/spec/v1-implementation-map.md; docs/spec/implementation/planning-remediation-amendment.md; pack quality rules. Review the exact diff/source/artifacts/report, not implementer conclusions. Verify exclusive ownership: inspector/action/overlay components. Own inspector/action/overlay UI over accepted read projections, CA-26 confirmation and CA-27 hold/amendment services. No direct effect or policy authority.

Independently reproduce All bounded inspector states; projection-only agent/allocation view; bounded search/attention; canonical action parity; confirmation, diagnostics, and details overlays; negative/stale/corrupt/path/state/replay/concurrency/read-only/effect/relocation boundaries; Nirvana/NVB and API-gap evidence; public artifact synchronization; size/cohesion; build/test/dist; ownership/Git hygiene; and every mandatory engineering matrix row. Do not repair. Any failed gate rejects. Emit exactly one durable accept/reject/skip; only the reviewer may create the acceptance commit, separately from publication.


## Synchronized executable contract

This section is mandatory and batch-specific. It closes the accepted-map boundary without transferring adjacent ownership.

- Exact map title: **Inspector views, command palette, and overlays**
- Accepted dependencies: `CA-14`, `CA-17`, `CA-19`, `CA-26`, `CA-27`
- Exclusive owner: inspector/action/overlay components
- Required proof claim: All bounded inspector states; projection-only agent/allocation view; bounded search/attention; canonical action parity; confirmation, diagnostics, and details overlays
- Reasoning floor: implementer **R4**, independent reviewer **R4**; the reviewer may never use a weaker class.
- Exact review report: `.local/agent-reports/wt-coordinator-automation/reviews/CA-21-inspector-command-palette-and-overlays-review.md`
- Correction report pattern: `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-21-inspector-command-palette-and-overlays-correction-<NN>.md`

### Interface and failure-order contract

Before judgment, produce a source-backed ownership map naming the exact existing and proposed modules, public symbols, schema/help/task IDs, tests, and predecessor handoff interfaces inside **inspector/action/overlay components**. A generic helper, command-local algorithm, duplicated registry, shell workflow, or adjacent batch capability is a scope failure. External bytes and process output enter as `unknown`, validate into closed contracts, and receive stable reason codes.

The required order is: validate syntax and schema; resolve canonical identity and accepted predecessor versions; check authorization, claims, capabilities, and current-state fences; prepare a side-effect-free plan; acquire the specified lock only for the bounded effect; apply once through the accepted owner; verify durable output; then publish the durable event. Every failure before the commit point leaves authoritative bytes unchanged. Every uncertain or post-commit failure is verified from durable state before retry.

### Selected adversarial matrix

- malformed, missing, extra, and unsupported external values produce the exact typed reason code and never partially succeed;
- missing, stale, corrupt, or incompatible predecessor evidence fails closed before owned output or authoritative state changes;
- duplicate, replay, stale-current-state, concurrent-writer, interrupted-effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- a before/after byte inventory proves every read-only, preview, audit, query, and diagnostic path performs no repair or authoritative mutation;
- isolated/relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

### Reproducible proof and reporting

Run the narrowest focused specs first, then the repository gates below from the exact assigned checkout. A command may be marked not applicable only with source-backed explanation in the report.

```sh
git status --short
git diff --check
nvb build
nvb test
nvb dist
```

Record exact commands, exit status, relevant counts, changed-file responsibility/line inventory, Nirvana symbols and comparable Nira call sites inspected, each real `NIRVANA_API_GAP`, package/relocation evidence when applicable, and `kavan:kavan` ownership. Never stage generated build/dist/local artifacts.

Inspect the actual diff and source independently; the implementation report is evidence to challenge, not authority. Reproduce the focused and adversarial proofs in mandatory review order and include the complete engineering-standard PASS/FAIL matrix. Do not repair. Any failed row produces one durable `reject`, the numbered correction report above, and an impact-scoped tracker state that preserves unrelated ready work. Only a fully clean review may produce one `accept` and the acceptance commit; publication remains separate.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **inspector/action/overlay components**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/reviews/CA-21-inspector-command-palette-and-overlays-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`CA-14`, `CA-17`, `CA-19`, `CA-26`, `CA-27`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **All bounded inspector states; projection-only agent/allocation view; bounded search/attention; canonical action parity; confirmation, diagnostics, and details overlays**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **inspector/action/overlay components** and **All bounded inspector states; projection-only agent/allocation view; bounded search/attention; canonical action parity; confirmation, diagnostics, and details overlays**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-21-inspector-command-palette-and-overlays-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-coordinator-automation/reviews/CA-21-inspector-command-palette-and-overlays-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
