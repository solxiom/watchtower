# DB-01 Correction 03 — Complete Durable Lock Identity And Stale-Owner Proof

Status: re-reviewed and rejected — superseded by `DB-01-correction-04.md`
Rejected batch: `DB-01`
Rejected review: `../DB-01-review-sqlite-driver-packaging-and-derived-store-feasibility.md`
Rejection date: 2026-07-31
Reviewer session: `wt-review-DB-01-kavan`
Review report: `.local/agent-reports/wt-read-model/reviews/DB-01-sqlite-driver-packaging-and-derived-store-feasibility-review.md`

## Rejection Reasons

1. **The production lock record violates the governing §11 contract.**
   `src/foundation/storage/sqliteWriteLock.ts:39-43,154-170` records only
   `{pid, token, startedAt}`. Here `startedAt` is constructed with `new Date()`
   at acquisition, so it is the acquisition timestamp—not the holder process's
   start identity. The record contains no command. `docs/spec/v1-contracts.md
   §11` requires owner PID, process start identity, command, and acquisition
   time and explicitly says a PID alone is insufficient stale-lock proof.
2. **Stale detection still relies on PID liveness alone.**
   `holderIsAlive` calls only `process.kill(holder.pid, 0)` and never compares a
   process-start identity. A stale lock whose PID has been reused is therefore
   treated as live forever (until manual deletion), contrary to the required
   stale-owner recovery model. The UUID token correctly prevents one
   acquisition from releasing another acquisition's lock, but it cannot prove
   whether the operating-system process currently using a PID is the process
   that created the durable record.
3. **The submitted PID-reuse proof asserts the wrong contract.**
   `spec/storage/writeLock.spec.ts:89-97` writes a foreign token against the
   current live PID and expects `ERR_LOCK_CONFLICT`, calling that PID-reuse
   safety. It supplies no recorded process-start identity to compare. An
   independent proof wrote `{pid: process.pid, token: 'stale-from-reused-pid',
   startedAt: '1970-01-01T00:00:00.000Z'}`; acquisition returned
   `ERR_LOCK_CONFLICT`. This demonstrates that the implementation cannot
   distinguish a genuine live holder from a dead holder whose PID was reused.
4. **The ADR and implementation report overstate the lock proof.** They say
   ownership is safe against PID reuse and that the §11 order is fixed, but the
   required process-start/command metadata and reused-PID stale test are absent.
   The current adapter proves the projection-lock-before-SQLite portion only;
   it explicitly is not yet the lane lock.
5. **The mandatory warning-band inventory is incomplete.** Independent AST
   reproduction found seven 41–60-line callbacks, while the implementation
   report lists only four. It omits the 42-line typed-access group, 43-line FK
   group, and 41-line lock-ownership group. All seven are cohesive and below
   the hard limit, but the evidence record must be accurate before acceptance.

## Expected Corrected State

1. Give every mutation/reclaim-sentinel record distinct, validated fields for:
   owner PID, actual process start identity, safe command identity, acquisition
   timestamp, and per-acquisition token. Do not reuse acquisition time as
   process-start identity.
2. Determine liveness by matching both PID and process-start identity. A live
   PID with a mismatched start identity is a stale owner and may be reclaimed
   under the token/sentinel protocol; a matching PID/start identity remains an
   active holder even when its token is foreign to the contender.
3. Keep token-checked release and stale-token re-verification so correcting
   liveness does not weaken the successor-lock protection that now passes.
4. Inspect pinned Nirvana/process APIs before adding platform code. If no
   conforming process-identity capability exists, keep the smallest focused
   adapter and document the exact supported-platform behavior and failure
   mode. Malformed/unverifiable metadata must fail safely with a bounded,
   actionable lock conflict rather than being stolen.
5. Describe this store lock accurately as the projection/index publication
   lock. Document that a later caller must hold the lane lock outside it; do not
   claim this adapter alone proves the full lane-lock integration.
6. Correct the implementation report's warning-band function inventory and
   retain explicit reviewer judgment for all seven cohesive callbacks.

## Required Additional Proof

- Add a real-process identity fixture proving matching PID + matching process
  start is active, and matching/reused PID + mismatched process start is stale
  and reclaimable.
- Prove the durable lock and reclaim-sentinel records contain separate
  `processStartIdentity`, `command`, `acquiredAt`, and token fields with bounded,
  safe values.
- Preserve and rerun active-holder exclusion, timeout, dead-process reclaim,
  concurrent stale reclaim, successor-safe release, idempotent release,
  external `SIGKILL`, lock-before-SQLite, ordinary-writer/publication exclusion,
  and actual SQLite busy-translation tests.
- Re-run the complete 15-item DB-01 matrix, `nvb build`, `nvb test`, `nvb dist`,
  `npm install -g ./dist`, global native-binding smoke, `git diff --check`,
  ownership checks, implementation-agent no-commit proof, and `.local` staging
  proof.
- Reproduce the physical module/function/constructor inventory and list every
  function/callback in the 41–60-line warning band.

## Exact Files To Change

- `src/foundation/storage/sqliteWriteLock.ts`
- a focused process-identity adapter/port and its tests if the required
  capability is not already available in pinned Nirvana
- `spec/storage/writeLock.spec.ts`
- `spec/storage/concurrency.spec.ts` if external-crash metadata assertions live
  with that proof
- `spec/storage/mutationLock.spec.ts` if needed to retain the full regression
- `docs/spec/decisions/sqlite-driver-selection.md`
- `.local/agent-reports/wt-read-model/DB-01-sqlite-driver-packaging-and-derived-store-feasibility.md`
- `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- `docs/spec/implementation/wt-read-model/implementation-roadmap.md`
- the paired DB-01 work/review brief status lines

Correction 03 must preserve all correction-02 behavior that independently
passed: one lifetime mutation lock shared by ordinary writers and publication,
the closed committed-write-loss race, real `DB_BUSY` translation, typed FK
insert/update/delete, integrity admission, path-free domain store capabilities,
safe-integer rows, owner-only modes, staged/semantic reproduction, external
crash recovery, the commons facade selection, Node `>=26.4.0`, and the explicit
no-JSON-shard-fallback rule.
