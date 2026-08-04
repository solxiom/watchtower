# Command Layout — Agent Guardrails

Status: **Mandatory — every launch that adds or moves CLI command modules**
Scope: `src/commands/`, `src/run.ts` command-local imports, `spec/commands/*`
Authority: [command-module-architecture.md](command-module-architecture.md)
Last updated: 2026-08-04

---

## 1. Purpose

Command count is growing (coordinator session family, watch, doctor, events, …).
**Flat** `src/commands/*.ts` does not scale. These guardrails require
**command groups** — the CLI-layer analogue of foundation capability trees.

Bind implementers, reviewers, and coordinators the same way as
[foundation-agent-guardrails.md](foundation-agent-guardrails.md).

---

## 2. Implementer rules (hard)

### 2.1 Before adding a command

1. Read [command-module-architecture.md §3–§6](command-module-architecture.md#3-command-groups-normative).
2. Pick the **command group** (`read/`, `init/`, `coordinator/session/`, …).
3. Colocate `*Command.ts`, `*Options.ts`, and `*Presenter.ts` in that group.

### 2.2 Placement rules

| Situation | Required action |
|-----------|-----------------|
| New command or command-local module | Create under `src/commands/<group>/` — **never** as a new flat root `.ts` |
| Second module for same capability (e.g. options + presenter) | Same group directory — never split across root and subgroup |
| Coordinator session/hold/cycle/… commands | Under `src/commands/coordinator/<subgroup>/` |
| CLI-only shared helper (rare) | `src/commands/shared/` with batch-brief justification |

**Root ratchet:** `src/commands/` root may not gain new `.ts` files except
`index.ts`. Existing flat files are grandfathered until migrated.

### 2.3 Import rules

- Foundation: domain/capability barrels only (same as foundation guardrails §2.3).
- Sibling colocation: `./readCommandOptions.js` within the same group.
- **Forbidden:** importing another group's options/presenter (`../init/…` from `read/`).

### 2.4 Mandatory proof

When the batch touches commands:

```sh
nvb build && nvb test
```

Confirm green:

- `spec/commands/commandLayoutArchitecture.spec.ts`
- `spec/commands/commandImportArchitecture.spec.ts`

Complete [pre-handoff-self-audit.md §5.2](../implementation/pre-handoff-self-audit.md).

---

## 3. Reviewer enforcement (hard)

### 3.1 Procedure

1. Diff-scan `src/commands/` and `src/run.ts`.
2. Every **new** file must be under a command group — reject new root `.ts`.
3. Verify colocation: options/presenters sit beside their command in the same group.
4. Grep cross-group imports and foundation deep imports.
5. Independently run `nvb build && nvb test`.

### 3.2 Reject codes

| Code | Violation |
|------|-----------|
| **CLG-01** | New `.ts` at `src/commands/` root (other than `index.ts`) |
| **CLG-02** | Command module placed in wrong group or flat root when group exists |
| **CLG-03** | Options/presenter separated from its command group |
| **CLG-04** | Cross-group command import (`read/` → `../init/…`) |
| **CLG-05** | Generic helper bag under `commands/` (`utils/`, `helpers/`, …) |
| **CLG-06** | Directory shadow (`FooCommand.ts` beside `foo/`) |
| **CLG-07** | Foundation import bypass (deep path or `foundation/index.js`) |
| **CLG-08** | Group `index.ts` exports extra `BaseCommand` instances (double registration risk) |
| **CLG-09** | `commandLayoutArchitecture` or `commandImportArchitecture` gate fails |
| **CLG-10** | Implementation report omits command layout proof |

Working UX does **not** excuse layout violations — **REJECT**.

### 3.3 Review matrix row

| Gate | Verdict |
|------|---------|
| Command layout and colocation guardrails | PASS / FAIL / N/A |

---

## 4. Coordinator dispatch

Do not dispatch review for command-touching batches without pre-handoff §5.2
complete and explicit gate confirmation in the implementation report.

---

*End of guardrails.*
