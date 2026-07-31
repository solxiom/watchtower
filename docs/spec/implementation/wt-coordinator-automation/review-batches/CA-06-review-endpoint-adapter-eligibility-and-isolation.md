# Review Batch CA-06 — Provider-neutral endpoint eligibility and isolation core

Status: ⏳ Awaiting independent review
Paired work: ../work-batches/CA-06-endpoint-adapter-eligibility-and-isolation.md
Dependencies: RT-05, CA-05

Read AGENTS.md; docs/development/engineering-and-review-standard.md; docs/spec/v1.md; docs/spec/v1-contracts.md; docs/spec/nirvana-integration-architecture.md; docs/spec/v1-implementation-map.md; docs/spec/implementation/planning-remediation-amendment.md; pack quality rules. Review the exact diff/source/artifacts/report, not implementer conclusions. Verify exclusive ownership: provider-neutral contracts, eligibility, fingerprints, pools. Own only provider-neutral endpoint contracts, eligibility, fingerprints, isolation and shared-pool accounting. Concrete OpenCode/Hermes CLI mechanics belong to CA-28/CA-29.

Independently reproduce Unattended/advisory/skill-only classification; hard eligibility; drift invalidation/shared pools; no concrete CLI adapter; negative/stale/corrupt/path/state/replay/concurrency/read-only/effect/relocation boundaries; Nirvana/NVB and API-gap evidence; public artifact synchronization; size/cohesion; build/test/dist; ownership/Git hygiene; and every mandatory engineering matrix row. Do not repair. Any failed gate rejects. Emit exactly one durable accept/reject/skip; only the reviewer may create the acceptance commit, separately from publication.
