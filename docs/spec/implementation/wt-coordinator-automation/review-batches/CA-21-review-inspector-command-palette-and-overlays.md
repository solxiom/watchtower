# Review Batch CA-21 — Inspector views, command palette, and overlays

Status: ⏳ Awaiting independent review
Paired work: ../work-batches/CA-21-inspector-command-palette-and-overlays.md
Dependencies: CA-14, CA-17, CA-19, CA-26, CA-27

Read AGENTS.md; docs/development/engineering-and-review-standard.md; docs/spec/v1.md; docs/spec/v1-contracts.md; docs/spec/nirvana-integration-architecture.md; docs/spec/v1-implementation-map.md; docs/spec/implementation/planning-remediation-amendment.md; pack quality rules. Review the exact diff/source/artifacts/report, not implementer conclusions. Verify exclusive ownership: inspector/action/overlay components. Own inspector/action/overlay UI over accepted read projections, CA-26 confirmation and CA-27 hold/amendment services. No direct effect or policy authority.

Independently reproduce All bounded inspector states; projection-only agent/allocation view; bounded search/attention; canonical action parity; confirmation, diagnostics, and details overlays; negative/stale/corrupt/path/state/replay/concurrency/read-only/effect/relocation boundaries; Nirvana/NVB and API-gap evidence; public artifact synchronization; size/cohesion; build/test/dist; ownership/Git hygiene; and every mandatory engineering matrix row. Do not repair. Any failed gate rejects. Emit exactly one durable accept/reject/skip; only the reviewer may create the acceptance commit, separately from publication.
