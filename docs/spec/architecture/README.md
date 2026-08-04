# Watchtower — implementation architecture specs

Normative and remediation documents for **code layout, module boundaries, and
integration facades**. Product behavior remains in the parent
[spec index](../README.md).

| Document | Status | Role |
|----------|--------|------|
| [foundation-module-architecture.md](foundation-module-architecture.md) | Accepted | Target `src/foundation/` domains, barrels, dependency layers, public export contract |
| [foundation-layout-remediation.md](foundation-layout-remediation.md) | Accepted | Legacy flat-layout diagnosis, file moves, `REF-01`/`REF-02` batches |

Related specs at the parent level:

- [../architecture.md](../architecture.md) — product boundaries and domain model
- [../nirvana-integration-architecture.md](../nirvana-integration-architecture.md) — NVB runtime, lane profiles, shell-leaf facades

New foundation code must conform to the target module architecture even before
remediation completes.
