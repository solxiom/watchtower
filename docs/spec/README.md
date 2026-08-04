# Watchtower specification

Normative product docs for the `wt` CLI.

| Document | Status | Description |
|----------|--------|-------------|
| [v1-contracts.md](v1-contracts.md) | Proposed | Normative implementation-ready closure, precedence, schemas, defaults, and recovery rules |
| [schemas/v1.schema.json](schemas/v1.schema.json) | Proposed | Machine-readable v1 public contract bundle |
| [v1.md](v1.md) | Proposed | Normative v1 product and CLI contract |
| [architecture.md](architecture.md) | Proposed | Product boundary, domain model, components, safety, and evolution |
| [nirvana-integration-architecture.md](nirvana-integration-architecture.md) | Proposed | Normative Nirvana facade, packaged NVB task-runtime, lane-profile, and shell-leaf architecture |
| [foundation-module-architecture.md](foundation-module-architecture.md) | Accepted | Foundation module layout, domain barrels, dependency layers, and public surfaces |
| [roadmap.md](roadmap.md) | Planning | Milestones, implementation packs, release gates, and post-v1 horizons |
| [v1-implementation-map.md](v1-implementation-map.md) | Proposed | Master 59-batch construction, dependency, ownership, and proof map |
| [pack-design-draft.md](pack-design-draft.md) | Draft | Canonical accepted-spec to implementation-pack process |
| [allocation-planning-draft.md](allocation-planning-draft.md) | Draft | CLI/plan/model discovery plus quality-first implementation capacity allocation |
| [coordinator-automation.md](coordinator-automation.md) | Proposed | Normative v1 pack indexing, bounded decision cycles, zero-token routing, and validated effects |
| [operator-session.md](operator-session.md) | Proposed | Normative v1 bounded multi-turn operator session and confirmed-effect boundary |
| [cli-session.md](cli-session.md) | Proposed | Normative v1 full-screen operator-session TUI, right inspector, interaction, rendering, streaming, and accessibility |
| [tui-operational-experience.md](tui-operational-experience.md) | Proposed | Normative v1 TUI support matrix, entry selection, failures, recovery, conflicts, diagnostics, search, upgrades, and visual acceptance |
| [experiments/opentui-nirvana-smoke/](experiments/opentui-nirvana-smoke/) | Experiment | Disposable pre-lane Nirvana/NVB/OpenTUI/FFI distribution smoke and independent review |
| [discussions/lane-directory-path.md](discussions/lane-directory-path.md) | Resolved | `.watchtower/lanes/<slug>/` execution-overlay decision |
| [discussions/impl-pack-location.md](discussions/impl-pack-location.md) | Resolved | Committed design pack plus local execution-overlay decision |
| [discussions/coordinator-cost-and-automation.md](discussions/coordinator-cost-and-automation.md) | Resolved | Coordinator cost, context, tiering, and automation proposal with corrections |
| [discussions/operator-coordinator-conversation.md](discussions/operator-coordinator-conversation.md) | Resolved | Human/coordinator conversation continuity, budget, UX, and concurrency proposal |
| [discussions/cli-session-ux.md](discussions/cli-session-ux.md) | Resolved | Interactive operator-session UX proposal and adopted attachment model |
| [discussions/operator-session-gaps.md](discussions/operator-session-gaps.md) | Resolved | Session/parser/policy/UX gap audit accepted with safety and boundedness corrections |

## Conventions

- **Draft** — design intent; implementation may lag
- **Proposed** — ready for implementation; API may still change
- **Stable** — implemented and covered by specs

When implementation changes behavior, update the spec in the same change set.

For v1 precedence and the precise meaning of implementation-ready, see
[v1-contracts.md §1](v1-contracts.md#1-normative-precedence-and-release-boundary).
Future-feature drafts are not normative for the v1 implementation lifecycle.
