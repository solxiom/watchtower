# Watchtower specification

Normative product docs for the `wt` CLI.

| Document | Status | Description |
|----------|--------|-------------|
| [v1-draft.md](v1-draft.md) | Draft | Normative v1 product and CLI contract |
| [architecture.md](architecture.md) | Draft | Product boundary, domain model, components, safety, and evolution |
| [roadmap.md](roadmap.md) | Planning | Milestones, implementation packs, release gates, and post-v1 horizons |
| [pack-design-draft.md](pack-design-draft.md) | Draft | Canonical accepted-spec to implementation-pack process |
| [allocation-planning-draft.md](allocation-planning-draft.md) | Draft | CLI/plan/model discovery plus quality-first implementation capacity allocation |
| [coordinator-automation-draft.md](coordinator-automation-draft.md) | Draft | Normative v1 pack indexing, bounded decision cycles, zero-token routing, and validated effects |
| [discussions/lane-directory-path.md](discussions/lane-directory-path.md) | Resolved | `.watchtower/lanes/<slug>/` execution-overlay decision |
| [discussions/impl-pack-location.md](discussions/impl-pack-location.md) | Resolved | Committed design pack plus local execution-overlay decision |
| [discussions/coordinator-cost-and-automation.md](discussions/coordinator-cost-and-automation.md) | Resolved | Coordinator cost, context, tiering, and automation proposal with corrections |
| [discussions/operator-coordinator-conversation.md](discussions/operator-coordinator-conversation.md) | Proposed | Multi-turn human-operator conversation model, context inheritance, and conversation journals |

## Conventions

- **Draft** — design intent; implementation may lag
- **Proposed** — ready for implementation; API may still change
- **Stable** — implemented and covered by specs

When implementation changes behavior, update the spec in the same change set.
