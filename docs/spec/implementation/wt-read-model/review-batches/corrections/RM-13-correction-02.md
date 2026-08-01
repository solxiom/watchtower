# RM-13 Correction 02 — Make Candidate Hygiene Proof Complete

Status: ✅ Implemented and independently accepted
Rejected batch: `RM-13`
Rejected review: `../RM-13-review-deterministic-json-schema-composition.md`
Prior correction: `RM-13-correction-01.md` (functional behavior closed)
Rejection date: 2026-08-01
Reviewer session: `wt-review-RM-13-kavan2`
Review report: `.local/agent-reports/wt-read-model/reviews/RM-13-deterministic-json-schema-composition-review.md`

## Rejection Reason

The final exact acceptance candidate fails `git diff --cached --check`:

```text
runtime-nvb/handlers/SchemaCompositionTaskHandler.ts:26: new blank line at EOF.
runtime-nvb/handlers/schema/SchemaAggregateWriter.ts:60: new blank line at EOF.
runtime-nvb/handlers/schema/SchemaFileBoundaryError.ts:11: new blank line at EOF.
runtime-nvb/handlers/schema/schemaCompositionTaskContracts.ts:38: new blank line at EOF.
```

The implementation report's passing `git diff --check` was run while these and
the other new RM-13 files were untracked. That command does not inspect
untracked bytes, so it was not evidence for the proposed candidate. All
correction-01 `__proto__`, mandatory schema, build/test/dist, stale,
relocation, deterministic, size, API, and ownership behavior otherwise passed
independent re-review.

## Expected Corrected State

1. Remove the extra blank line at EOF from exactly the four reported runtime
   files. Preserve one normal terminating newline and all behavior.
2. Stage the complete RM-13 candidate and run `git diff --cached --check` so
   every formerly untracked path is examined. Record the exact passing result.
3. Return the index to empty after proof; the implementer still does not
   commit.
4. Preserve correction 01's own-property implementation and regression without
   weakening any original RM-13 gate.

## Exact Files To Change

- `runtime-nvb/handlers/SchemaCompositionTaskHandler.ts`
- `runtime-nvb/handlers/schema/SchemaAggregateWriter.ts`
- `runtime-nvb/handlers/schema/SchemaFileBoundaryError.ts`
- `runtime-nvb/handlers/schema/schemaCompositionTaskContracts.ts`
- `.local/agent-reports/wt-read-model/RM-13-deterministic-json-schema-composition.md`
- `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- the RM-13 work/review/correction status lines
- this correction brief status line on re-review

## Required Proof

- Stage the complete candidate, pass `git diff --cached --check`, list the
  staged paths, prove no forbidden/local/generated path is staged, then restore
  an empty index for reviewer handoff.
- Re-run the 27 focused schema specs, full `nvb build`, `nvb test`, `nvb dist`,
  special-key value/inventory/order/digest proof, mandatory reason-code matrix,
  stale no-write, relocated check/generate/replay, in-tree no-op generation,
  byte/digest reproduction, size/function inventory, ownership, and final Git
  hygiene.

All other RM-13 scope and acceptance criteria remain unchanged. Correction 02
does not authorize refactoring, adjacent task aggregation, or command changes.
