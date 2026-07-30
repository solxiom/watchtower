# Review Batch RM-01 — Contract Kernel And Error Taxonomy

Status: ⏳ Awaiting review
Reasoning: `R4`
Paired work brief: `work-batches/RM-01-contract-kernel-and-error-taxonomy.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-01-contract-kernel-and-error-taxonomy.md`

## Scope Verification

- [ ] `src/contracts/types.ts` created with all domain types from v1.md and v1.schema.json
- [ ] `src/contracts/errors.ts` created with complete error taxonomy
- [ ] `src/contracts/exit-codes.ts` created with ExitCode union and mapping
- [ ] `src/contracts/index.ts` updated to export all public symbols
- [ ] No foundation or CLI logic in `src/contracts/`
- [ ] No Nirvana rendering dependencies in `src/contracts/`

## Required Independent Proof

1. Enumerate every exported error code. Verify each maps to exactly one exit code in the 1-5 range. Prove no code is unmapped or maps to multiple exit codes.
2. Compare every domain type against `v1.schema.json` definitions. Every `$defs` entry must have a corresponding TypeScript type.
3. Verify every error code fixture: valid construction, boundary values, malformed input rejection.
4. Run `nvb build` and `nvb test`. Confirm focused specs pass.
5. Verify `src/contracts/index.ts` exports all symbols required by downstream batches.
6. Confirm no `any`-typed public interfaces exist.

## Required Reasoning Posture

The reviewer must reason from the governing specifications and current source,
not from the implementation report alone. Inspect every file independently.
Compare error codes against the spec-mandated exit-code mapping table. Verify
every domain type has correct field names, types, and required/optional markers.

## Structural And Module-Size Acceptance

- Verify each contract file is within the appropriate size band.
- Confirm no `helpers`, `utils`, `common`, or `misc` modules.
- Verify `index.ts` is a thin barrel (target ≤160 lines).

## Required Review Packet

The review report must include: independently rerun proof commands and outcomes,
structural verification results, line-count verification, tracker/roadmap sync
status, and the acceptance or rejection decision.

## Acceptance Gate

- All hard-reject checklist items are clear.
- Every error code maps to exactly one exit code.
- All domain types match v1.schema.json.
- `nvb build` and `nvb test` pass with zero failures.
- No product logic in `src/cli.ts`.
- Tracker and roadmap updated.

## Reject Conditions

- Unmapped or multiply-mapped error codes.
- Missing required field in domain types.
- `any`-typed public interfaces.
- Foundation or CLI dependencies in contracts.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.
