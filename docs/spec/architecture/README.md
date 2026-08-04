# Watchtower — implementation architecture specs

Normative and remediation documents for **code layout, module boundaries, and
integration facades**. Product behavior remains in the parent
[spec index](../README.md).

## Architecture specs

| Document | Status | Role |
|----------|--------|------|
| [command-agent-guardrails.md](command-agent-guardrails.md) | Accepted | **Mandatory CLI enforcement** — command groups, root ratchet, CLG reject codes |
| [command-module-architecture.md](command-module-architecture.md) | Accepted | Target `src/commands/` groups, colocation, import rules |
| [foundation-agent-guardrails.md](foundation-agent-guardrails.md) | Accepted | **Mandatory implementer/reviewer enforcement** — placement, imports, FLG reject codes |
| [foundation-module-architecture.md](foundation-module-architecture.md) | Accepted | Target `src/foundation/` domains, barrels, dependency layers, public export contract |
| [foundation-capability-tree-amendment.md](foundation-capability-tree-amendment.md) | Accepted | REF-03 nested capability trees — supersedes flat L5 REF-01 interim layout |
| [foundation-layout-remediation.md](foundation-layout-remediation.md) | Accepted | Legacy flat-layout diagnosis, file migration inventory, reviewer checklist |

## Foundation refactor delivery

| Document | Status | Role |
|----------|--------|------|
| [foundation-refactor-implementation-map.md](foundation-refactor-implementation-map.md) | Accepted | Master plan: 6 milestones, 39 work units, 3 batches, dependencies, parallel waves |
| [foundation-refactor-implementation-tracker.md](foundation-refactor-implementation-tracker.md) | Complete | Final status — REF-01/02/03 and CMD-01 accepted |

Related product specs:

- [../architecture.md](../architecture.md) — product boundaries and domain model
- [../nirvana-integration-architecture.md](../nirvana-integration-architecture.md) — NVB runtime, lane profiles, shell-leaf facades

New foundation and command code must conform to the target module architecture.
The foundation refactor and CMD-01 layout migration are complete; update the
tracker only if a future structural amendment reopens remediation.
