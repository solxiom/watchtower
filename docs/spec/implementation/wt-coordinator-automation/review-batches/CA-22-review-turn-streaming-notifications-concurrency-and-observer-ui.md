# Review Batch CA-22 — Turn streaming, notifications, concurrency, and observer UI

Status: ⏳ Awaiting independent review
Paired work: ../work-batches/CA-22-turn-streaming-notifications-concurrency-and-observer-ui.md
Dependencies: CA-17, CA-20, CA-21, CA-26, CA-27

Read AGENTS.md; docs/development/engineering-and-review-standard.md; docs/spec/v1.md; docs/spec/v1-contracts.md; docs/spec/nirvana-integration-architecture.md; docs/spec/v1-implementation-map.md; docs/spec/implementation/planning-remediation-amendment.md; pack quality rules. Review the exact diff/source/artifacts/report, not implementer conclusions. Verify exclusive ownership: turn/event reducers and attachment controller. Own turn/event reducers and attachment controller: provisional validation, live edge, stale-confirmation invalidation, contention/wait, observer restrictions and bounded refresh.

Independently reproduce Provisional validation; live edge; stale confirmation invalidation; cross-attachment contention/wait; observer restrictions; priority-preserving coalesced refresh; negative/stale/corrupt/path/state/replay/concurrency/read-only/effect/relocation boundaries; Nirvana/NVB and API-gap evidence; public artifact synchronization; size/cohesion; build/test/dist; ownership/Git hygiene; and every mandatory engineering matrix row. Do not repair. Any failed gate rejects. Emit exactly one durable accept/reject/skip; only the reviewer may create the acceptance commit, separately from publication.
