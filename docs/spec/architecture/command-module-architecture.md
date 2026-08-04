# Command Module Architecture

Status: **Accepted — applies to all new work under `src/commands/`**
Scope: CLI command classes, command-local options/presenters, `src/run.ts` CLI host wiring
Related: [foundation-module-architecture.md](foundation-module-architecture.md) §8, [architecture.md](../architecture.md) §4.2
Last updated: 2026-08-04

---

## 1. Purpose

`src/commands/` is the **CLI orchestration layer**. It validates arguments, calls
foundation domain services, and renders typed results. It must **not** accumulate
domain logic, discovery, parsing, or shell effects.

As command count grows (coordinator session family, watch, doctor, events, …), a
**flat** `src/commands/*.ts` directory becomes unmaintainable — the same failure
mode REF-03 fixed in foundation. This document defines **command groups**:
capability-aligned subdirectories with colocated options and presenters.

Nirvana's `BasicCommandManager.registerDirectory` **recursively** discovers
`BaseCommand` subclasses in subdirectories, so grouping does **not** require CLI
host changes beyond keeping `commandRootDirectories` pointed at `src/commands/`.

---

## 2. Layer model

```text
src/run.ts, src/cli.ts          ← CLI host (no product logic)
src/commands/<group>/           ← argument validation + orchestration + command-local presentation
src/foundation/<domain>/        ← domain services (algorithms, planners, projections)
src/contracts/                  ← shared types and error shapes
```

**Hard rules:**

1. Commands call foundation through **domain/capability barrels** only (see [commandImportArchitecture.spec.ts](../../spec/commands/commandLayoutArchitecture.spec.ts)).
2. Foundation never imports `src/commands/`.
3. Command groups never import sibling groups' internals — shared CLI-only helpers belong in `src/commands/shared/` (rare; justify in spec).
4. Product algorithms stay in foundation; command groups own flag parsing and field layout only.

---

## 3. Command groups (normative)

A **command group** is one product-facing CLI capability area. Use a **short noun**
directory name (no `Command` suffix in the path).

| Group | Commands / modules | Foundation domains |
|-------|-------------------|-------------------|
| `read/` | `list`, `config show` | `read/`, `presentation/` |
| `status/` | `status` | `status/`, `presentation/` |
| `init/` | `init` | `init/`, `presentation/` |
| `upgrade/` | `upgrade` | `upgrade/`, `presentation/` |
| `skill/` | `skill install` | `hostAdapters/`, `paths/`, `presentation/` |
| `watch/` | `watch` | `task/`, `observation/`, `presentation/` |
| `doctor/` | `doctor` | TBD domain modules, `presentation/` |
| `version/` | `version` | `upgrade/` or read-only manifest ports, `presentation/` |
| `events/` | `events tail`, `events latest` | `observation/`, `presentation/` |
| `batch/` | `batch ready` | coordinator read surfaces, `presentation/` |
| `coordinator/` | `coordinator …` umbrella | multiple foundation trees — split subgroups below |

**Coordinator subgroups** (use when ≥2 commands share a sub-capability):

```text
src/commands/coordinator/
  session/          SessionCreateCommand, SessionAttachCommand, …
  index/            IndexBuildCommand, …
  cycle/            CycleRunCommand, …
  hold/             HoldPlaceCommand, …
  resolution/       ResolutionShowCommand, …
  context/          ContextExplainCommand, …
```

Each subgroup colocates its `*Command.ts`, `*Options.ts`, and `*Presenter.ts` files.

---

## 4. Target tree (illustrative)

Current flat files are **interim debt** (grandfathered). **New** modules must land
in groups immediately.

```text
src/commands/
  index.ts                      ← optional explicit registry (tests/tools); CLI uses directory scan
  read/
    ListCommand.ts
    ConfigCommand.ts
    readCommandOptions.ts
    readCommandPresenter.ts
  status/
    StatusCommand.ts
  init/
    InitCommand.ts
    initCommandOptions.ts
  upgrade/
    UpgradeCommand.ts
    upgradeCommandOptions.ts
  skill/
    SkillInstallCommand.ts
    skillInstallOptions.ts
    skillInstallPresenter.ts
  coordinator/
    session/
      …
  shared/                       ← CLI-only shared helpers (avoid; last resort)
    …
```

**Forbidden:**

- New `*Command.ts`, `*Options.ts`, or `*Presenter.ts` at `src/commands/` root after baseline freeze (see gate spec).
- Generic bags: `commands/utils/`, `commands/helpers/`.
- Directory shadow: `InitCommand.ts` beside `init/`.
- Domain logic duplicated from foundation in command options/presenters.

---

## 5. File naming and colocation

| Artifact | Pattern | Location |
|----------|---------|----------|
| Command class | `<Feature>Command.ts` | Same group directory as its options/presenter |
| Options parser | `<feature>CommandOptions.ts` or `<group>CommandOptions.ts` | Same group |
| Presenter | `<feature>CommandPresenter.ts` or `<group>CommandPresenter.ts` | Same group |
| Group barrel | `index.ts` | Optional; export symbols for tests only — **must not** export duplicate `BaseCommand` instances the scanner would double-register |

Default export: one `BaseCommand` subclass per `*Command.ts` file.

---

## 6. Import rules

**From commands to foundation:**

```typescript
import {LaneListService} from '../../foundation/read/index.js';
import {presentReadCommand} from './readCommandPresenter.js';
```

- Use `../../foundation/<domain>/index.js` from one level deep (`read/`).
- Use `../../../foundation/...` from two levels (`coordinator/session/`).
- **Forbidden:** `../../foundation/index.js`, deep capsule paths.

**Between command groups:**

- **Forbidden:** `../init/initCommandOptions.js` from `read/`.
- **Allowed:** `../shared/…` only for truly CLI-generic helpers (document in batch brief).

**From `src/run.ts`:**

- Presentation barrel for errors; command-local validators only via stable group paths (e.g. `./commands/read/readCommandOptions.js`).

---

## 7. Architecture gates

| Spec | Encodes |
|------|---------|
| [commandLayoutArchitecture.spec.ts](../../spec/commands/commandLayoutArchitecture.spec.ts) | Group layout, root ratchet, colocation, cross-group imports |
| [commandImportArchitecture.spec.ts](../../spec/commands/commandImportArchitecture.spec.ts) | Foundation barrel imports (recursive scan) |
| [command-agent-guardrails.md](command-agent-guardrails.md) | Agent/reviewer **CLG-** reject codes |

Run via `nvb test`.

---

## 8. Migration

Flat root files may be moved in a dedicated layout batch (no product behavior
change). Do not add new flat root files while migration is pending — the gate
**ratchets** root file count downward over time.

---

## 9. Related documents

| Document | Role |
|----------|------|
| [command-agent-guardrails.md](command-agent-guardrails.md) | Mandatory implementer/reviewer enforcement |
| [foundation-agent-guardrails.md](foundation-agent-guardrails.md) | Foundation tree + shared CLI import rules |
| [foundation-module-architecture.md §8](foundation-module-architecture.md#8-presentation-boundary) | Presentation vs command ownership |

---

*End of document.*
