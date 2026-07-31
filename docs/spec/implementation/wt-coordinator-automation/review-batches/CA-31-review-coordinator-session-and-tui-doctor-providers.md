# Review Batch CA-31 — Coordinator, session, and TUI doctor providers

Status: ⏳ Awaiting independent review
Paired work brief: `work-batches/CA-31-coordinator-session-and-tui-doctor-providers.md`
Depends on accepted evidence from: LC-07, CA-13, CA-16, CA-19–CA-23

## Governing references

- `AGENTS.md`
- `docs/development/engineering-and-review-standard.md`
- `docs/spec/v1-implementation-map.md`
- `docs/spec/v1.md` and `docs/spec/v1-contracts.md`
- `docs/spec/nirvana-integration-architecture.md`
- `docs/spec/implementation/planning-remediation-amendment.md`
- this pack's `implementation-quality-and-agent-rules.md`

## Independent proof and verdict

Review the real diff, source, tests, artifacts, and report. Verify exclusive
ownership of immutable injected diagnostic providers and independently prove: Coordinator/session/TUI checks; exact pass/warn/fail/skip; read-only; release only qualifies behavior. Test negative,
stale/corrupt, path/state/replay, read-only/effect, and relocation boundaries.
Reproduce Nirvana/NVB audits, public artifact synchronization, size/cohesion
evidence, focused tests, build/test/dist proof, Git hygiene, and the complete
engineering acceptance matrix.

Do not repair implementation. Any failed gate rejects. Emit exactly one
durable `accept`, `reject`, or `skip`; only the reviewer may create the
acceptance commit, separately from publication.
