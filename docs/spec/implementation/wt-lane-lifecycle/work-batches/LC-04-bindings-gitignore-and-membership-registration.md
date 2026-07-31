# Batch LC-04 — Bindings, Git-ignore, and membership registration

## Synchronized batch execution matrix

- **Accepted-map title:** Bindings, Git-ignore, and membership registration
- **Dependencies:** `LC-03`, `RM-07`
- **Exclusive ownership/interface:** repository/index mutation foundation
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory batch proof:** Lock order; conditional Git-ignore rollback; post-commit idempotent registration
- **Implementation report:** `.local/agent-reports/wt-lane-lifecycle/LC-04-bindings-gitignore-and-membership-registration.md`
- **Review report:** `.local/agent-reports/wt-lane-lifecycle/reviews/LC-04-bindings-gitignore-and-membership-registration-review.md`
- **Correction report:** `.local/agent-reports/wt-lane-lifecycle/reviews/corrections/LC-04-bindings-gitignore-and-membership-registration-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ❌ Pending
Implementation reasoning: R4
Review reasoning: R5
Depends on: LC-03, RM-07
Workload: medium

## Scope

Write repository bindings. Manage `.gitignore` with atomic replace and
conditional rollback via digest comparison. Register the lane in the
membership index post-commit with idempotent retry. Respect lock acquisition
order. This batch owns the binding mutator and membership registrar
foundation.

## Specification References

| Reference | Section | Topic |
|-----------|---------|-------|
| v1.md | §7.2 | `.watchtower/` must be Git-ignored |
| v1.md | §7.4 | `repositories.local.json` schema and rules |
| v1.md | §14 | Lock acquisition order, atomic replace for `.gitignore` |
| v1-contracts.md | §11 | Locking order: data-root, lane, session, projection/index. Init staging rules: `.gitignore` atomic replace, digest preservation, conditional rollback. Membership post-commit registration with idempotent retry. |
| v1.md | §9.2 | Membership index for secondary-repository discovery |
| v1.md | §7.1 | Membership index location at `<watchtower-data-root>/index/repository-memberships.json` |

## Owned Files

### New foundation modules

- `src/foundation/BindingMutator.ts` — acquire locks in spec order, write
  repository bindings, manage `.gitignore` atomically with digest-aware
  conditional rollback
- `src/foundation/MembershipRegistrar.ts` — post-commit idempotent
  membership index registration, retry logic, warning on failure

## Dependencies

### From this pack

- **LC-03** (lane store/transactional writer): binding mutator runs after the
  lane is committed. It knows the final lane directory paths.

### From pack 1 (wt-read-model)

- **RM-07** (membership index): discovery and index read. The registrar
  extends the membership index with write capability while reusing read
  structures. Stale entries are ignored on read, reported on write conflict.

## Required Interfaces

### BindingMutator

```typescript
interface GitignoreUpdate {
  path: string;                // absolute path to .gitignore
  originalDigest: string;      // digest before write
  writtenDigest: string;       // digest after write
  rolledBack: boolean;
}

interface BindingResult {
  gitignoreUpdated: boolean;
  gitignoreUpdate: GitignoreUpdate | null;
  bindingsWritten: boolean;
}

function acquireInitLocks(controlHome: string, slug: string): Promise<void>;
function releaseInitLocks(): Promise<void>;
function updateGitignore(controlHome: string): Promise<GitignoreUpdate>;
function restoreGitignore(controlHome: string, originalDigest: string): Promise<boolean>;
function shouldUpdateGitignore(controlHome: string): Promise<boolean>;
function writeBindings(laneDir: string, bindings: RepositoryBinding[]): Promise<void>;
```

### MembershipRegistrar

```typescript
interface RegistrationResult {
  registered: boolean;
  retryCount: number;
  warning?: string;
}

function registerLane(laneDir: string): Promise<RegistrationResult>;
function registerLaneWithRetry(laneDir: string, maxRetries?: number): Promise<RegistrationResult>;
```

## Implementation Steps

1. **Create `src/foundation/BindingMutator.ts`**
   - `acquireInitLocks`: acquire locks in the fixed order:
     - data-root catalog/membership-index lock
     - lane lock (`.watchtower/lanes/{slug}/state/lane.lock`)
     - operator-session lock
     - projection/index publication lock
     - Each lock records owner PID, process start identity, command, acquisition time
   - `releaseInitLocks`: release in reverse order
   - `shouldUpdateGitignore(controlHome)`: check if `.gitignore` exists and
     whether it contains a `/.watchtower/` line
   - `updateGitignore(controlHome)`:
     - Read current `.gitignore`, compute SHA-256 digest → preserve as originalDigest
     - If `/.watchtower/` not present: append `/.watchtower/` line
       (preserve trailing newline), write to temp file, fsync, atomic rename
       over the original
     - Compute digest of new file → writtenDigest
     - Return `GitignoreUpdate` with both digests
   - `restoreGitignore(controlHome, originalDigest)`:
     - Read current `.gitignore` digest
     - If current digest matches writtenDigest (meaning no other process changed it):
       - Restore the file from the preserved original content
       - If it was newly created: remove it (revert)
     - If current digest does NOT match: report a recoverable conflict, do not
       restore (another process changed the file after init wrote it)
   - `writeBindings(laneDir, bindings)`:
     - Write `repositories.local.json` into the lane directory
     - This is the canonical binding record for this lane

2. **Create `src/foundation/MembershipRegistrar.ts`**
   - `registerLane(laneDir)`:
     - Acquire membership-index lock
     - Read current `repository-memberships.json`
     - Parse, add entry: `{laneId, laneHome, registeredAt}` for each
       repository binding in `repositories.local.json`
     - For each binding: map canonical path → `{laneId, laneHome}`
     - Remove stale entries (paths that no longer resolve to valid lanes)
       but never remove entries for other valid lanes
     - Write updated index to temp file, fsync, atomic rename
     - Release lock
   - `registerLaneWithRetry(laneDir, maxRetries = 3)`:
     - Call `registerLane`, on failure retry up to maxRetries
     - On final failure: return `{registered: false, retryCount, warning}`
       with an explicit registration-warning that the lane is
       home-discoverable but not discoverable from secondary repositories
     - Never leave a half-lane; the lane is already committed

3. **Write focused specs**
   - `spec/foundation/binding-mutator.spec.ts`: lock acquisition order,
     `.gitignore` existence check, `.gitignore` update (append line),
     `.gitignore` restore (digest match), `.gitignore` restore conflict
     (digest mismatch → no restore), `/.watchtower/` already present →
     no duplicate, missing `.gitignore` → create with `/.watchtower/` line
   - `spec/foundation/membership-registrar.spec.ts`: initial registration
     (empty index → populated), additional registration (existing index +
     new lane), stale entry pruning, idempotent registration (no duplicate),
     retry on failure (mock), final failure warning, lock acquisition/release

## Exclusions

- No coordinator/session baseline materialization — that belongs to LC-05
- No pack index bootstrap — that belongs to LC-05
- No watcher or doctor command logic — those belong to LC-06 and LC-07

## Required Proof

### Focused
- Lock acquisition follows declared order
- `.gitignore` updated: `/.watchtower/` line appended when absent
- `.gitignore` not updated: line already present → no change
- `.gitignore` restore: original digest matches → restored correctly
- `.gitignore` restore: original digest mismatch → conflict reported, no restore
- `.gitignore` created from scratch when file absent
- Bindings written to correct path under lane dir
- Membership registration: entry added for all bindings
- Membership registration: idempotent (same lane registered twice → one entry)
- Stale entries pruned during registration
- Registration retry: failure at first, success on retry
- Registration retry: exhausted → warning, no half-lane

### Regression
- `nvb build` passes

### Architecture
- Binding mutator uses lock module, not ad hoc file locking
- Membership registrar accesses only the membership index path, not lane files directly

### Adversarial
- `.gitignore` modified by another process between write and restore
- Concurrent membership index write detection
- Permission denied on membership index write
- Corrupt membership index JSON

## Help and Documentation

- No CLI-facing surface; foundation-only batch
- Update `docs/spec/v1.md` §14 if lock ordering implementation reveals gaps

## Handoff Notes

After acceptance, `BindingMutator.ts` and `MembershipRegistrar.ts` are the
sole owners of repository binding writes and membership index registration.
LC-05 (coordinator baseline) may read the committed lane directory but does
not write bindings. LC-07 (doctor) reads membership index for staleness checks.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **repository/index mutation foundation**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-lane-lifecycle/LC-04-bindings-gitignore-and-membership-registration.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`LC-03`, `RM-07`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Lock order; conditional Git-ignore rollback; post-commit idempotent registration**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **repository/index mutation foundation** and **Lock order; conditional Git-ignore rollback; post-commit idempotent registration**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-lane-lifecycle/LC-04-bindings-gitignore-and-membership-registration.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
