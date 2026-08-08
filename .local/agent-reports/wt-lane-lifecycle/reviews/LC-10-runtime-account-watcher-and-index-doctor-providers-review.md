# LC-10 review — runtime, account, watcher, and index doctor providers

Status: accepted.

## Scope and method

Reviewed the staged LC-10 implementation against the available implementer
handoff, `AGENTS.md`, `docs/spec/v1.md`, and the mandatory engineering/review
standard. The shared launch contract and exact review brief named by the launch
prompt are not present in this checkout; the available LC-10 implementation
report was used as the batch-specific scope evidence. No implementation repair
was performed.

## Engineering matrix

| Gate | Verdict | Evidence |
|---|---|---|
| Specification and batch scope | PASS | Five injected checks are closed IDs, explicitly composed, read-only, and reflected in the tracker/help/spec. |
| Layering and responsibilities | PASS | Thin command; focused provider modules; injected ports; no global registry or alternate authority. |
| Nirvana-first API use | PASS | Handoff audit documents inspected Nirvana symbols and the two bounded adapter gaps. |
| Runtime/facade boundaries | PASS | No new subprocess, SQL, or command-side storage boundary; existing named adapters are reused. |
| Size and complexity | PASS | Changed implementation modules are below hard limits; largest changed implementation file is 127 lines. |
| Contracts and failure behavior | PASS | Focused negative coverage includes malformed, missing, stale, corrupt, unsupported, permission, identity, and duplicate-provider cases. |
| Read-only/security boundary | PASS | Providers only observe; pack-index stores close in `finally`; no repair, rebuild, or global registration. |
| Focused proof | PASS | 60 LC-10/doctor Jasmine specs, 0 failures. |
| Build | PASS | Test build completed successfully; focused compiled specs executed successfully. |
| Full-suite evidence | QUALIFIED | 2219 specs ran; 12 failures are unrelated installed-package relocation/OpenCode baseline checks. They do not touch LC-10 providers and the focused proof is green. |
| Help/schema/spec synchronization | PASS | JSON parses; doctor syntax and LC-10 scope are synchronized. |
| Hygiene | PASS | `git diff --cached --check`, conflict scan, ownership scan, and forbidden generated/local staging scan passed. |

## Mandatory proof

- Required tools: PASS/FAIL behavior and ordered missing-tool reporting covered;
  focused proof passed.
- Runtime catalog: PASS for a valid installed catalog; FAIL for missing,
  malformed, unsupported, and corrupt runtime cases; focused proof passed.
- Account access: PASS/FAIL/skip behavior for control-home/runtime-root
  readability, traversability, and runtime-root writability; focused proof
  passed.
- Watcher heartbeat: PASS for fresh, FAIL for stale/invalid, SKIP for absent;
  focused proof passed.
- Pack index: SKIP for absent pointer; FAIL for malformed/extra/duplicate,
  stale, identity/schema/compiler mismatch, open, and integrity errors; close
  behavior and read-only snapshots covered; focused proof passed.

## Full acceptance decision

No applicable LC-10 hard-reject condition was found. The implementation is
accepted. The owning tracker row is updated to `✅ Accepted` in this reviewer
acceptance commit.

