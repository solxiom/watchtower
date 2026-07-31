# Batch LC-05 — Coordinator and session policy baselines

Status: ❌ Pending
Depends on: LC-02, LC-03, RT-02

## Governing authority

Read in full: AGENTS.md; docs/development/engineering-and-review-standard.md; docs/spec/v1.md; docs/spec/v1-contracts.md; docs/spec/nirvana-integration-architecture.md; docs/spec/v1-implementation-map.md; docs/spec/implementation/planning-remediation-amendment.md; pack quality rules. Normative specs and the accepted map override this execution brief.

## Objective, exact boundary and interfaces

Exclusive map ownership: verified policy materialization and empty durable roots.

Own verified installed routing/session policy materialization and empty durable coordinator/session roots. Do not compile, write or define any pack index; CA-01 compiles and LC-09 activates it.

Expose closed typed contracts through the capability public barrel; name focused modules after the capability, keep commands/TaskHandlers thin, and inject all effectful/nondeterministic collaborators. External data enters as unknown and validates into JsonValue or a closed discriminated union.

## Required implementation and proof

1. Inspect accepted predecessor code/evidence and pinned Nirvana/Nira APIs. Report selected APIs and every proven NIRVANA_API_GAP.
2. Implement only the stated boundary with explicit invalid-state and failure ordering. Use the immutable packaged NVB catalog through LaneTaskRunner for substantial deterministic work and the sole EffectExecutor for mutation.
3. Add focused unit, integration, adversarial, stale/corrupt, replay/concurrency, read-only/atomic and relocation proof applicable to the boundary.
4. Synchronize owned contracts, help, schema, manifests, generated aggregates and normative docs.
5. Independently reproducible acceptance claim: Finite policies; installed-knowledge provenance; no Markdown restatement or model.
6. Run focused tests plus nvb build/test and dist/relocation proof whenever runtime/package bytes change. Record exact output, size/cohesion inventory, engineering matrix, ownership and Git hygiene.

## Hard exclusions and handoff

No product logic in src/cli.ts; no participating-repository nvb.json edits; no broad any, trust-boundary cast/non-null assertion, mutable global registry, workflow shell, arbitrary task, hidden repair, full-pack/history fallback, duplicated policy or foreign batch authority. Implementers do not commit or issue verdicts. Emit durable handoff only after every gate passes.
