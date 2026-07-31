# Batch CA-01 — Deterministic sealed-pack SQLite compiler

Status: ❌ Pending
Depends on: DB-01, LC-02, LC-03

## Governing authority

Read in full: AGENTS.md; docs/development/engineering-and-review-standard.md; docs/spec/v1.md; docs/spec/v1-contracts.md; docs/spec/nirvana-integration-architecture.md; docs/spec/v1-implementation-map.md; docs/spec/implementation/planning-remediation-amendment.md; pack quality rules. Normative specs and the accepted map override this execution brief.

## Objective, exact boundary and interfaces

Exclusive map ownership: pack index foundation.

Own PackIndexCompiler, focused pack-index SQLite writer and staged immutable publication. Depend directly on DB-01, LC-02 and LC-03; LC-05 is neither an input nor compiler authority.

Expose closed typed contracts through the capability public barrel; name focused modules after the capability, keep commands/TaskHandlers thin, and inject all effectful/nondeterministic collaborators. External data enters as unknown and validates into JsonValue or a closed discriminated union.

## Required implementation and proof

1. Inspect accepted predecessor code/evidence and pinned Nirvana/Nira APIs. Report selected APIs and every proven NIRVANA_API_GAP.
2. Implement only the stated boundary with explicit invalid-state and failure ordering. Use the immutable packaged NVB catalog through LaneTaskRunner for substantial deterministic work and the sole EffectExecutor for mutation.
3. Add focused unit, integration, adversarial, stale/corrupt, replay/concurrency, read-only/atomic and relocation proof applicable to the boundary.
4. Synchronize owned contracts, help, schema, manifests, generated aggregates and normative docs.
5. Independently reproducible acceptance claim: Identical logical rows/semantic root; path/digest/FK checks; staged immutable publication; linear build.
6. Run focused tests plus nvb build/test and dist/relocation proof whenever runtime/package bytes change. Record exact output, size/cohesion inventory, engineering matrix, ownership and Git hygiene.

## Hard exclusions and handoff

No product logic in src/cli.ts; no participating-repository nvb.json edits; no broad any, trust-boundary cast/non-null assertion, mutable global registry, workflow shell, arbitrary task, hidden repair, full-pack/history fallback, duplicated policy or foreign batch authority. Implementers do not commit or issue verdicts. Emit durable handoff only after every gate passes.
