# Review Batch CA-30 — Pack-index build and runtime-index rebuild command

## Synchronized batch execution matrix

- **Accepted-map title:** Pack-index build and runtime-index rebuild command
- **Dependencies:** `CA-01`, `CA-10`, `CA-13`, `CA-14`, `RT-05`, `RT-09`
- **Exclusive ownership/interface:** public command/help, proposal/effect integration, allowlisted NVB task
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory batch proof:** `index build [--runtime]`; dry-run purity; staged compile/rebuild; current-state validation; no command-local mutation
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-30-pack-index-build-and-runtime-index-rebuild-command.md`
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-30-pack-index-build-and-runtime-index-rebuild-command-review.md`
- **Correction report:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-30-pack-index-build-and-runtime-index-rebuild-command-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ⏳ Awaiting independent review
Paired work brief: `work-batches/CA-30-pack-index-build-and-runtime-index-rebuild-command.md`
Depends on accepted evidence from: CA-01, CA-10, CA-13, CA-14, RT-05, RT-09

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
ownership of public command/help, proposal/effect integration, allowlisted NVB task and independently prove: index build [--runtime]; dry-run purity; staged compile/rebuild; current-state validation; no command-local mutation. Test negative,
stale/corrupt, path/state/replay, read-only/effect, and relocation boundaries.
Reproduce Nirvana/NVB audits, public artifact synchronization, size/cohesion
evidence, focused tests, build/test/dist proof, Git hygiene, and the complete
engineering acceptance matrix.

Do not repair implementation. Any failed gate rejects. Emit exactly one
durable `accept`, `reject`, or `skip`; only the reviewer may create the
acceptance commit, separately from publication.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **public command/help, proposal/effect integration, allowlisted NVB task**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/reviews/CA-30-pack-index-build-and-runtime-index-rebuild-command-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`CA-01`, `CA-10`, `CA-13`, `CA-14`, `RT-05`, `RT-09`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **`index build [--runtime]`; dry-run purity; staged compile/rebuild; current-state validation; no command-local mutation**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **public command/help, proposal/effect integration, allowlisted NVB task** and **`index build [--runtime]`; dry-run purity; staged compile/rebuild; current-state validation; no command-local mutation**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-30-pack-index-build-and-runtime-index-rebuild-command-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-coordinator-automation/reviews/CA-30-pack-index-build-and-runtime-index-rebuild-command-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
