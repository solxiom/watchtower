# Review Batch LC-06 — Foreground watch command

Status: ⏳ Awaiting independent review
Paired work: ../work-batches/LC-06-foreground-watch-command.md
Dependencies: LC-09, RT-07

Read AGENTS.md; docs/development/engineering-and-review-standard.md; docs/spec/v1.md; docs/spec/v1-contracts.md; docs/spec/nirvana-integration-architecture.md; docs/spec/v1-implementation-map.md; docs/spec/implementation/planning-remediation-amendment.md; pack quality rules. Review the exact diff/source/artifacts/report, not implementer conclusions. Verify exclusive ownership: watch command/runtime adapter. Own WatchCommand and foreground exec/preflight integration. Consume the LC-09 activated index and RT-07 runtime; no daemon, repair or duplicate index logic.

Independently reproduce Preflight; exec behavior; stdout and Ctrl-C compatibility; no daemonization; negative/stale/corrupt/path/state/replay/concurrency/read-only/effect/relocation boundaries; Nirvana/NVB and API-gap evidence; public artifact synchronization; size/cohesion; build/test/dist; ownership/Git hygiene; and every mandatory engineering matrix row. Do not repair. Any failed gate rejects. Emit exactly one durable accept/reject/skip; only the reviewer may create the acceptance commit, separately from publication.
