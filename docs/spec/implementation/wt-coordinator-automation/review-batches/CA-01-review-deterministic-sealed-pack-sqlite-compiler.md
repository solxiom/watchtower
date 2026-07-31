# Review Batch CA-01 — Deterministic sealed-pack SQLite compiler

## Synchronized batch execution matrix

- **Accepted-map title:** Deterministic sealed-pack SQLite compiler
- **Dependencies:** `DB-01`, `LC-02`, `LC-03`
- **Exclusive ownership/interface:** pack index foundation
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory batch proof:** Identical logical rows/semantic root; path/digest/FK checks; staged immutable publication; linear build
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-01-deterministic-sealed-pack-sqlite-compiler.md`
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-01-deterministic-sealed-pack-sqlite-compiler-review.md`
- **Correction report:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-01-deterministic-sealed-pack-sqlite-compiler-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ⏳ Awaiting independent review
Paired work: ../work-batches/CA-01-deterministic-sealed-pack-sqlite-compiler.md
Dependencies: DB-01, LC-02, LC-03

Read AGENTS.md; docs/development/engineering-and-review-standard.md; docs/spec/v1.md; docs/spec/v1-contracts.md; docs/spec/nirvana-integration-architecture.md; docs/spec/v1-implementation-map.md; docs/spec/implementation/planning-remediation-amendment.md; pack quality rules. Review the exact diff/source/artifacts/report, not implementer conclusions. Verify exclusive ownership: pack index foundation. Own PackIndexCompiler, focused pack-index SQLite writer and staged immutable publication. Depend directly on DB-01, LC-02 and LC-03; LC-05 is neither an input nor compiler authority.

Independently reproduce Identical logical rows/semantic root; path/digest/FK checks; staged immutable publication; linear build; negative/stale/corrupt/path/state/replay/concurrency/read-only/effect/relocation boundaries; Nirvana/NVB and API-gap evidence; public artifact synchronization; size/cohesion; build/test/dist; ownership/Git hygiene; and every mandatory engineering matrix row. Do not repair. Any failed gate rejects. Emit exactly one durable accept/reject/skip; only the reviewer may create the acceptance commit, separately from publication.


## Synchronized executable contract

This section is mandatory and batch-specific. It closes the accepted-map boundary without transferring adjacent ownership.

- Exact map title: **Deterministic sealed-pack SQLite compiler**
- Accepted dependencies: `DB-01`, `LC-02`, `LC-03`
- Exclusive owner: pack index foundation
- Required proof claim: Identical logical rows/semantic root; path/digest/FK checks; staged immutable publication; linear build
- Reasoning floor: implementer **R5**, independent reviewer **R5**; the reviewer may never use a weaker class.
- Exact review report: `.local/agent-reports/wt-coordinator-automation/reviews/CA-01-deterministic-sealed-pack-sqlite-compiler-review.md`
- Correction report pattern: `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-01-deterministic-sealed-pack-sqlite-compiler-correction-<NN>.md`

### Interface and failure-order contract

Before judgment, produce a source-backed ownership map naming the exact existing and proposed modules, public symbols, schema/help/task IDs, tests, and predecessor handoff interfaces inside **pack index foundation**. A generic helper, command-local algorithm, duplicated registry, shell workflow, or adjacent batch capability is a scope failure. External bytes and process output enter as `unknown`, validate into closed contracts, and receive stable reason codes.

The required order is: validate syntax and schema; resolve canonical identity and accepted predecessor versions; check authorization, claims, capabilities, and current-state fences; prepare a side-effect-free plan; acquire the specified lock only for the bounded effect; apply once through the accepted owner; verify durable output; then publish the durable event. Every failure before the commit point leaves authoritative bytes unchanged. Every uncertain or post-commit failure is verified from durable state before retry.

### Selected adversarial matrix

- malformed, missing, extra, and unsupported external values produce the exact typed reason code and never partially succeed;
- missing, stale, corrupt, or incompatible predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are exercised where the owned boundary touches files or installed bytes;

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

The exclusive owned interface set is **pack index foundation**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/reviews/CA-01-deterministic-sealed-pack-sqlite-compiler-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`DB-01`, `LC-02`, `LC-03`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Identical logical rows/semantic root; path/digest/FK checks; staged immutable publication; linear build**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **pack index foundation** and **Identical logical rows/semantic root; path/digest/FK checks; staged immutable publication; linear build**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-01-deterministic-sealed-pack-sqlite-compiler-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-coordinator-automation/reviews/CA-01-deterministic-sealed-pack-sqlite-compiler-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
