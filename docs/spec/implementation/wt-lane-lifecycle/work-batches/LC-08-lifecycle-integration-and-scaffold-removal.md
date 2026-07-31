# Batch LC-08 — Lifecycle integration and scaffold removal

## Synchronized batch execution matrix

- **Accepted-map title:** Lifecycle integration and scaffold removal
- **Dependencies:** `LC-10`, `RM-10`, `RM-12`
- **Exclusive ownership/interface:** end-to-end specs, help registry
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory batch proof:** Init→status→watch/doctor fixture; rollback proof; remove all hello artifacts safely
- **Implementation report:** `.local/agent-reports/wt-lane-lifecycle/LC-08-lifecycle-integration-and-scaffold-removal.md`
- **Review report:** `.local/agent-reports/wt-lane-lifecycle/reviews/LC-08-lifecycle-integration-and-scaffold-removal-review.md`
- **Correction report:** `.local/agent-reports/wt-lane-lifecycle/reviews/corrections/LC-08-lifecycle-integration-and-scaffold-removal-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ❌ Pending
Depends on: LC-10, RM-10, RM-12

## Governing authority

Read in full: AGENTS.md; docs/development/engineering-and-review-standard.md; docs/spec/v1.md; docs/spec/v1-contracts.md; docs/spec/nirvana-integration-architecture.md; docs/spec/v1-implementation-map.md; docs/spec/implementation/planning-remediation-amendment.md; pack quality rules. Normative specs and the accepted map override this execution brief.

## Objective, exact boundary and interfaces

Exclusive map ownership: end-to-end specs, help registry.

Own lifecycle end-to-end fixtures, help integration and safe scaffold removal. Consume LC-10, RM-10 and RM-12; do not implement doctor providers or read commands.

Expose closed typed contracts through the capability public barrel; name focused modules after the capability, keep commands/TaskHandlers thin, and inject all effectful/nondeterministic collaborators. External data enters as unknown and validates into JsonValue or a closed discriminated union.

## Required implementation and proof

1. Inspect accepted predecessor code/evidence and pinned Nirvana/Nira APIs. Report selected APIs and every proven NIRVANA_API_GAP.
2. Implement only the stated boundary with explicit invalid-state and failure ordering. Use the immutable packaged NVB catalog through LaneTaskRunner for substantial deterministic work and the sole EffectExecutor for mutation.
3. Add focused unit, integration, adversarial, stale/corrupt, replay/concurrency, read-only/atomic and relocation proof applicable to the boundary.
4. Synchronize owned contracts, help, schema, manifests, generated aggregates and normative docs.
5. Independently reproducible acceptance claim: Init→status→watch/doctor fixture; rollback proof; remove all hello artifacts safely.
6. Run focused tests plus nvb build/test and dist/relocation proof whenever runtime/package bytes change. Record exact output, size/cohesion inventory, engineering matrix, ownership and Git hygiene.

## Hard exclusions and handoff

No product logic in src/cli.ts; no participating-repository nvb.json edits; no broad any, trust-boundary cast/non-null assertion, mutable global registry, workflow shell, arbitrary task, hidden repair, full-pack/history fallback, duplicated policy or foreign batch authority. Implementers do not commit or issue verdicts. Emit durable handoff only after every gate passes.


## Synchronized executable contract

This section is mandatory and batch-specific. It closes the accepted-map boundary without transferring adjacent ownership.

- Exact map title: **Lifecycle integration and scaffold removal**
- Accepted dependencies: `LC-10`, `RM-10`, `RM-12`
- Exclusive owner: end-to-end specs, help registry
- Required proof claim: Init→status→watch/doctor fixture; rollback proof; remove all hello artifacts safely
- Reasoning floor: implementer **R4**, independent reviewer **R4**; the reviewer may never use a weaker class.
- Exact implementation report: `.local/agent-reports/wt-lane-lifecycle/LC-08-lifecycle-integration-and-scaffold-removal.md`
- Correction report pattern: `.local/agent-reports/wt-lane-lifecycle/reviews/corrections/LC-08-lifecycle-integration-and-scaffold-removal-correction-<NN>.md`

### Interface and failure-order contract

Before editing, produce a source-backed ownership map naming the exact existing and proposed modules, public symbols, schema/help/task IDs, tests, and predecessor handoff interfaces inside **end-to-end specs, help registry**. A generic helper, command-local algorithm, duplicated registry, shell workflow, or adjacent batch capability is a scope failure. External bytes and process output enter as `unknown`, validate into closed contracts, and receive stable reason codes.

The required order is: validate syntax and schema; resolve canonical identity and accepted predecessor versions; check authorization, claims, capabilities, and current-state fences; prepare a side-effect-free plan; acquire the specified lock only for the bounded effect; apply once through the accepted owner; verify durable output; then publish the durable event. Every failure before the commit point leaves authoritative bytes unchanged. Every uncertain or post-commit failure is verified from durable state before retry.

### Selected adversarial matrix

- malformed, missing, extra, and unsupported external values produce the exact typed reason code and never partially succeed;
- missing, stale, corrupt, or incompatible predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are exercised where the owned boundary touches files or installed bytes;
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

Do not commit and do not issue a verdict. Update the pack tracker only to a truthful handoff/correction state, leave unrelated batches unchanged, and emit exactly one replay-safe handoff after every gate passes. On correction, retain the same batch lineage, address the numbered correction brief, rerun all impacted gates plus the original acceptance proof, and issue a fresh handoff.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **end-to-end specs, help registry**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-lane-lifecycle/LC-08-lifecycle-integration-and-scaffold-removal.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`LC-10`, `RM-10`, `RM-12`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Init→status→watch/doctor fixture; rollback proof; remove all hello artifacts safely**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **end-to-end specs, help registry** and **Init→status→watch/doctor fixture; rollback proof; remove all hello artifacts safely**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-lane-lifecycle/LC-08-lifecycle-integration-and-scaffold-removal.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
