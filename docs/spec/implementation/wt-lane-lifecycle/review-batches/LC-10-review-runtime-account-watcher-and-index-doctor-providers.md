# Review Batch LC-10 — Runtime, account, watcher, and index doctor providers

## Synchronized batch execution matrix

- **Accepted-map title:** Runtime, account, watcher, and index doctor providers
- **Dependencies:** `LC-06`, `LC-07`, `LC-09`, `RT-07`
- **Exclusive ownership/interface:** injected diagnostic providers and integration
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory batch proof:** Tool/account/runtime/index checks; exact pass/fail/skip; no global registry or repair
- **Implementation report:** `.local/agent-reports/wt-lane-lifecycle/LC-10-runtime-account-watcher-and-index-doctor-providers.md`
- **Review report:** `.local/agent-reports/wt-lane-lifecycle/reviews/LC-10-runtime-account-watcher-and-index-doctor-providers-review.md`
- **Correction report:** `.local/agent-reports/wt-lane-lifecycle/reviews/corrections/LC-10-runtime-account-watcher-and-index-doctor-providers-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ⏳ Awaiting independent review
Paired work brief: `work-batches/LC-10-runtime-account-watcher-and-index-doctor-providers.md`
Depends on accepted evidence from: LC-06, LC-07, LC-09, RT-07

## Governing references

- `AGENTS.md`
- `docs/development/engineering-and-review-standard.md`
- `docs/spec/v1-implementation-map.md`
- `docs/spec/v1.md` and `docs/spec/v1-contracts.md`
- `docs/spec/nirvana-integration-architecture.md`
- `docs/spec/implementation/planning-remediation-amendment.md`
- this pack's `implementation-quality-and-agent-rules.md`

## Independent proof and verdict

Review the real diff, source, tests, artifacts, and report. Verify exclusive
ownership of injected diagnostic providers and integration and independently prove: Tool/account/runtime/index checks; exact pass/fail/skip; no global registry or repair. Test negative,
stale/corrupt, path/state/replay, read-only/effect, and relocation boundaries.
Reproduce Nirvana/NVB audits, public artifact synchronization, size/cohesion
evidence, focused tests, build/test/dist proof, Git hygiene, and the complete
engineering acceptance matrix.

Do not repair implementation. Any failed gate rejects. Emit exactly one
durable `accept`, `reject`, or `skip`; only the reviewer may create the
acceptance commit, separately from publication.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **injected diagnostic providers and integration**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-lane-lifecycle/reviews/LC-10-runtime-account-watcher-and-index-doctor-providers-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`LC-06`, `LC-07`, `LC-09`, `RT-07`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Tool/account/runtime/index checks; exact pass/fail/skip; no global registry or repair**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **injected diagnostic providers and integration** and **Tool/account/runtime/index checks; exact pass/fail/skip; no global registry or repair**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-lane-lifecycle/reviews/corrections/LC-10-runtime-account-watcher-and-index-doctor-providers-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-lane-lifecycle/reviews/LC-10-runtime-account-watcher-and-index-doctor-providers-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
