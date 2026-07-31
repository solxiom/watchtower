# RM-01 Correction 01 — Contract Authority And Exhaustive Proof

Status: implemented; closure re-review rejected by `RM-01-correction-02.md`
Rejected review: `../RM-01-review-contract-kernel-and-error-taxonomy.md`
Review report: `.local/agent-reports/wt-read-model/reviews/RM-01-contract-kernel-and-error-taxonomy-review.md`

## Rejection Reasons

1. `src/contracts/errors.ts:32-50` exports a payload and public constructor that
   accept an independently supplied `exitCode`. Runtime proof constructed
   `ERR_INTERNAL` with exit code `5`, bypassing the sole mapping owner in
   `exitCodes.ts`. One registered reason code must have exactly one possible
   public exit mapping.
2. `src/contracts/errors.ts:3-36,53-75` does not satisfy the mandatory error
   contract. Generic messages do not identify a failed operation, safe target,
   or actionable remediation, while unrestricted `Record<string, unknown>`
   details can retain secret-bearing values. The claimed plain-object guard
   also accepts `Date`, `Map`, and null-prototype objects.
3. `src/contracts/types.ts:4` defines `ClaimMode` through `AccessMode`, which
   admits `write`. Resource claims are closed to `read`, `shared-write`, and
   `exclusive-write` by `v1.md` §7.3 and the schema's `batchRepository.claimMode`.
4. `src/contracts/types.ts:7,77-80` includes read-model-only `unknown` in
   `LaneLifecycle`. `v1-contracts.md` §2 says persisted lifecycle is exactly
   `bootstrap | active | paused | complete`; `unknown` is only a read-model
   result.
5. `src/contracts/types.ts:111-119` models a legacy flat worker JSONL record,
   but the higher-precedence `v1-contracts.md` §9 requires every JSONL record
   to validate against schema `$defs.durableEvent`, including version, event
   identity, sequence, lane, producer, correlation/causation, policy, and
   payload fields.
6. `spec/contracts/errors.spec.ts:11-32` does not prove that the exported class
   rejects conflicting mappings, secret-bearing/unsupported detail shapes, or
   the complete valid/boundary/malformed matrix required for every registered
   code. `spec/contracts/types.spec.ts:54-62` uses incomplete object literals,
   so several `@ts-expect-error` assertions can pass because unrelated required
   fields are absent rather than because the intended literal is rejected.
7. The new source and spec files are owned by `kavan4:kavan`, not the required
   `kavan:kavan`.

## Expected Corrected State

1. Make the code-to-exit mapping impossible to override through every exported
   construction path. Derive exit code and message from the registered code;
   do not accept either as independent public input. Add runtime proof that all
   attempted conflicting pairs are rejected or unrepresentable.
2. Replace unrestricted error details with bounded, serializable, redaction-safe
   structured context that always carries operation, safe target, reason code,
   and actionable remediation. Reject non-plain and non-serializable values at
   runtime without retaining credentials or full environment maps.
3. Define resource claim mode independently as
   `read | shared-write | exclusive-write`. Split persisted lifecycle from the
   read-model status union so `unknown` cannot be written as lane lifecycle.
4. Reconcile `WorkerEventV1` with `$defs.durableEvent` under the normative
   precedence. If worker-specific fields are payload fields, model the typed
   payload separately inside the required durable envelope; do not keep the
   flat record as the authoritative JSONL contract.
5. Add focused fixtures for every code's valid and boundary construction,
   exhaustive mapping, conflicting-constructor attempts, and malformed context.
   Rewrite negative type fixtures from otherwise complete valid objects so each
   `@ts-expect-error` proves only the intended invalid field. Cover every public
   RM-01 domain type and relevant schema `additionalProperties` rule.
6. Preserve the complete 23-code mapping currently proved unless the governing
   contract/schema is amended. All touched and newly created files must be
   `kavan:kavan`; `.local/` remains unstaged.

## Exact Files To Change

- `src/contracts/types.ts`
- `src/contracts/errors.ts`
- `src/contracts/exitCodes.ts` if construction ownership requires adjustment
- `src/contracts/index.ts`
- `spec/contracts/types.spec.ts`
- `spec/contracts/errors.spec.ts`
- `spec/contracts/exitCodes.spec.ts`
- `.local/agent-reports/wt-read-model/RM-01-contract-kernel-and-error-taxonomy.md`
- `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- `docs/spec/implementation/wt-read-model/implementation-roadmap.md`

## Required Additional Proof

- Rerun the exhaustive 23-code enumerator and show no missing/extra mapping keys,
  no out-of-range values, and no public construction path that can conflict.
- Rerun all per-code valid, boundary, and malformed fixtures.
- Prove the corrected claim, lifecycle, and durable-worker-event types against
  the governing schema/contracts, including precise negative compile fixtures.
- Prove arbitrary secret-bearing and non-serializable error detail objects are
  rejected or safely normalized without disclosure.
- Run `./node_modules/.bin/nvb build`, `./node_modules/.bin/nvb test`,
  `git diff --check`, ownership checks, implementation-agent no-commit proof,
  and `.local/` staging proof.
