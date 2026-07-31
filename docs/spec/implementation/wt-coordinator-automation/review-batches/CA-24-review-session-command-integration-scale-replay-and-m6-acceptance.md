# Review Batch CA-24 — Session command integration, specification-resolution proof, scale/replay, and M6 acceptance

Status: ⏳ Awaiting independent review
Paired work: ../work-batches/CA-24-session-command-integration-scale-replay-and-m6-acceptance.md
Dependencies: CA-14–CA-23, CA-25–CA-31

Read AGENTS.md; docs/development/engineering-and-review-standard.md; docs/spec/v1.md; docs/spec/v1-contracts.md; docs/spec/nirvana-integration-architecture.md; docs/spec/v1-implementation-map.md; docs/spec/implementation/planning-remediation-amendment.md; pack quality rules. Review the exact diff/source/artifacts/report, not implementer conclusions. Verify exclusive ownership: command/help integration and independent acceptance proof. Own session command/help integration and independent M6 acceptance, including the complete contradiction-to-resume fixture and 30-10k scale/replay proof. Consume CA-25 through CA-31; do not implement their capabilities.

Independently reproduce Full contradiction→advice→authority→re-seal→activation→explicit sync→same-session resume fixture; 30–10k pack scale; complete M6 gate; negative/stale/corrupt/path/state/replay/concurrency/read-only/effect/relocation boundaries; Nirvana/NVB and API-gap evidence; public artifact synchronization; size/cohesion; build/test/dist; ownership/Git hygiene; and every mandatory engineering matrix row. Do not repair. Any failed gate rejects. Emit exactly one durable accept/reject/skip; only the reviewer may create the acceptance commit, separately from publication.
