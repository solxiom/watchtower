# Batch LC-10 — Runtime, account, watcher, and index doctor providers

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

Status: ❌ Pending
Depends on: LC-06, LC-07, LC-09, RT-07

## Governing references

- `AGENTS.md`
- `docs/development/engineering-and-review-standard.md`
- `docs/spec/v1-implementation-map.md`
- `docs/spec/v1.md` and `docs/spec/v1-contracts.md`
- `docs/spec/nirvana-integration-architecture.md`
- `docs/spec/implementation/planning-remediation-amendment.md`
- this pack's `implementation-quality-and-agent-rules.md`

The accepted map and normative specifications override illustrative names in
this brief. Stop for specification resolution if they leave a decision open.

## Objective and ownership

Implement only **Runtime, account, watcher, and index doctor providers**. This batch exclusively owns injected diagnostic providers and integration. It
consumes accepted predecessors without absorbing adjacent capabilities.

## Required work

1. Inspect predecessor artifacts and pinned Nirvana/Nira APIs; report the
   Nirvana audit and every proven `NIRVANA_API_GAP`.
2. Define closed typed inputs, outputs, reason codes, and failure ordering.
   External values enter as `unknown`; unchecked casts, non-null assertions,
   broad `any`, mutable globals, and service locators are forbidden.
3. Use focused foundation owners and thin command/TaskHandler fronts. Route
   substantial deterministic workflows through the immutable NVB catalog and
   `LaneTaskRunner`; retain the single validated effect boundary.
4. Add unit, integration, adversarial, stale/corrupt, read-only, replay, and
   relocation proof applicable to this capability.
5. Synchronize owned contracts, help, schemas, manifests, aggregates, and docs.

## Concrete interface and negative-case plan

**Implementation:** Files/interfaces: immutable injected runtime, account, watcher and index DoctorCheck providers composed through LC-07. Define exact pass/warn/fail/skip outcomes for tool missing/incompatible, account inaccessible, runtime missing/corrupt, watcher absent/stale and index missing/stale/corrupt. Prove no global registration, repair, rebuild or write; coordinator/session/TUI providers remain CA-31.

## Mandatory proof

- Tool/account/runtime/index checks; exact pass/fail/skip; no global registry or repair.
- Reproduce size/responsibility evidence and the complete engineering matrix.
- Run focused tests plus `nvb build`, `nvb test`, and dist/relocation proof
  when runtime or package bytes change.
- Report exact commands, outcomes, changed-file ownership, and Git hygiene.

## Exclusions and handoff

No product logic in `src/cli.ts`; no participating-repository `nvb.json`
change; no arbitrary task, workflow shell, hidden repair, policy duplication,
or command-local mutation. The implementer does not commit or issue a verdict.
Emit a durable handoff only after every proof passes.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **injected diagnostic providers and integration**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-lane-lifecycle/LC-10-runtime-account-watcher-and-index-doctor-providers.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`LC-06`, `LC-07`, `LC-09`, `RT-07`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Tool/account/runtime/index checks; exact pass/fail/skip; no global registry or repair**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **injected diagnostic providers and integration** and **Tool/account/runtime/index checks; exact pass/fail/skip; no global registry or repair**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-lane-lifecycle/LC-10-runtime-account-watcher-and-index-doctor-providers.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
