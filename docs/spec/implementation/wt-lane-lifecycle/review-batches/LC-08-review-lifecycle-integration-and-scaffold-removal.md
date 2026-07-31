# Review Batch LC-08 — Lifecycle integration and scaffold removal

Status: ⏳ Awaiting independent review
Paired work: ../work-batches/LC-08-lifecycle-integration-and-scaffold-removal.md
Dependencies: LC-10, RM-10, RM-12

Read AGENTS.md; docs/development/engineering-and-review-standard.md; docs/spec/v1.md; docs/spec/v1-contracts.md; docs/spec/nirvana-integration-architecture.md; docs/spec/v1-implementation-map.md; docs/spec/implementation/planning-remediation-amendment.md; pack quality rules. Review the exact diff/source/artifacts/report, not implementer conclusions. Verify exclusive ownership: end-to-end specs, help registry. Own lifecycle end-to-end fixtures, help integration and safe scaffold removal. Consume LC-10, RM-10 and RM-12; do not implement doctor providers or read commands.

Independently reproduce Init→status→watch/doctor fixture; rollback proof; remove all hello artifacts safely; negative/stale/corrupt/path/state/replay/concurrency/read-only/effect/relocation boundaries; Nirvana/NVB and API-gap evidence; public artifact synchronization; size/cohesion; build/test/dist; ownership/Git hygiene; and every mandatory engineering matrix row. Do not repair. Any failed gate rejects. Emit exactly one durable accept/reject/skip; only the reviewer may create the acceptance commit, separately from publication.
