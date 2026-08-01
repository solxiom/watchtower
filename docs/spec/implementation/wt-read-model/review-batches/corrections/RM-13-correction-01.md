# RM-13 Correction 01 — Preserve Every Valid JSON Property

Status: functionally closed; batch accepted through `RM-13-correction-02.md`
Rejected batch: `RM-13`
Rejected review: `../RM-13-review-deterministic-json-schema-composition.md`
Rejection date: 2026-08-01
Reviewer session: `wt-review-RM-13-kavan2`
Review report: `.local/agent-reports/wt-read-model/reviews/RM-13-deterministic-json-schema-composition-review.md`

## Rejection Reason

`schemaFragmentParser.ts:97-101`, `SchemaComposer.ts:87-119`, and
`jsonCanonicalizer.ts:49-52` copy untrusted JSON keys into ordinary `{}`
objects by assignment. For the valid JSON property name `__proto__`, this
invokes the inherited prototype setter rather than creating an own data
property. An independent two-fragment probe supplied one `__proto__` definition;
the composer returned `ok: true`, reported no definitions, and emitted no such
definition. Nested objects are exposed to the same silent canonicalization and
semantic-digest corruption.

The focused suite has no regression for JavaScript special-property names, so
the full passing build/test result does not establish the closed JSON contract.

## Expected Corrected State

1. Every admitted JSON property is copied into a representation immune to
   inherited setters, such as a null-prototype record or explicit own-property
   definition. Apply the rule consistently to fragment content, aggregate root,
   `$defs`, and recursively canonicalized objects.
2. Do not reject `__proto__` merely because of JavaScript object semantics; it
   is a valid JSON and JSON Schema definition/property name.
3. The emitted aggregate retains the definition/property as an own key, the
   definition inventory includes it, and changing its value changes canonical
   bytes and semantic digest.
4. Duplicate-definition, unresolved/escaping-reference, root-conflict,
   inclusion, failure-order, stale, replay, and atomic file behavior remain
   unchanged.

## Exact Files To Change

- `src/foundation/schemaComposition/schemaFragmentParser.ts`
- `src/foundation/schemaComposition/SchemaComposer.ts`
- `src/foundation/schemaComposition/jsonCanonicalizer.ts`
- `spec/schemaComposition/schemaComposer.spec.ts` or a new focused
  special-property regression spec
- `.local/agent-reports/wt-read-model/RM-13-deterministic-json-schema-composition.md`
- `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- the RM-13 work/review brief status lines
- this correction brief status line on re-review

If the correction discovers another ordinary-object assignment in the owned
composition path, that owner and its focused spec are also in scope.

## Required Additional Proof

- Prove `__proto__` at the fragment root, as a `$defs` name, and in a nested
  schema object survives as an own emitted property.
- Prove the corrected `definitionNames`, canonical bytes, and semantic digest
  include the value and remain identical under reversed fragment order and a
  second generation.
- Retain the original exact reason codes for duplicate `$defs`, unresolved
  `$ref`, root conflict, and circular inclusion.
- Re-run the 25 focused specs plus new regressions, `nvb build`, `nvb test`,
  `nvb dist`, compiled-catalog check/generate relocation, aggregate before/after
  hash proof, `git diff --check`, size/function inventory, ownership, staging,
  and forbidden-path checks.

All other RM-13 scope, ownership, dependency, and acceptance criteria remain
unchanged. No adjacent task-catalog aggregation or command behavior enters this
correction.
