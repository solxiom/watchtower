# Batch RM-13 — Deterministic JSON Schema composition

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
