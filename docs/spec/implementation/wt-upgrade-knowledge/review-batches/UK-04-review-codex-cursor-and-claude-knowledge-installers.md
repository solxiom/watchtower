# Review Batch UK-04 — Codex, Cursor, and Claude knowledge installers

## Synchronized batch execution matrix

- **Accepted-map title:** Codex, Cursor, and Claude knowledge installers
- **Dependencies:** `RT-01`, `RT-02`
- **Exclusive ownership/interface:** host adapters and skill command
- **Implementer/reviewer floor:** R3 / R3
- **Mandatory batch proof:** Preview/replace/scope behavior; version record; no false notification claim
- **Implementation report:** `.local/agent-reports/wt-upgrade-knowledge/UK-04-codex-cursor-and-claude-knowledge-installers.md`
- **Review report:** `.local/agent-reports/wt-upgrade-knowledge/reviews/UK-04-codex-cursor-and-claude-knowledge-installers-review.md`
- **Correction report:** `.local/agent-reports/wt-upgrade-knowledge/reviews/corrections/UK-04-codex-cursor-and-claude-knowledge-installers-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

## Mandatory Governing References

This draft brief is subordinate to:

- `AGENTS.md`
- `docs/development/engineering-and-review-standard.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/schemas/v1.schema.json`
- `docs/spec/v1.md`
- `docs/spec/nirvana-integration-architecture.md`
- `docs/spec/architecture.md`
- `docs/spec/v1-implementation-map.md`
- `docs/spec/coordinator-automation.md`
- `docs/spec/operator-session.md`
- `docs/spec/cli-session.md`
- this pack's `implementation-quality-and-agent-rules.md`

Only the references relevant to the batch's accepted scope need drive its
product logic, but the engineering and Nirvana/NVB architecture standards
always apply. If this brief names a stale path, title, size threshold, or
mechanism, follow the governing source and correct the brief/report rather than
implementing the stale claim. Stop for a specification amendment when the
governing sources leave a product decision unresolved.

## Mandatory Cross-Cutting Acceptance

- Include a Nirvana API usage audit with inspected packages/symbols, comparable
  Nira usage, selected APIs, and any proven `NIRVANA_API_GAP`.
- Keep commands as thin Nirvana front doors and place behavior in
  capability-oriented foundation owners.
- Use the packaged immutable NVB task catalog for substantial mechanical
  workflows. `LaneTaskRunner` is the sole task invocation boundary; project
  `nvb.json` files are never modified or trusted as Watchtower authority.
- Retain shell only as a manifest-declared leaf adapter. Workflow-level shell,
  arbitrary task selection, and direct raw subprocess use are hard rejects.
- Apply the exact module/function/constructor limits and reviewer matrix from
  the mandatory engineering standard. A pack-local statement cannot relax
  those limits.
- Reconcile every reason code, exit mapping, event name, and schema identifier
  with accepted RM-01 contracts and `docs/spec/schemas/v1.schema.json`; a local
  illustrative name does not silently create a public identifier.

Review batch ID: `UK-04-review`
Reviews work batch: `UK-04` — Codex, Cursor, and Claude knowledge installers
Reviewer reasoning class: R3 (bounded repository reasoning)

## Review Scope

Independently verify that all three host adapters preview correctly, enforce
`--replace` in non-interactive mode, record installed versions, install no
lane-specific state, and make no false notification claims.

## Governing Specs

- `docs/spec/v1.md` — §11.8
- `docs/spec/v1-contracts.md` — §6
- `docs/spec/schemas/v1.schema.json` — `mutationResult`

## Review Items

### 1. Source ownership verification

- [ ] `hostAdapters.ts` owns adapter factory and per-host logic
- [ ] `SkillInstallCommand.ts` delegates to adapters; no per-host logic in command
- [ ] No product logic in `src/cli.ts`

### 2. Per-adapter verification (Codex, Cursor, Claude)

For each host:

- [ ] Preview output: correct source knowledge location, correct destination path, correct scope, files that would be overwritten
- [ ] `--replace` required in non-interactive mode when destination exists; test with `--json` flag (which implies non-interactive)
- [ ] Successful install with `--replace` copies correct files
- [ ] Installed version recorded in host-specific location; read it back to verify
- [ ] `--dry-run` produces zero writes (verify destination untouched)

### 3. Scope filtering

- [ ] `--scope=skill-only`: only the skill/playbook file installed
- [ ] `--scope=guides-only`: only guidance documents installed
- [ ] Default (no `--scope`): complete knowledge pack installed

### 4. No lane-specific state in skills

- [ ] Search all installed skill files for: lane home path patterns, lane ID
  patterns (UUID), tmux prefix patterns, repository binding paths
- [ ] Verify zero matches across all three hosts
- [ ] This is a mandatory check — do not accept the batch without it

### 5. No false notification claims

- [ ] Adapter result always reports `notificationStatus: "unverified"`
- [ ] No code path claims a host notification is configured or active
- [ ] `--json` output's `mutationResult` does not claim notification was verified

### 6. Error handling

- [ ] Unknown host produces exit 2
- [ ] Missing knowledge root produces exit 4
- [ ] Existing destination without `--replace` in non-interactive produces exit 5

### 7. Proof independence

- [ ] Rerun all Jasmine specs independently
- [ ] Independently search installed skill files for lane-specific state
- [ ] Independently verify `--dry-run` zero-write behavior
- [ ] Validate `mutationResult` JSON against schema

## Acceptance Decision

Accept only when ALL independently verified for all three hosts. If rejected,
create `corrections/UK-04-correction-01.md`.

---
---

# UK-04 Review: Codex, Cursor, And Claude Knowledge Installers — Agent Launch Prompt

## Recommended agent/model class for forwarding:

**Reasoning level:** R3 — independent verification of three bounded host
adapters with explicit preview/replace/scope contracts.

**Primary suitability:** A reviewer agent capable of running adapter specs
independently, searching installed files for lane-specific patterns, and
verifying `--replace` enforcement.

**Alternatives:** Any R3-capable agent with TypeScript test-running and
file-search experience.

**Prohibited final-pass classes:** R1, R2

**Context requirements:** The reviewer needs §11.8, §6, the UK-04 work brief,
the implementation report, all changed source files, and the schema bundle.

**Final-authority limits:** The reviewer owns acceptance and commit.

### Complete forwarding profile — mandatory

- **Class:** R3 (review, matching R3 implementor)
- **Primary models:** any coding agent meeting R3
- **Good alternatives:** any agent with TypeScript, file-search, and
  test-verification experience
- **Steering-only tools:** agents that cannot run tests or search files
  are unsuitable
- **Prohibited final-pass classes:** R1, R2
- **Context retention:** reviewer must retain the three-host adapter
  interface and the five common constraints
- **Final-authority limits:** reviewer owns acceptance and commit

## Capability-Based Agent Selection Rule

This review requires R3 reasoning because:

- Three structurally similar adapters with bounded filesystem operations
- The main risks (lane-state leakage, missing `--replace` guard, false
  notification claims) are detectable by automated file-search and
  focused spec tests
- No state machines, no concurrency, no crash recovery to verify

## Context Assignment

You are the independent reviewer for batch UK-04 (Codex, Cursor, and Claude
knowledge installers) in the wt-upgrade-knowledge pack. You must independently
verify that no lane-specific state leaks into installed skill files and that
`--replace` is enforced. A skill file containing a lane home path that passes
your review exposes private operator paths to every host that reads the skill.

## Read In This Order

1. `AGENTS.md`
2. Pack README, roadmap, tracker, quality rules — especially the 16-item
   hard-reject checklist
3. `docs/spec/v1.md` — §11.8
4. `docs/spec/v1-contracts.md` — §6
5. `docs/spec/schemas/v1.schema.json` — `mutationResult`
6. UK-04 work brief and implementation report
7. All changed source and spec files

## Your Review Mission

1. Run the 16-item hard-reject checklist first. Stop on any "yes."
2. Independently run all Jasmine specs for all three adapters.
3. For each adapter: independently verify preview output contains expected paths.
4. Independently verify `--replace` refused in non-interactive mode.
5. Independently verify version recorded after install.
6. **Critical**: search all installed skill files for lane-specific patterns:
   - Lane home path (the workspace/control-home path)
   - Lane UUID (any UUID matching the test lane)
   - Tmux prefix (any two-character lowercase prefix)
   - Repository binding paths
   Verify zero matches across all three hosts.
7. Independently verify each scope filter installs only expected files.
8. Independently verify `--dry-run` writes zero files.
9. Validate `mutationResult` JSON against schema.
10. Verify `nvb build` passes.

## What You Must Not Do

- Skip the lane-state-leakage search
- Trust the implementation report's claim that no lane state is embedded
- Accept a batch where `--replace` is not enforced in non-interactive mode
- Accept a batch where notification is claimed as verified

## Acceptance Gate

- [ ] Hard-reject checklist: zero "yes"
- [ ] All specs pass independently for all three hosts
- [ ] No lane-specific state in any installed skill file (searched independently)
- [ ] `--replace` enforced in non-interactive mode
- [ ] Version recorded and readable after install
- [ ] Scope filters correct for all scopes
- [ ] `--dry-run` zero-write verified
- [ ] JSON validates against schema
- [ ] All exit codes correct (2/4/5)
- [ ] `nvb build` passes

## Required Disk Report

Write a complete independent review report at `.local/agent-reports/wt-upgrade-knowledge/reviews/UK-04-review-codex-cursor-and-claude-knowledge-installers.md`
containing: per-adapter verification results, lane-state search methodology
and results, scope-filter verification, and final verdict.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **host adapters and skill command**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-upgrade-knowledge/reviews/UK-04-codex-cursor-and-claude-knowledge-installers-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RT-01`, `RT-02`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Preview/replace/scope behavior; version record; no false notification claim**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **host adapters and skill command** and **Preview/replace/scope behavior; version record; no false notification claim**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-upgrade-knowledge/reviews/corrections/UK-04-codex-cursor-and-claude-knowledge-installers-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-upgrade-knowledge/reviews/UK-04-codex-cursor-and-claude-knowledge-installers-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
