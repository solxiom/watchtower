# Batch RM-13 — Deterministic JSON Schema composition

## Synchronized batch execution matrix

- **Accepted-map title:** Deterministic JSON Schema composition
- **Dependencies:** `RM-01`
- **Exclusive ownership/interface:** schema fragments, composer, aggregate stale gate
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory batch proof:** Duplicate `$defs`, unresolved `$ref`, root-conflict rejection; byte-identical regeneration
- **Implementation report:** `.local/agent-reports/wt-read-model/RM-13-deterministic-json-schema-composition.md`
- **Review report:** `.local/agent-reports/wt-read-model/reviews/RM-13-deterministic-json-schema-composition-review.md`
- **Correction report:** `.local/agent-reports/wt-read-model/reviews/corrections/RM-13-deterministic-json-schema-composition-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ❌ Pending
Depends on: RM-01

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

Implement only **Deterministic JSON Schema composition**. This batch exclusively owns schema fragments, composer, aggregate stale gate. It
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

### Required interfaces and files

- Replace the hand-maintained aggregate at `docs/spec/schemas/v1.schema.json`
  with capability-owned fragments under `docs/spec/schemas/v1/`; fragments are
  authoritative and the aggregate is generated.
- Add a focused schema-composition handler under `runtime-nvb/handlers/` and a
  capability-owned runtime task fragment. The root `nvb.json` may only invoke
  the accepted parent-chain task and must not grow a second task registry.
- Expose one deterministic composer contract that accepts validated fragment
  bytes and returns canonical aggregate bytes plus a semantic digest. File IO
  and NVB orchestration stay outside the pure composition core.
- Reject duplicate `$defs`, unresolved or escaping `$ref` values, conflicting
  `$schema`/`$id`/root metadata, duplicate fragment identities, circular
  fragment inclusion, and stale checked-in aggregate bytes.
- Preserve every existing public definition and byte-stably order root keys,
  fragments, and `$defs`. Prove a second run is identical and `git diff` is
  empty after regeneration.

## Concrete interface and negative-case plan

**Implementation:** Files/interfaces: authoritative schema fragments, pure deterministic composer, focused NVB handler/task fragment and generated v1.schema.json aggregate. Reject duplicate definitions, unresolved or escaping references, root metadata conflict, circular inclusion and stale aggregate bytes. Regenerate twice, compare exact bytes/digest, parse JSON, validate every existing envelope fixture and prove an empty post-generation Git diff.

## Mandatory proof

- Duplicate $defs, unresolved $ref, root-conflict rejection; byte-identical regeneration.
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

The exclusive owned interface set is **schema fragments, composer, aggregate stale gate**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-read-model/RM-13-deterministic-json-schema-composition.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-01`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Duplicate `$defs`, unresolved `$ref`, root-conflict rejection; byte-identical regeneration**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **schema fragments, composer, aggregate stale gate** and **Duplicate `$defs`, unresolved `$ref`, root-conflict rejection; byte-identical regeneration**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-read-model/RM-13-deterministic-json-schema-composition.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
