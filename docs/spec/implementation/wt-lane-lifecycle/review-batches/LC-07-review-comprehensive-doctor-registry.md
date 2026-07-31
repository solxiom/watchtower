# Review Batch LC-07 — Doctor kernel and lane-local checks

Status: ⏳ Awaiting independent review
Paired work: ../work-batches/LC-07-comprehensive-doctor-registry.md
Dependencies: LC-04, LC-05, RM-09

Read AGENTS.md; docs/development/engineering-and-review-standard.md; docs/spec/v1.md; docs/spec/v1-contracts.md; docs/spec/nirvana-integration-architecture.md; docs/spec/v1-implementation-map.md; docs/spec/implementation/planning-remediation-amendment.md; pack quality rules. Review the exact diff/source/artifacts/report, not implementer conclusions. Verify exclusive ownership: immutable check composition, command/help, lane checks. Own DoctorKernel, DoctorCommand/help and immutable injected lane-local providers for marker/config/binding/permission/Git-ignore checks. No mutable/global/module-load registry and no runtime/account/watcher/index/coordinator/session/TUI providers.

Independently reproduce Pass/warn/fail/skip; marker/config/binding/permission/Git-ignore checks; read-only; negative/stale/corrupt/path/state/replay/concurrency/read-only/effect/relocation boundaries; Nirvana/NVB and API-gap evidence; public artifact synchronization; size/cohesion; build/test/dist; ownership/Git hygiene; and every mandatory engineering matrix row. Do not repair. Any failed gate rejects. Emit exactly one durable accept/reject/skip; only the reviewer may create the acceptance commit, separately from publication.
