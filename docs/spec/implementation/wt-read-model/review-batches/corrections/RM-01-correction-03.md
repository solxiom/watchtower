# RM-01 Correction 03 — Enforce Runtime Contract Immutability

Status: implemented and independently accepted
Rejected review: `../RM-01-review-contract-kernel-and-error-taxonomy.md`
Prior correction: `RM-01-correction-02.md`
Review report: `.local/agent-reports/wt-read-model/reviews/RM-01-contract-kernel-and-error-taxonomy-review.md`

## Rejection Reasons

1. `src/contracts/errors.ts:3-27` applies `Object.freeze` only to the outer
   `ERROR_DEFINITIONS` object. Every nested definition remains mutable.
   Independent built-code proof changed
   `ERROR_DEFINITIONS.ERR_INTERNAL.messageTemplate`, and the next factory call
   emitted the forged message. This is mutable module-global registry state,
   which remains a hard reject under the engineering standard §5 and §12.1
   item 11.
2. `src/contracts/errors.ts:56-84` returns a runtime-mutable error and mutable
   `details`. Independent proof rewrote a factory-created `ERR_INTERNAL` from
   exit code `1` to `5` and changed `details.reason` to
   `ERR_UNSAFE_MUTATION`. TypeScript `readonly` does not protect JavaScript or
   reflection consumers, so the public invariant can still become conflicting
   after valid construction.
3. `spec/contracts/exitCodes.spec.ts:21-24` verifies only the shallow outer
   freeze, while `spec/basic/sourceArchitectureCheck.spec.ts` covers only
   module-scope collection constructors. The 12-spec suite therefore passes
   while both mutation paths remain reproducible.

## Expected Corrected State

1. Make every exported error definition immutable at runtime, not only the
   outer registry. Freeze each nested definition before export, use primitive
   immutable registry values, or apply another focused construction that proves
   `Object.isFrozen` for the registry and every nested value.
2. Make each returned `WatchtowerError` and its `details` immutable after all
   Error fields are initialized. Mutation attempts against `code`, `exitCode`,
   `message`, and `details.reason/operation/target/remediation` must throw or
   leave the original value unchanged.
3. Retain the immutable private construction token, complete 23-code mapping,
   context validation, corrected domain/event types, architecture gate, and
   ownership/no-commit hygiene from corrections 01 and 02.
4. Add runtime regression fixtures for nested registry mutation and returned
   error/details mutation. A shallow `Object.isFrozen(ERROR_DEFINITIONS)` check
   is insufficient.

## Exact Files To Change

- `src/contracts/errors.ts`
- `spec/contracts/errors.spec.ts`
- `spec/contracts/exitCodes.spec.ts`
- `.local/agent-reports/wt-read-model/RM-01-contract-kernel-and-error-taxonomy.md`
- `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- `docs/spec/implementation/wt-read-model/implementation-roadmap.md`

Do not change the accepted reason-code set, exit mapping, or domain vocabulary.

## Required Additional Proof

- Prove all 23 definition entries and both exported registries are frozen.
- For every error code, attempt runtime mutation of `code`, `exitCode`,
  `message`, the complete `details` object, and each details field; prove the
  created error remains identical to its mapped normalized state.
- Rerun missing/arbitrary-token reflective construction proof for all 115
  code/exit pairs, all malformed contexts, and the durable-event/schema audit.
- Rerun `./node_modules/.bin/nvb build`, `./node_modules/.bin/nvb test`, the
  source-architecture regression, `git diff --check`, ownership checks,
  implementation-agent no-commit proof, and `.local/` staging proof.
