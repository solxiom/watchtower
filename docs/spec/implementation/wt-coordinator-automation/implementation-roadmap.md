# wt-coordinator-automation Implementation Roadmap

> **Repacked draft (2026-07-31).** CA-18 through CA-24 replace the historical
> monolithic attachment batch. Do not dispatch until independent pack review
> and sealing.

> **Draft pack-authoring artifact.** This document is not a seal, acceptance
> record, or authority to initialize a lane. Before pack acceptance, reconcile
> it with `docs/spec/v1-implementation-map.md`,
> `docs/development/engineering-and-review-standard.md`, and
> `docs/spec/nirvana-integration-architecture.md`. The normative precedence in
> `docs/spec/v1-contracts.md` governs every conflict.

All implementation/review work uses thin Nirvana command front doors,
capability-owned foundation modules, the immutable packaged NVB task catalog,
`LaneTaskRunner`, diagnostic-only Nirvana logging, appropriately bounded
Nirvana storage adapters, and manifest-declared shell leaves only. Project
`nvb.json` files, workflow-level shell, arbitrary task selection, relaxed module
limits, and acceptance-with-follow-up are forbidden.

Status: **Repacked draft — independent pack review and seal required**
Date: 2026-07-31
Pack: 5 of 6 — `wt-coordinator-automation`
Milestone: M6
Work/review pairs: 24

Parent documents:

- `docs/spec/v1.md` — product specification
- `docs/spec/v1-contracts.md` — contract closure
- `docs/spec/architecture.md` — architecture baseline
- `docs/spec/coordinator-automation.md` — normative coordinator spec
- `docs/spec/operator-session.md` — normative operator-session spec
- `docs/spec/cli-session.md` — normative terminal attachment spec
- `docs/spec/v1-implementation-map.md` — master construction plan §8, §10–14
- `docs/spec/implementation/wt-coordinator-automation/README.md` — pack README

## Mission

Implement the complete coordinator automation surface: zero-token mechanical
routing, bounded decision cycles, one effect authority, and durable bounded
operator sessions. This pack transforms the inherited coordinator shell runtime
into the definitive typed, validated, bounded Watchtower automation plane.

The delivery must guarantee:

- Deterministic seal-bound pack indexes compiled and verified without any model.
- SQLite index publication with corruption-safe typed bounded reads.
- Runtime SQLite indexes and projections with checkpoint/prefix-digest
  integrity and staged rebuild.
- Ready-set DAG projection with dependency/claim/capacity blockers, no arbitrary winner.
- Ordered routing policy with every v1 rule/guard at D1/C2, D2/C3, D3/C5 floors.
- Endpoint adapter eligibility proven before any unattended invocation.
- Immutable decision envelopes with stable semantic digests and untrusted-content delimiting.
- Context broker with allowlisted queries, provenance/redaction, and soft/hard limits.
- Typed proposals (all 11 types) with current-state validation and stale/illegal/invalid handling.
- One atomic lane-local effect executor with lock/revalidation/idempotency.
- Tmux prepare/attempt/verify TaskHandler plus cataloged leaf, with
  unknown-launch recovery and duplicate suppression.
- Git acceptance TaskHandler plus audited Nirvana Git API/leaf, with
  reviewer-session ownership and partial-push recovery.
- Coordinator queue, cursor, replay, and watcher TaskHandler integration with
  stable priority, fsynced advance, and no workflow-level shell.
- Coordinator command group with index/status/context/explain/cycle/escalate/events/ready.
- Durable operator-session persistence with many sessions per lane and crash-safe journals.
- Session indexes, references, pins, and compaction with bounded working sets.
- Session routing, budgets, proposals, holds, and amendments at M0/D1–D3.
- Qualified full-screen TUI plus CA-24 command integration, 30–10k scale,
  long-session replay, and bounded model context.

## Delivery Phases

### Phase 1: Index Foundation (Batches CA-01–CA-04)

Goal: establish all model-free pack index, journal, and scheduling projection
services before any decision routing or effect work begins.

Batches:

- CA-01 — Deterministic sealed-pack SQLite compiler
- CA-02 — SQLite index stores and bounded typed queries
- CA-03 — Runtime SQLite indexes and projections
- CA-04 — Ready set and resource-claim projection

Status: ❌ Not started

Acceptance snapshot (target):

- Identical logical rows and semantic root from the same sealed input; SQLite
  file bytes and page order are not semantic authority.
- Path/digest/cross-reference checks enforced.
- Linear build with intermediate verification.
- Direct bounded reads with limits/cursors/truncation.
- Stale/missing/corrupt store refusal with no partial-data fallback.
- Checkpoints/prefix digests with incremental append.
- Partial-tail/rebuild behavior for journal recovery.
- DAG/dependency/claim/capacity blockers computed deterministically.
- No arbitrary winner from tie-broken candidates.

### Phase 2: Routing and Decision Foundation (Batches CA-05–CA-09)

Goal: establish routing policy, endpoint eligibility, decision envelopes,
context brokering, and typed proposal validation.

Batches:

- CA-05 — Ordered routing policy and capability floors
- CA-06 — Endpoint adapter eligibility and isolation
- CA-07 — Immutable decision envelopes
- CA-08 — Context broker and cycle budgets
- CA-09 — Typed proposals and current-state validator

Status: ❌ Not started

Acceptance snapshot (target):

- Every v1 routing rule and guard with first-match determinism.
- D1/C2, D2/C3, D3/C5 capability floors enforced.
- Classification only; no execution by the router.
- Unattended/advisory/skill-only adapter classification.
- Argv/env/cwd/output/time bounds proven before any unattended invocation.
- Immutable decision envelopes with stable semantic digests.
- Bounded default context with untrusted-content delimiting.
- Allowlisted context-broker queries with provenance/redaction.
- Soft/hard limits on input/output/broker/wall-clock per class.
- All 11 proposal types with permitted origin/class/effect matrices.
- Stale/illegal/invalid proposal handling.

### Phase 3: Effect Foundation (Batches CA-10–CA-13)

Goal: establish the sole effect authority, tmux and Git adapters, and
coordinator queue with replay/watcher integration.

Batches:

- CA-10 — Atomic lane-local effect executor
- CA-11 — Tmux prepare/attempt/verify effect adapter
- CA-12 — Acceptance and Git publication adapter
- CA-13 — Coordinator queue, cursor, replay, and watcher integration

Status: ❌ Not started

Acceptance snapshot (target):

- One authority for effects with lock/revalidation/idempotency.
- All-or-nothing projections and journals.
- Unknown launch recovery with duplicate suppression for tmux.
- No arbitrary tmux kill/shell from effect adapters.
- Reviewer-session ownership for acceptance verification.
- Commit-set validation and partial push recovery for Git.
- Stable priority ordering for coordinator queue.
- Fsynced cursor advance.
- Interrupted/duplicate/uncertain replay handling.

### Phase 4: Commands and Operator-Session Services (Batches CA-14–CA-17)

Goal: deliver the coordinator and session command groups, durable operator
sessions, bounded session memory, and accepted services for a later TUI.

Batches:

- CA-14 — Coordinator, event, and ready-set commands
- CA-15 — Operator-session persistence and lifecycle
- CA-16 — Session indexes, references, pins, and compaction
- CA-17 — Session routing, budgets, proposals, holds, and amendments

Status: ❌ Not started

Acceptance snapshot (target):

- Index/status/context/explain/cycle/escalate/events/ready commands.
- Dry-run purity — no mutation on preview.
- Many sessions per lane with one active turn each.
- Immutable closed history and crash-safe session journals.
- Bounded working sets with same-lane capsule references.
- No transitive or full-history fallback for session context.
- M0/D1–D3 routing for operator sessions.
- Finite budget grants within lane-wide limits and protected reserves.
- Confirmation/revalidation before effect application.
- Scoped hold interleaving without blocking unrelated automation.
- Bounded service and query interfaces ready for TUI composition.

### Phase 5: Full-Screen TUI Delivery (Batches CA-18–CA-23)

Batches:

- CA-18 — Nirvana/OpenTUI feasibility and packaging gate
- CA-19 — TUI shell, responsive layout, themes, and focus
- CA-20 — Conversation timeline, composer, history, and references
- CA-21 — Inspector views, command palette, and overlays
- CA-22 — Turn streaming, notifications, concurrency, and observer UI
- CA-23 — Accessibility, terminal lifecycle, recovery, and PTY matrix

Status: ❌ Not started

Acceptance snapshot (target):

- Framework-free OpenTUI passes Node/Nirvana/native qualification.
- Responsive shell, bounded conversation/input, nine model-free inspector
  views, shared actions/confirmation, and ordered bounded live updates.
- Terminal restoration, security, accessibility, and PTY matrix accepted.

### Phase 6: Pack Acceptance (Batch CA-24)

M6 acceptance is gated on CA-24 proving:

- Routine coordination invokes no model when preauthorized.
- Judgment is bounded and capability-matched.
- All effects pass through one validated executor.
- Operators have durable bounded sessions without mutation authority.
- Unrelated pack/session growth does not increase ordinary model context.
- Advisory turns never hold the lane lock.
- Session/ask commands and help match accepted services/TUI.
- 30–10k pack and long-session replay/soak remain bounded.

## Sequencing Rule

- CA-01 → CA-02 → CA-03 → CA-04: index foundation must accept in order.
- CA-05 depends on CA-04 and RT-02; CA-06 depends on RT-05 and CA-05.
- CA-07 depends on CA-02 through CA-06.
- CA-08 depends on CA-02, CA-06, and CA-07.
- CA-09 depends on CA-05, CA-07, and CA-08.
- CA-10 depends on LC-03 and CA-09.
- CA-11 depends on RT-05 and CA-10.
- CA-12 depends on RM-08 and CA-10.
- CA-13 depends on CA-03, CA-05, and CA-10 through CA-12.
- CA-14 depends on CA-01 through CA-13.
- CA-15 depends on CA-03 and UK-02.
- CA-16 depends on CA-02 and CA-15.
- CA-17 depends on CA-06, CA-08 through CA-10, CA-15, and CA-16.
- CA-18 depends on RT-03, RT-05, and CA-14 through CA-17.
- CA-19 depends on CA-18 `PASS`.
- CA-20 depends on CA-16/CA-19; CA-21 on CA-14/CA-17/CA-19.
- CA-22 depends on CA-17/CA-20/CA-21.
- CA-23 depends on CA-18 through CA-22.
- CA-24 depends on CA-14 through CA-23.

No routing batch may begin before the index foundation gate is accepted.
No effect batch may begin before the proposal validator is accepted.
No session attachment may begin before all session services are accepted.

## Recommended Honest Execution Order

1. Compile deterministic sealed-pack index with seal verification (CA-01)
2. Publish typed SQLite index stores with bounded queries and stale/corrupt
   refusal (CA-02)
3. Build journal indexes and projections with checkpoint integrity (CA-03)
4. Project ready set and resource claims from DAG data (CA-04)
5. Implement ordered routing policy and capability floors (CA-05)
6. Prove endpoint adapter eligibility and isolation (CA-06)
7. Build immutable decision envelopes with stable digests (CA-07)
8. Develop context broker with cycle budgets (CA-08)
9. Implement typed proposals and current-state validator (CA-09)
10. Deliver the atomic lane-local effect executor (CA-10)
11. Build the tmux prepare/attempt/verify adapter (CA-11)
12. Build the Git acceptance and publication adapter (CA-12)
13. Implement coordinator queue, cursor, replay, and watcher integration (CA-13)
14. Build coordinator, event, and ready-set commands (CA-14)
15. Establish operator-session persistence and lifecycle (CA-15)
16. Build session indexes, references, pins, and compaction (CA-16)
17. Implement session routing, budgets, proposals, holds, and amendments (CA-17)
18. Qualify Nirvana/OpenTUI, FFI bootstrap, and native packaging (CA-18)
19. Build the responsive shell, themes, focus, and keymap (CA-19)
20. Build bounded conversation, composer, history, and references (CA-20)
21. Build bounded inspector views, palette, and overlays (CA-21)
22. Integrate streaming, notifications, contention, and observers (CA-22)
23. Qualify accessibility, restoration, security, and PTY matrix (CA-23)
24. Integrate commands and independently prove scale/replay/M6 (CA-24)

## Parallel Development Options

- CA-15 (session persistence) may begin after CA-03 and UK-02 accept,
  in parallel with CA-04 through CA-14 work.
- CA-16 may begin after CA-02 and CA-15 accept.
- CA-17 may begin after its dependencies accept (CA-06, CA-08–CA-10, CA-15, CA-16).
- CA-14 and CA-15–CA-17 may be developed against accepted service fixtures.
- CA-20 and CA-21 may run in parallel after CA-19 and their dependencies.
- CA-18 gates every product TUI batch; CA-24 is the sole M6 exit.

## Rejected Shortcuts

This roadmap rejects:

- Implementing any effect batch before the proposal validator is accepted.
- Allowing coordinator agents direct state or filesystem mutation authority.
- Falling back to full-pack scanning when an index is unavailable.
- Using model for any M0 operation.
- Combining semantic acceptance and multi-repository publication.
- Treating tmux scrollback prose as authoritative lifecycle protocol.
- Allowing operator sessions to hold the lane mutation lock.
- Letting session advice change lane state without separate confirmation/revalidation.
- Using a cheap model to decide which more expensive model should answer a question.
- Loading full session history or full pack content into any model context.
- Deferring pack-scale proof (CA-24 M6 gate) to a later pack or release phase.

## Durable Artifact Rules

- Implementation reports go under `.local/agent-reports/coordinator-automation/`.
- Review reports go under `.local/agent-reports/coordinator-automation/reviews/`.
- Correction briefs go under `review-batches/corrections/`.
- `.local/` artifacts are never staged or committed.

## Completion Meaning

This pack is not complete when code merely exists. Completion means:

- Every coordinator cycle uses a verified pack index matching the active seal.
- Routine context remains bounded as unrelated pack size grows.
- Stale/missing indexes block safely without full-pack scanning.
- Every routing rule and guard is enforced deterministically.
- Every decision proposal type is validated before any effect may proceed.
- All effects pass through exactly one validated, idempotent executor.
- External effects (tmux, Git) use prepare/attempt/verify journals.
- Interrupted/duplicate cycles recover idempotently.
- Operators can conduct multiple bounded multi-turn sessions.
- Session continuity derives from local journal/index state, not provider sessions.
- Terminal attachments create, attach, detach, and observe without becoming memory or effect authority.
- Cross-session references and status output remain bounded as session count grows.
- Advisory sessions continue alongside automation unless an explicit scoped hold applies.
- 30–10k pack scale and long-lane replay are independently reproducible.
