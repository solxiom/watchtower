# Review Batch CA-08 — Context broker and cycle budgets

Status: ⏳ Awaiting independent review
Paired work: ../work-batches/CA-08-context-broker-and-cycle-budgets.md
Dependencies: CA-02, CA-06, CA-07

Read AGENTS.md; docs/development/engineering-and-review-standard.md; docs/spec/v1.md; docs/spec/v1-contracts.md; docs/spec/nirvana-integration-architecture.md; docs/spec/v1-implementation-map.md; docs/spec/implementation/planning-remediation-amendment.md; pack quality rules. Review the exact diff/source/artifacts/report, not implementer conclusions. Verify exclusive ownership: broker/usage foundation. Own ContextBroker and cycle-budget accounting with BrokerResponse data typed as JsonValue/closed unions. No broad any, unbounded query or full-pack fallback.

Independently reproduce Allowlisted queries; provenance/redaction; soft/hard limits; endpoint telemetry quality and shared-pool accounting; negative/stale/corrupt/path/state/replay/concurrency/read-only/effect/relocation boundaries; Nirvana/NVB and API-gap evidence; public artifact synchronization; size/cohesion; build/test/dist; ownership/Git hygiene; and every mandatory engineering matrix row. Do not repair. Any failed gate rejects. Emit exactly one durable accept/reject/skip; only the reviewer may create the acceptance commit, separately from publication.
