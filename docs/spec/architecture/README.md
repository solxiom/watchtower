# Watchtower — implementation architecture specs

Normative and remediation documents for **code layout, module boundaries, and
integration facades**. Product behavior remains in the parent
[spec index](../README.md).

## Architecture specs

| Document | Status | Role |
|----------|--------|------|
| [foundation-module-architecture.md](foundation-module-architecture.md) | Accepted | Target `src/foundation/` domains, barrels, dependency layers, public export contract |
| [foundation-layout-remediation.md](foundation-layout-remediation.md) | Accepted | Legacy flat-layout diagnosis, file migration inventory, reviewer checklist |

## Foundation refactor delivery

| Document | Status | Role |
|----------|--------|------|
| [foundation-refactor-implementation-map.md](foundation-refactor-implementation-map.md) | Accepted | Master plan: 5 milestones, 32 work units, dependencies, parallel waves |
| [foundation-refactor-implementation-tracker.md](foundation-refactor-implementation-tracker.md) | Active | **Live status** — mark work units and milestones done here |

Related product specs:

- [../architecture.md](../architecture.md) — product boundaries and domain model
- [../nirvana-integration-architecture.md](../nirvana-integration-architecture.md) — NVB runtime, lane profiles, shell-leaf facades

New foundation code must conform to the target module architecture even before
remediation completes. Update the tracker when refactor work units land.
