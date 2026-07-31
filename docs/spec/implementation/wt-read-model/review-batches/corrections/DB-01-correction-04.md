# DB-01 Correction 04 — Strictly Validate Lock Records Before Reclaim

Status: implemented and independently accepted
Rejected batch: `DB-01`
Rejected review: `../DB-01-review-sqlite-driver-packaging-and-derived-store-feasibility.md`
Rejection date: 2026-07-31
Reviewer session: `wt-review-DB-01-kavan`
Review report: `.local/agent-reports/wt-read-model/reviews/DB-01-sqlite-driver-packaging-and-derived-store-feasibility-review.md`

## Rejection Reasons

1. **Malformed lock metadata is accepted and used to steal the lock.**
   `src/foundation/storage/writeLockRecord.ts:31-70` validates only that four
   fields are nonempty strings. It does not validate the Linux process-start
   identity grammar, command character/length policy, acquisition timestamp,
   UUID token, exact field set, or record size. A record containing a live PID,
   `processStartIdentity: "not-a-process-start-identity"`, an unsafe secret-like
   command, `acquiredAt: "not-a-timestamp"`, and `token: "not-a-uuid"` was
   parsed as a valid `LockRecord`. Its arbitrary start string mismatched the real
   process and was classified `stale`; `acquireWriteLock` removed it and returned
   `ACQUIRED`.
2. **This contradicts correction 03's fail-safe requirement and the candidate's
   own documentation.** Correction 03 requires malformed or unverifiable
   metadata to remain intact and yield bounded `ERR_LOCK_CONFLICT`. The module,
   ADR, tracker, and implementation report all claim strict field-by-field
   validation, but the current parser proves only presence/type.
3. **The negative fixture is too weak.** `writeLock.spec.ts` covers broken JSON
   and a missing field, but not syntactically present yet invalid fields. It
   therefore passes while a crafted record converts untrusted text into stale
   authority and bypasses the lock.
4. **The ADR contains a duplicated no-JSON-fallback sentence.** The repeated
   line is editorial, but it must be cleaned while synchronizing the corrected
   lock failure model and acceptance evidence.

Independent adverse result:

```json
{"parsed":{"pid":447728,"processStartIdentity":"not-a-process-start-identity","command":"../../secret --token=exposed","acquiredAt":"not-a-timestamp","token":"not-a-uuid"},"outcome":"ACQUIRED","originalLeftIntact":false}
```

## Expected Corrected State

1. Bound the durable record before parsing. Oversized, unreadable, malformed,
   incomplete, or extra-field records fail closed and remain untouched.
2. Validate exactly the five allowed keys and each value independently:
   positive integer PID; supported process-start identity grammar or the
   explicit `unverifiable` marker; bounded character-safe/path-free command;
   canonical valid acquisition timestamp; and canonical UUID token.
3. Only a fully validated record may reach `classifyRecordedProcess` or token
   comparison. Invalid `processStartIdentity` text must never be interpreted as
   evidence of PID reuse.
4. Apply the same parser and fail-safe behavior to both the main lock and the
   reclaim sentinel. Preserve the real matching-start/active and
   mismatched-real-start/stale classifications that correction 03 added.
5. Correct the ADR/tracker/report claims and remove the duplicated
   no-JSON-shard-fallback sentence.

## Required Additional Proof

- Add table-driven negative fixtures for oversized JSON, extra fields, unsafe or
  overlong command, invalid process-start grammar, invalid timestamp, invalid
  token UUID, invalid PID, missing fields, and broken JSON. Each must produce
  bounded `ERR_LOCK_CONFLICT` and leave the original record byte-identical.
- Run the same invalid-record matrix against reclaim-sentinel admission, proving
  no contender deletes an unverifiable sentinel.
- Retain and rerun the real-process matching start, genuine reused PID, dead
  owner, concurrent exclusion, successor-safe release, external `SIGKILL`,
  lock-before-SQLite, writer/publication race, and actual SQLite busy proofs.
- Re-run all 15 DB-01 items, the exact seven warning-band inventory,
  `nvb build`, `nvb test`, `nvb dist`, `npm install -g ./dist`, global native
  loading, `git diff --check`, ownership, no-commit, and `.local` staging checks.

## Exact Files To Change

- `src/foundation/storage/writeLockRecord.ts`
- `src/foundation/process/processIdentity.ts` only if shared validators/constants
  belong with the identity grammar
- `spec/storage/writeLock.spec.ts`
- `spec/foundation/processIdentity.spec.ts` if identity grammar validation lives
  there
- `docs/spec/decisions/sqlite-driver-selection.md`
- `.local/agent-reports/wt-read-model/DB-01-sqlite-driver-packaging-and-derived-store-feasibility.md`
- `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- `docs/spec/implementation/wt-read-model/implementation-roadmap.md`
- the paired DB-01 work/review brief status lines

Correction 04 must preserve all independently passing correction-02/03 work:
the commons facade selection, Node floor, safe integers, private parameterized
SQL, full FK matrix, WAL/busy/permissions/integrity/corruption/rebuild/semantic
root/crash proofs, the closed committed-write-loss race, real process-start/PID
reuse detection, token/sentinel successor protection, seven warning-band
inventory, projection-vs-lane-lock wording, and no JSON fallback.
