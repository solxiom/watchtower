# RM-01 Correction 02 — Remove Mutable Global Error Authority

Status: implemented; closure re-review rejected by `RM-01-correction-03.md`
Rejected review: `../RM-01-review-contract-kernel-and-error-taxonomy.md`
Prior correction: `RM-01-correction-01.md`
Review report: `.local/agent-reports/wt-read-model/reviews/RM-01-contract-kernel-and-error-taxonomy-review.md`

## Rejection Reason

`src/contracts/errors.ts:31,61-85` introduces the module-global mutable
`approvedPayloads` `WeakSet` and mutates it on every error construction. The
mandatory engineering standard §5 requires state to be scoped explicitly and
forbids mutable global state; §12.1 item 11 makes mutable global state a hard
reject. Passing functional tests and eventual WeakSet garbage collection do not
remove the ambient authorization state or its hidden mutation.

The current suite did not catch this violation. The engineering standard §11
requires source-architecture gates, and a repeatable missed violation must add
or improve an automated gate in the same correction.

## Expected Corrected State

1. Remove `approvedPayloads` and every other mutable module-global collection or
   authorization registry from the contract kernel.
2. Keep runtime construction unforgeable without ambient mutation. A suitable
   shape is a module-private immutable symbol/token checked by the private
   constructor, with message, exit code, and details still derived solely by
   `fromCode`. The private token must not be exported, stored on the returned
   error, or accepted from callers.
3. Retain all correction 01 behavior: 23 complete mappings, no forged public
   payload construction, bounded redaction-safe context, corrected claim and
   lifecycle vocabularies, durable worker-event envelope, precise negative
   fixtures, and `kavan:kavan` ownership.
4. Add a source-architecture regression spec that fails if contract modules
   introduce module-scope mutable collections/registries. Keep the rule focused
   enough to permit local collections scoped inside pure functions/tests while
   preventing ambient state.

## Exact Files To Change

- `src/contracts/errors.ts`
- `spec/contracts/errors.spec.ts`
- `spec/basic/sourceArchitectureCheck.spec.ts` (new focused architecture gate)
- `.local/agent-reports/wt-read-model/RM-01-contract-kernel-and-error-taxonomy.md`
- `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- `docs/spec/implementation/wt-read-model/implementation-roadmap.md`

Do not change the established public reason-code registry, exit mapping, or
domain vocabulary unless a new governing-contract defect is independently
identified.

## Required Additional Proof

- Prove both public factory paths derive the same mapped result for all 23 codes.
- Prove reflective construction with missing, arbitrary, and forged symbols is
  rejected for every code/exit-code pair.
- Run the new architecture regression spec and show it fails against the
  mutable-WeakSet form and passes against the stateless corrected form.
- Rerun `./node_modules/.bin/nvb build`, `./node_modules/.bin/nvb test`, the
  exhaustive mapping/malformed-context enumerator, `git diff --check`, ownership
  checks, implementation-agent no-commit proof, and `.local/` staging proof.
