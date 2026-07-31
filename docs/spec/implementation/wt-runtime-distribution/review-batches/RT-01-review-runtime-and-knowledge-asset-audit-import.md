# Review Batch RT-01 — Canonical runtime/knowledge audit and shell classification

Status: ⏳ Awaiting independent review
Paired work: ../work-batches/RT-01-runtime-and-knowledge-asset-audit-import.md
Dependencies: RM-01

Read AGENTS.md; docs/development/engineering-and-review-standard.md; docs/spec/v1.md; docs/spec/v1-contracts.md; docs/spec/nirvana-integration-architecture.md; docs/spec/v1-implementation-map.md; docs/spec/implementation/planning-remediation-amendment.md; pack quality rules. Review the exact diff/source/artifacts/report, not implementer conclusions. Verify exclusive ownership: runtime/, knowledge/, import record. Own the audited runtime/knowledge import inventory, source provenance and shell classification. Do not create manifests, catalogs or handlers.

Independently reproduce Source provenance; no omitted action/doc; every script classified as TaskHandler, leaf, temporary wrapper, or removal; negative/stale/corrupt/path/state/replay/concurrency/read-only/effect/relocation boundaries; Nirvana/NVB and API-gap evidence; public artifact synchronization; size/cohesion; build/test/dist; ownership/Git hygiene; and every mandatory engineering matrix row. Do not repair. Any failed gate rejects. Emit exactly one durable accept/reject/skip; only the reviewer may create the acceptance commit, separately from publication.
