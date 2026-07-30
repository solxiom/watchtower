# Watchtower specification

Normative product docs for the `wt` CLI.

| Document | Status | Description |
|----------|--------|-------------|
| [v1-draft.md](v1-draft.md) | Draft | Normative v1 product and CLI contract |
| [architecture.md](architecture.md) | Draft | Product boundary, domain model, components, safety, and evolution |
| [roadmap.md](roadmap.md) | Planning | Milestones, implementation packs, release gates, and post-v1 horizons |
| [pack-design-draft.md](pack-design-draft.md) | Draft | Canonical accepted-spec to implementation-pack process |
| [allocation-planning-draft.md](allocation-planning-draft.md) | Draft | CLI/plan/model discovery plus quality-first implementation capacity allocation |
| [discussions/lane-directory-path.md](discussions/lane-directory-path.md) | Resolved | `.watchtower/lanes/<slug>/` execution-overlay decision |
| [discussions/impl-pack-location.md](discussions/impl-pack-location.md) | Resolved | Committed design pack plus local execution-overlay decision |

## Conventions

- **Draft** — design intent; implementation may lag
- **Proposed** — ready for implementation; API may still change
- **Stable** — implemented and covered by specs

When implementation changes behavior, update the spec in the same change set.
