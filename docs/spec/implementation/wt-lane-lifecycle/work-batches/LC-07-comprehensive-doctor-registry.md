# Work Batch LC-07 — Comprehensive Doctor Registry

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

Status: ❌ Pending
Implementation reasoning: R4
Review reasoning: R5
Depends on: LC-04, LC-05, LC-06, RM-09
Workload: large

## Scope

Implement a comprehensive diagnostic check registry and the `wt doctor` command.
Each check returns `pass`, `warn`, `fail`, or `skip`. Categories include tools,
accounts, pack structure/policy/index, permissions, repository bindings,
concurrent conflicts, and Git-ignore coverage. Doctor is read-only in v1.
This batch owns the doctor foundation and the DoctorCommand.

## Specification References

| Reference | Section | Topic |
|-----------|---------|-------|
| v1.md | §11.7 | Doctor command: grouped checks, pass/warn/fail/skip, exit codes (0/4), read-only |
| v1.md | §7.1 | Data-root permissions, worker account checks |
| v1.md | §14 | Doctor must detect missing deps, broken links, unsafe config, missing pack structure |
| v1.md | §8 | Config strict subset validation |
| v1-contracts.md | §8 | Doctor report schema: `doctorReport` with checks array |
| schemas/v1.schema.json | `$defs.doctorReport` | Required `checks` array with `{id, status}` |

## Owned Files

### New foundation module

- `src/foundation/DoctorRegistry.ts` — composable diagnostic check
  definitions; each check is a function returning `pass|warn|fail|skip`;
  grouped by category

### New command

- `src/commands/DoctorCommand.ts` — resolves lane, runs all registered checks,
  renders grouped results, assigns exit code

## Dependencies

### From this pack

- **LC-04** (bindings/registration): doctor checks repository binding
  consistency, membership index staleness
- **LC-05** (coordinator baselines): doctor checks policy presence, schema
  validity, index freshness/integrity
- **LC-06** (watch command): doctor checks watcher liveness (heartbeat)

### From pack 1 (wt-read-model)

- **RM-09** (observations): tmux, watcher, heartbeat observations for
  doctor diagnostics

## Required Interfaces

### DoctorRegistry

```typescript
type CheckStatus = "pass" | "warn" | "fail" | "skip";

interface DoctorCheck {
  id: string;
  category: DoctorCategory;
  description: string;
  run(lane: ResolvedLane, context: DoctorContext): Promise<CheckResult>;
}

interface CheckResult {
  status: CheckStatus;
  message?: string;
  details?: Record<string, any>;
}

interface DoctorReport {
  checks: CheckResult[];
  summary: { pass: number; warn: number; fail: number; skip: number; };
  exitCode: number;  // 0 on pass/warn, 4 on fail
}

type DoctorCategory =
  | "control-home"
  | "tools"
  | "accounts"
  | "config"
  | "markers"
  | "bindings"
  | "conflicts"
  | "pack"
  | "policy"
  | "index"
  | "permissions"
  | "gitignore"
  | "runtime"
  | "watcher"
  | "speech";

function registerCheck(check: DoctorCheck): void;
function getAllChecks(): DoctorCheck[];
function runAllChecks(lane: ResolvedLane, context: DoctorContext): Promise<DoctorReport>;
```

## Implementation Steps

1. **Create `src/foundation/DoctorRegistry.ts`**
   - `DoctorCheck` interface: `{id, category, description, run}`
   - `registerCheck(check)`: add to global registry
   - `getAllChecks()`: return all registered checks
   - `runAllChecks(lane, context)`: iterate all checks, collect results,
     compute summary and exit code
   - Checks must be registered at module load time (each check module
     calls `registerCheck`)
   - Each check is a focused, deterministic, read-only function
   - Checks never perform repair, rebuild, or migration
   - Checks never write to any filesystem path
   - Checks never use a model

   **Check categories and implementations:**

   **Control-home checks:**
   - `home-access`: verify control home path exists, is directory, is readable
   - `lane-dir-access`: verify `.watchtower/lanes/{slug}/` exists, is readable
   - `lane-marker`: verify `lane.json` exists, is valid JSON, matches schema

   **Tool checks:**
   - `bash-available`: `bash --version` → pass/fail
   - `git-available`: `git --version` → pass/fail
   - `tmux-available`: `tmux -V` → pass/fail
   - `jq-available`: `jq --version` → pass/fail (warn on absent, not fail)
   - `flock-available`: `flock --version` → pass/warn
   - `rg-available`: `rg --version` → pass/warn

   **Account checks:**
   - `operator-account`: verify current OS account matches configured operator
   - `worker-accounts`: verify configured worker accounts exist, can resolve
     CLIs, can access runtime store (traverse + execute, not write)

   **Config checks:**
   - `config-parse`: parse `lane.config.env` with strict parser, reject
     shell-injected content
   - `config-schema`: verify all required keys present
   - `config-redaction`: verify no secret keys exposed (if verbose,
     warn on tokens/secrets in config)

   **Marker checks:**
   - `marker-schema`: validate `lane.json` against JSON Schema
   - `install-schema`: validate `install.json` against JSON Schema
   - `bindings-schema`: validate `repositories.local.json` against schema

   **Binding checks:**
   - `binding-paths`: verify all local binding paths exist and are directories
   - `binding-branches`: verify declared branches exist in each repo
   - `binding-worktrees`: verify worktree mode consistency (dedicated vs shared)
   - `membership-index`: verify membership index has valid entries for all
     bindings; report stale entries

   **Conflict checks:**
   - `writable-conflicts`: detect active lanes sharing writable worktrees
     (fail on unsanctioned shared-write)
   - `tmux-prefix-conflicts`: detect overlapping tmux prefix usage between lanes
   - `path-claim-conflicts`: detect overlapping exclusive-write path claims

   **Pack checks:**
   - `pack-structure`: verify committed pack has required files
     (implementation-pack.json, lock, acceptance, traceability, etc.)
   - `pack-acceptance`: verify acceptance record is valid
   - `pack-seal`: verify lock seal matches current pack bytes (drift detection)

   **Policy checks:**
   - `routing-policy`: verify `coordinator/routing-policy.json` exists and
     passes schema validation; all 15 rules present
   - `session-policy`: verify `coordinator/session-policy.json` exists and
     passes schema validation; all defaults present
   - `policy-provenance`: verify provenance markers reference correct spec
     sections

   **Index checks:**
   - `pack-index-fresh`: verify `coordinator/pack-index.json` exists
   - `pack-index-integrity`: verify index seal matches active pack seal
   - `pack-index-schema`: verify index passes schema validation

   **Permission checks:**
   - `runtime-permissions`: verify runtime assets are readable/executable
     by configured worker accounts; writable only by operator
   - `lane-permissions`: verify lane files owned by operator; no world-writable
   - `session-permissions`: verify operator-session files only readable by
     operator; retention-coupled UI-cache permissions

   **Git-ignore checks:**
   - `gitignore-present`: verify `.gitignore` exists at control home
   - `gitignore-coverage`: verify `/.watchtower/` is gitignored

   **Runtime checks:**
   - `runtime-installed`: verify pinned runtime is staged in data-root
   - `runtime-manifest`: verify runtime manifest is valid
   - `runtime-checksums`: verify managed asset checksums match
   - `runtime-links`: verify `bin/` links point to valid runtime assets
   - `knowledge-installed`: verify knowledge pack is staged

   **Watcher checks:**
   - `watcher-heartbeat`: check watcher heartbeat/lock for liveness
   - `watcher-state`: check watcher state is valid JSON

   **Speech checks (optional, warn-only):**
   - `speech-stack`: check Piper or equivalent speech stack availability
     (skip if not configured, warn if configured but missing)

2. **Create `src/commands/DoctorCommand.ts`**
   - Extend BaseCommand; name `"doctor"`; group `"lane"`
   - Parse `--lane`, `--workspace`
   - Resolve lane via RM-03 and RM-06
   - Run all registered checks via `runAllChecks`
   - Render results grouped by category:
     - Green `pass`: check passed
     - Yellow `warn`: non-critical issue detected
     - Red `fail`: critical issue detected
     - Dim `skip`: check not applicable
   - Print summary: pass/warn/fail/skip counts
   - Exit 0 on all pass/warn (no failures)
   - Exit 4 on any fail
   - `--json` mode: output `doctorReport` schema (one JSON value with
     checks array and each check's `{id, status}` plus optional `message`/`details`)
   - `--verbose` mode: include details in human and JSON output

3. **Write help/commands/doctor.hlp.json**
   - Describe check categories and meanings
   - Document pass/warn/fail/skip semantics
   - Document exit code rules (0 vs 4)

4. **Register in help/help.json**

5. **Write focused specs**
   - `spec/foundation/doctor-registry.spec.ts`: every check category
     represented, each check produces valid result, pass on known-good
     fixture, fail on known-bad fixture, warn on borderline fixture,
     skip on inapplicable fixture, read-only guarantee (no filesystem writes)
   - `spec/commands/DoctorCommand.spec.ts`: lane resolution, check execution,
     grouped output, summary rendering, JSON output format, exit codes

## Exclusions

- No repair, rebuild, or migration — doctor is read-only
- No implicit repair of stale membership index
- No watcher management (restart, stop)
- No model use for diagnostic classification

## Required Proof

### Focused
- Every check category has at least one check registered
- Each check produces correct status on known-good fixture (pass)
- Each check produces correct status on known-bad fixture (fail)
- Tool checks: tool present → pass, missing → fail/warn as appropriate
- Account checks: correct account → pass, missing → fail, unconfigured → skip
- Config checks: valid config → pass, shell-injected → fail
- Marker checks: valid JSON → pass, invalid → fail, missing → fail
- Binding checks: existing paths → pass, missing paths → fail
- Conflict checks: no conflict → pass, detected → fail/warn
- Pack checks: complete pack → pass, missing files → fail
- Policy checks: complete policies → pass, missing → fail
- Index checks: fresh matching → pass, stale → fail, corrupt → fail
- Permission checks: correct → pass, world-writable → fail
- Git-ignore checks: present → pass, missing → fail
- Runtime checks: all present → pass, missing links → fail
- Watcher checks: running → pass, not running → warn
- Doctor is read-only: mock filesystem, verify no write calls
- JSON output matches `doctorReport` schema
- Exit code 0 on all pass/warn, exit code 4 on any fail

### Regression
- `nvb build` passes

### Architecture
- Doctor checks do not mutate state
- DoctorCommand delegates entirely to doctor-registry

## Help and Documentation

- Create `help/commands/doctor.hlp.json`
- Register in `help/help.json`

## Handoff Notes

After acceptance, `DoctorRegistry.ts` is the shared diagnostic layer.
LC-08 (integration) runs `wt doctor` in the end-to-end fixture. Future
batches from pack 5 (CA-*) may extend the registry with coordinator-
specific checks.
