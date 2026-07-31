# Coordinator automation Roadmap

Status: **Synchronized remediation candidate**

| Wave | Batch | Capability | Depends on | Ownership |
|---:|---|---|---|---|
| 9 | CA-01 | Deterministic sealed-pack SQLite compiler | `DB-01`, `LC-02`, `LC-03` | pack index foundation |
| 10 | CA-02 | SQLite index stores and bounded typed queries | `CA-01` | index store/query foundation |
| 11 | CA-03 | Runtime SQLite indexes and projections | `RM-05`, `CA-02` | runtime index/projection foundation |
| 12 | CA-04 | Ready set and resource-claim projection | `RM-08`, `CA-01`, `CA-03` | scheduling projection |
| 13 | CA-05 | Ordered routing policy and capability floors | `CA-04`, `RT-02`, `LC-05` | routing foundation/verified lane-policy projection |
| 14 | CA-06 | Provider-neutral endpoint eligibility and isolation core | `RT-05`, `CA-05` | provider-neutral contracts, eligibility, fingerprints, pools |
| 15 | CA-07 | Immutable decision envelopes | `CA-02`–`CA-06` | envelope foundation |
| 16 | CA-08 | Context broker and cycle budgets | `CA-02`, `CA-06`, `CA-07` | broker/usage foundation |
| 17 | CA-09 | Typed proposals and current-state validator | `CA-05`, `CA-07`, `CA-08` | proposal contracts/validator |
| 18 | CA-10 | Atomic lane-local effect executor and invocation envelopes | `LC-03`, `CA-09` | effect foundation/NVB task boundary |
| 19 | CA-11 | Tmux prepare/attempt/verify effect handler | `RT-05`, `CA-10` | focused TaskHandler and tmux leaf |
| 19 | CA-12 | Acceptance and Git publication handler | `RM-08`, `CA-10` | focused TaskHandler and Git leaf/verification |
| 20 | CA-13 | Coordinator queue, cursor, replay, and watcher task integration | `CA-03`, `CA-05`, `CA-10`–`CA-12` | watcher/coordinator TaskHandlers |
| 21 | CA-14 | Read-only coordinator, index, event, and ready-set commands | `CA-01`–`CA-13` | commands/help/rendering |
| 12 | CA-15 | Operator-session persistence and lifecycle | `CA-03`, `UK-02` | session store/contracts |
| 13 | CA-16 | Session SQLite index, references, pins, and compaction | `CA-02`, `CA-15` | session memory foundation |
| 17 | CA-17 | Session routing and budgets | `CA-06`, `CA-08`, `CA-15`, `CA-16` | turn classification, route selection, grants/reserves/accounting |
| 23 | CA-18 | Accepted OpenTUI evidence promotion and packaging gate | `RT-03`, `RT-05`, `CA-14`–`CA-17`, `CA-25`, `CA-28`, `CA-29` | generic TUI adapter/architecture fixtures |
| 24 | CA-19 | TUI shell, responsive layout, themes, and focus | `CA-18` | TUI application shell/components |
| 25 | CA-20 | Conversation timeline, composer, history, and references | `CA-16`, `CA-19` | conversation/composer components |
| 25 | CA-21 | Inspector views, command palette, and overlays | `CA-14`, `CA-17`, `CA-19`, `CA-26`, `CA-27` | inspector/action/overlay components |
| 26 | CA-22 | Turn streaming, notifications, concurrency, and observer UI | `CA-17`, `CA-20`, `CA-21`, `CA-26`, `CA-27` | turn/event reducers and attachment controller |
| 27 | CA-23 | Accessibility, terminal lifecycle, recovery, and PTY matrix | `CA-18`–`CA-22` | accessibility/restoration/test adapters |
| 29 | CA-24 | Session command integration, specification-resolution proof, scale/replay, and M6 acceptance | `CA-14`–`CA-23`, `CA-25`–`CA-31` | command/help integration and independent acceptance proof |
| 22 | CA-25 | Cycle, escalation, and specification-resolution commands | `CA-13`, `CA-14`, `CA-17`, `CA-26`–`CA-29` | mutating command/help integration over accepted services |
| 19 | CA-26 | Session proposals, confirmation, revalidation, and apply | `CA-09`, `CA-10`, `CA-15`–`CA-17` | proposal lifecycle/effect bridge |
| 19 | CA-27 | Scoped holds, amendment requests, and amendment admission | `CA-09`, `CA-10`, `CA-15`–`CA-17` | hold/amendment services |
| 15 | CA-28 | OpenCode decision-endpoint adapter | `CA-06`, `RT-05` | focused OpenCode CLI adapter |
| 15 | CA-29 | Hermes decision-endpoint adapter | `CA-06`, `RT-05` | focused Hermes CLI adapter |
| 22 | CA-30 | Pack-index build and runtime-index rebuild command | `CA-01`, `CA-10`, `CA-13`, `CA-14`, `RT-05`, `RT-09` | public command/help, proposal/effect integration, allowlisted NVB task |
| 28 | CA-31 | Coordinator, session, and TUI doctor providers | `LC-07`, `CA-13`, `CA-16`, `CA-19`–`CA-23` | immutable injected diagnostic providers |

Only the implementation-map DAG controls readiness. ACCEPT_PACKS activates these contracts atomically; it does not accept product code.
