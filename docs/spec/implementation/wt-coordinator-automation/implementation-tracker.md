# Coordinator automation Tracker

Status: **Synchronized remediation candidate**

| Batch | Capability | State | Acceptance proof |
|---|---|---|---|
| CA-01 | Deterministic sealed-pack SQLite compiler | ✅ Accepted | Identical logical rows/semantic root; path/digest/FK checks; staged immutable publication; linear build |
| CA-02 | SQLite index stores and bounded typed queries | ✅ Accepted | Indexed bounded reads; limits/cursors/truncation; no direct SQL; stale/missing/corrupt block |
| CA-03 | Runtime SQLite indexes and projections | ✅ Accepted | Journal checkpoints; single writer/WAL readers; incremental append; corruption and staged rebuild |
| CA-04 | Ready set and resource-claim projection | ✅ Accepted | DAG/dependency/claim/capacity blockers; no arbitrary winner |
| CA-05 | Ordered routing policy and capability floors | ✅ Accepted | Every v1 rule/guard; first-match determinism; installed-policy provenance; normative contradiction after safety as D3/C5; economics only after hard eligibility; correction `e10def56` independently re-reviewed |
| CA-06 | Provider-neutral endpoint eligibility and isolation core | ✅ Accepted | Unattended/advisory/skill-only classification; hard eligibility; drift invalidation/shared pools; no concrete CLI adapter |
| CA-07 | Immutable decision envelopes | ✅ Accepted | Stable semantic digest; bounded default context; contradiction/advisor evidence references and impact scope; untrusted-content delimiting |
| CA-08 | Context broker and cycle budgets | ✅ Accepted | Allowlisted queries; provenance/redaction; soft/hard limits; endpoint telemetry quality and shared-pool accounting |
| CA-09 | Typed proposals and current-state validator | ✅ Accepted | All 14 proposal types; specification-resolution authority/seal/independence checks; stale/illegal/invalid cases; correction-08 operator-session identity binding |
| CA-10 | Atomic lane-local effect executor and invocation envelopes | ✅ Accepted | One authority; lock/revalidation/idempotency; atomic pack-revision activation and same-session resume; no automatic Git sync |
| CA-11 | Tmux prepare/attempt/verify effect handler | ✅ Accepted | Unknown launch recovery; duplicate suppression; no arbitrary task/kill/shell |
| CA-12 | Acceptance and Git publication handler | ✅ Accepted | Reviewer-session ownership; commit-set validation; partial push recovery; Nirvana Git API audit |
| CA-13 | Coordinator queue, cursor, replay, and watcher task integration | ❌ Pending | Stable priority; impact-scoped blocker with unrelated progress; activation invalidation; interrupted/duplicate/uncertain replay |
| CA-14 | Read-only coordinator, index, event, and ready-set commands | ❌ Pending | Index status/verify/explain, coordinator status/context/explain, events, ready; read-only purity |
| CA-15 | Operator-session persistence and lifecycle | ✅ Accepted | Many sessions; one active turn each; immutable closed history; crash-safe journals |
| CA-16 | Session SQLite index, references, pins, and compaction | 🔒 DESIGN-ONLY/FROZEN | Original design entry; implementation acceptance is published only under the explicit CA-16R successor |
| CA-16R | Session SQLite index, references, pins, and compaction — successor publication | ✅ Accepted | Bounded metadata/excerpts; exact text remains journal-owned; same-lane capsules; no full-history fallback; R1-R8, C1-C10, and SA-CA16R-04 reviewer evidence |
| CA-17 | Session routing and budgets | ✅ Accepted | M0/D1–D3; hard floors; finite grants; protected reserves; no proposal/effect authority; correction-01 independently verified |
| CA-18 | Accepted OpenTUI evidence promotion and packaging gate | ❌ Pending | Revalidate TUI-EXP-01 against current exact package/target; no renderer reselection or repeated disposable experiment |
| CA-19 | TUI shell, responsive layout, themes, and focus | ❌ Pending | Wide right inspector shell; model-free lane entry; P0–P5 attention; standard/narrow layouts; resize; focus/keymap; themes; transactional preferences; bounded animation |
| CA-20 | Conversation timeline, composer, history, and references | ❌ Pending | Virtualized paging; multiline input; bounded draft recovery; paste; completion; index-bounded timeline search/reference pickers; scroll anchoring |
| CA-21 | Inspector views, command palette, and overlays | ❌ Pending | All bounded inspector states; projection-only agent/allocation view; bounded search/attention; canonical action parity; confirmation, diagnostics, and details overlays |
| CA-22 | Turn streaming, notifications, concurrency, and observer UI | ❌ Pending | Provisional validation; live edge; stale confirmation invalidation; cross-attachment contention/wait; observer restrictions; priority-preserving coalesced refresh |
| CA-23 | Accessibility, terminal lifecycle, recovery, and PTY matrix | ❌ Pending | Exact promoted matrix; no-color/high-contrast/reduced motion; signals/suspend/crash restore; preference/cache migration; semantic visual catalog; emulator/Unicode/resize fixtures |
| CA-24 | Session command integration, specification-resolution proof, scale/replay, and M6 acceptance | ❌ Pending | Full contradiction→advice→authority→re-seal→activation→explicit sync→same-session resume fixture; 30–10k pack scale; complete M6 gate |
| CA-25 | Cycle, escalation, and specification-resolution commands | ❌ Pending | Cycle/escalate/resolution dry-run purity; normal validator/executor only; no command-local authority |
| CA-26 | Session proposals, confirmation, revalidation, and apply | ❌ Pending | Explicit confirmation; current-state validation; stale/illegal refusal; sole executor handoff |
| CA-27 | Scoped holds, amendment requests, and amendment admission | ❌ Pending | Impact-scoped expiry/interleaving; authority/independence/seal checks; no implicit pack edit |
| CA-28 | OpenCode decision-endpoint adapter | ✅ Accepted | Required unattended conformance; bounded argv/env/cwd/result; fresh catalog/model fingerprint; correction-09 independent review |
| CA-29 | Hermes decision-endpoint adapter | ✅ Accepted | Same conformance when installed; explicit healthy `not-installed` outcome |
| CA-30 | Pack-index build and runtime-index rebuild command | ❌ Pending | `index build [--runtime]`; dry-run purity; staged compile/rebuild; current-state validation; no command-local mutation |
| CA-31 | Coordinator, session, and TUI doctor providers | ❌ Pending | Coordinator/session/TUI checks; exact pass/warn/fail/skip; read-only; release only qualifies behavior |

RM-02 has no pending human dependency-source decision. It resumes in its preserved lineage only after ACCEPT_PACKS activation, accepted RM-13 and RT-08, and explicit worktree synchronization.
