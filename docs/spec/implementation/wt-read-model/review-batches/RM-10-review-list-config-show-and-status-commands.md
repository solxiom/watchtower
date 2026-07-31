# Review Batch RM-10 — list and config show

Status: ⏳ Awaiting independent review
Paired work: ../work-batches/RM-10-list-config-show-and-status-commands.md
Dependencies: RM-02, RM-06–RM-08

Read AGENTS.md; docs/development/engineering-and-review-standard.md; docs/spec/v1.md; docs/spec/v1-contracts.md; docs/spec/nirvana-integration-architecture.md; docs/spec/v1-implementation-map.md; docs/spec/implementation/planning-remediation-amendment.md; pack quality rules. Review the exact diff/source/artifacts/report, not implementer conclusions. Verify exclusive ownership: commands, help, identity/config integration specs. Own ListCommand, ConfigCommand, their thin foundations/help/specs, redaction and identity/config projections. Status is excluded and owned by RM-12.

Independently reproduce Human/JSON parity; ambiguity behavior; redaction; read-only proof; negative/stale/corrupt/path/state/replay/concurrency/read-only/effect/relocation boundaries; Nirvana/NVB and API-gap evidence; public artifact synchronization; size/cohesion; build/test/dist; ownership/Git hygiene; and every mandatory engineering matrix row. Do not repair. Any failed gate rejects. Emit exactly one durable accept/reject/skip; only the reviewer may create the acceptance commit, separately from publication.
