# Review Batch CA-17 — Session routing and budgets

Status: ⏳ Awaiting independent review
Paired work: ../work-batches/CA-17-session-routing-budgets-proposals-holds-and-amendments.md
Dependencies: CA-06, CA-08, CA-15, CA-16

Read AGENTS.md; docs/development/engineering-and-review-standard.md; docs/spec/v1.md; docs/spec/v1-contracts.md; docs/spec/nirvana-integration-architecture.md; docs/spec/v1-implementation-map.md; docs/spec/implementation/planning-remediation-amendment.md; pack quality rules. Review the exact diff/source/artifacts/report, not implementer conclusions. Verify exclusive ownership: turn classification, route selection, grants/reserves/accounting. Own turn classification, endpoint/account routing, finite grants, reserves and accounting only. Proposal confirmation/apply belongs CA-26; holds/amendments belong CA-27.

Independently reproduce M0/D1–D3; hard floors; finite grants; protected reserves; no proposal/effect authority; negative/stale/corrupt/path/state/replay/concurrency/read-only/effect/relocation boundaries; Nirvana/NVB and API-gap evidence; public artifact synchronization; size/cohesion; build/test/dist; ownership/Git hygiene; and every mandatory engineering matrix row. Do not repair. Any failed gate rejects. Emit exactly one durable accept/reject/skip; only the reviewer may create the acceptance commit, separately from publication.
