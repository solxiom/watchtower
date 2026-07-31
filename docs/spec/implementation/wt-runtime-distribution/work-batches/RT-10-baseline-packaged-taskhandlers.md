# Batch RT-10 — Baseline packaged TaskHandlers

## Synchronized batch execution matrix

- **Accepted-map title:** Baseline packaged TaskHandlers
- **Dependencies:** `RT-09`
- **Exclusive ownership/interface:** runtime validation/staging/smoke handlers only
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** Public TaskHandler API; schema-valid input/result/events; no product policy or future capability stubs
- **Implementation report:** `.local/agent-reports/wt-runtime-distribution/RT-10-baseline-packaged-taskhandlers.md`
- **Review report:** `.local/agent-reports/wt-runtime-distribution/reviews/RT-10-baseline-packaged-taskhandlers-review.md`
- **Correction report:** `.local/agent-reports/wt-runtime-distribution/reviews/corrections/RT-10-baseline-packaged-taskhandlers-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ❌ Pending
Depends on: RT-09

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

Implement only **Baseline packaged TaskHandlers**. This batch exclusively owns runtime validation/staging/smoke handlers only. It
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

**Implementation:** Files/interfaces: only baseline runtime validation, staging and smoke TaskHandlers through the public TaskHandler API. Validate closed inputs/results/events and reject unknown actions, path escape, unmanifested leafs and product-policy/future-capability stubs. Run handler contract fixtures plus the RT-07 relocated baseline smoke.

## Mandatory proof

- Public TaskHandler API; schema-valid input/result/events; no product policy or future capability stubs.
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

The exclusive owned interface set is **runtime validation/staging/smoke handlers only**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-runtime-distribution/RT-10-baseline-packaged-taskhandlers.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RT-09`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Public TaskHandler API; schema-valid input/result/events; no product policy or future capability stubs**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **runtime validation/staging/smoke handlers only** and **Public TaskHandler API; schema-valid input/result/events; no product policy or future capability stubs**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-runtime-distribution/RT-10-baseline-packaged-taskhandlers.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
