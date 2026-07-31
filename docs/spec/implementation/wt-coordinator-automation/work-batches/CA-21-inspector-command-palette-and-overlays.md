# Batch CA-21 — Inspector views, command palette, and overlays

Status: ❌ Pending
Depends on: CA-14, CA-17, CA-19, CA-26, CA-27

## Governing authority

Read in full: AGENTS.md; docs/development/engineering-and-review-standard.md; docs/spec/v1.md; docs/spec/v1-contracts.md; docs/spec/nirvana-integration-architecture.md; docs/spec/v1-implementation-map.md; docs/spec/implementation/planning-remediation-amendment.md; pack quality rules. Normative specs and the accepted map override this execution brief.

## Objective, exact boundary and interfaces

Exclusive map ownership: inspector/action/overlay components.

Own inspector/action/overlay UI over accepted read projections, CA-26 confirmation and CA-27 hold/amendment services. No direct effect or policy authority.

Expose closed typed contracts through the capability public barrel; name focused modules after the capability, keep commands/TaskHandlers thin, and inject all effectful/nondeterministic collaborators. External data enters as unknown and validates into JsonValue or a closed discriminated union.

## Required implementation and proof

1. Inspect accepted predecessor code/evidence and pinned Nirvana/Nira APIs. Report selected APIs and every proven NIRVANA_API_GAP.
2. Implement only the stated boundary with explicit invalid-state and failure ordering. Use the immutable packaged NVB catalog through LaneTaskRunner for substantial deterministic work and the sole EffectExecutor for mutation.
3. Add focused unit, integration, adversarial, stale/corrupt, replay/concurrency, read-only/atomic and relocation proof applicable to the boundary.
4. Synchronize owned contracts, help, schema, manifests, generated aggregates and normative docs.
5. Independently reproducible acceptance claim: All bounded inspector states; projection-only agent/allocation view; bounded search/attention; canonical action parity; confirmation, diagnostics, and details overlays.
6. Run focused tests plus nvb build/test and dist/relocation proof whenever runtime/package bytes change. Record exact output, size/cohesion inventory, engineering matrix, ownership and Git hygiene.

## Hard exclusions and handoff

No product logic in src/cli.ts; no participating-repository nvb.json edits; no broad any, trust-boundary cast/non-null assertion, mutable global registry, workflow shell, arbitrary task, hidden repair, full-pack/history fallback, duplicated policy or foreign batch authority. Implementers do not commit or issue verdicts. Emit durable handoff only after every gate passes.
