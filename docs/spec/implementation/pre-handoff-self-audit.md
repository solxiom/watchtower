# Pre-Handoff Self-Audit

Status: **Mandatory — run before emitting `handoff`**

This checklist mirrors the reviewer's acceptance matrix (`docs/development/engineering-and-review-standard.md` §12).
Every `FAIL` here means the reviewer will REJECT. Do not hand off with a known failure.

## 1. Build, test, dist

```
nvb build    ── must pass
nvb test     ── must pass (no skipped/focused/flaky specs)
nvb dist     ── if this batch touches runtime, assets, deps, or packaging
```

## 2. Ownership

```
find . -not -user kavan -not -path './.git/*' -not -path './.nirvana/*' | grep -v node_modules
```
Every edited or created file must be `kavan:kavan`. Clean output only.

## 3. Git hygiene

```
git diff --check    ── no whitespace errors
git status --short  ── no staged build/, dist/, node_modules/, .nirvana/local/, .watchtower/
```

## 4. Module and function sizes

| Check | Command |
|-------|---------|
| No module over hard limit | `wc -l` on every changed/created `.ts` file |
| No function over 80 lines | Visual scan |
| No constructor over 50 lines | Visual scan |

Hard limits per `engineering-and-review-standard.md` §4.

## 5. Architecture gates

- [ ] No product logic in `src/cli.ts` or `src/run.ts`
- [ ] No generic helper bag (`utils/`, `helpers/`, `common/`, `misc/`, `shared/`)
- [ ] No directory-shadow layout (`thing.ts` beside `thing/`)
- [ ] No circular dependencies
- [ ] No deep import of another package's private paths
- [ ] Owns only the batch's declared exclusive files; does not duplicate another batch's owner

## 6. Nirvana API audit

- [ ] Every capability checked against pinned `@nirvana/*` packages before using bare Node
- [ ] Every bypass has a documented `NIRVANA_API_GAP` with the missing semantics and narrow adapter
- [ ] No `node:child_process` outside an approved adapter
- [ ] No `console.*` or direct `process.stdout` in commands/foundation
- [ ] No direct filesystem outside named persistence/adapter boundaries
- [ ] `LaneTaskRunner` is the only NVB invocation boundary (if this batch touches tasks)

## 7. Edge-case coverage

Enumerate and test every applicable failure mode from the batch brief + the following categories:

- [ ] Malformed/missing/extra input
- [ ] Stale/corrupt state
- [ ] Path escape, symlink traversal, permission denied
- [ ] Concurrency, replay, interrupted effect
- [ ] Read-only purity (if the batch declares read-only)
- [ ] Packaged/relocated execution (if the batch touches dist)
- [ ] Signal/interruption behavior

## 8. Contracts and errors

- [ ] External data parsed as `unknown`, validated, normalized — no `any` or unchecked casts at trust boundaries
- [ ] Errors have reason code, failed operation, safe target, remediation message
- [ ] No secrets, tokens, or unredacted env values in errors or logs
- [ ] JSON output has no decorative text, color, or unstable prose (if command produces JSON mode)

## 9. Engineering PASS/FAIL matrix

Copy this into your implementation report. Every gate must be PASS:

| Gate | Verdict |
|------|---------|
| Specification and batch scope | PASS / FAIL |
| Layering and responsibilities | PASS / FAIL |
| Nirvana-first API use | PASS / FAIL |
| NVB task-runtime and facade boundaries | PASS / FAIL |
| Size and complexity limits | PASS / FAIL |
| Contracts and failure behavior | PASS / FAIL |
| State/effect/security boundaries | PASS / FAIL |
| Tests and build/dist proof | PASS / FAIL |
| Help/schema/spec synchronization | PASS / FAIL |

## 10. Hard-reject scan

If ANY of these are true, do not hand off:

- [ ] Module/function over hard limit without pre-approved exception
- [ ] Product logic in CLI/task front door or god object
- [ ] Generic helper bag or hidden circular dependency
- [ ] Bypassed Nirvana API without `NIRVANA_API_GAP`
- [ ] Raw subprocess/terminal/filesystem/SQL outside adapter boundary
- [ ] Local replacement for Nirvana terminal/pretty/command/collection/storage
- [ ] Second source of truth from cache/tmux/UI/agent prose
- [ ] Command/help/schema/spec drift
- [ ] Missing negative/failure/recovery/authority-boundary tests
- [ ] Broad `any`, unchecked casts, mutable global state
- [ ] "Refactor later" promise for introduced debt
- [ ] Missing Nirvana audit or size report in implementation report
- [ ] Project-root Watchtower tasks, arbitrary NVB task selection, or direct NVB invocation outside `LaneTaskRunner`

All false before handoff.
