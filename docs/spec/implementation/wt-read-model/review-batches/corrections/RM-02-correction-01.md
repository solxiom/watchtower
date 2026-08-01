# RM-02 Correction 01 — Restore Schema And Presentation Authority

Status: implemented; closure re-review rejected by `RM-02-correction-02.md`
Rejected batch: RM-02
Rejected review: `../RM-02-review-json-envelopes-and-schema-validation.md`
Rejected on: 2026-07-31
Reviewer session: `wt-review-RM-02-kavan4`
Review report: `.local/agent-reports/wt-read-model/reviews/RM-02-json-envelopes-and-schema-validation-review.md`

## Rejection Reasons

1. `src/contracts/types.ts:16-29` and
   `src/foundation/commandEnvelopeSerializer.ts:15-28,49-54,67-74,87-89`
   restrict `commandResult.data` and `commandError.error.details` to non-array
   objects. The governing schema at `docs/spec/schemas/v1.schema.json:246-266`
   leaves both subschemas open (`{}`), so every JSON value is valid there.
   Independent built-code proof succeeded only for object values and rejected
   array, string, number, boolean, and null values. The focused spec compounds
   the drift by asserting at
   `spec/foundation/commandEnvelopeSerializer.spec.ts:49-53` that array data is
   invalid.
2. `src/foundation/commandEnvelopeSerializer.ts:20-28,95-100` accepts an
   arbitrary code, message, and independent exit code. Built-code proof created
   `ERR_INTERNAL` with exit code `5`. This bypasses the accepted RM-01 registry
   and sole code-to-exit mapping owner. The local regex named `isErrorCode` is
   schema syntax validation, not proof that a code is registered. Line 116 also
   restates the validation error's exit family instead of carrying the mapping
   already derived by the contract owner.
3. `src/foundation/commandEnvelopeSerializer.ts:31-120` is a handwritten
   partial duplicate of `$defs.commandResult` and `$defs.commandError`; neither
   it nor the focused specs validate through the active bundled schema. That
   duplication already drifted as described above. It also accepts values that
   are not JSON-serializable: `{value: 1n}` builds successfully and later makes
   `renderResult` throw a generic `TypeError`. `requireValidEnvelope` likewise
   converts construction failures to a generic `TypeError` rather than the
   stable typed contract failure.
4. `src/foundation/ResultRenderer.ts:8-17` implements human presentation with a
   local `JSON.stringify` template, imports no Nirvana presentation API, and
   never reads `noColor`. The pinned `pretty.view()`/`TerminalView` does expose
   `renderToString`, and comparable Nira command renderers use injected
   `TerminalView` methods. The pinned facade has a narrower per-call no-color
   gap because color level is resolved from environment at module load; that
   gap does not justify bypassing the available Nirvana human-presentation
   surface entirely. The current no-color test passes vacuously because both
   option values use the same permanently unstyled path.

## Expected Corrected State

1. Introduce one explicit serializable JSON-value contract and use it for
   `data` and optional `details`. Construction and validation must accept every
   schema-permitted JSON kind and reject non-JSON values, cycles, and values
   whose serialization would remove required envelope members or change their
   contract meaning.
2. Preserve the distinction between parsing an external schema-valid error
   code string and constructing a Watchtower-owned error. Public construction
   must consume the accepted RM-01 error owner (or a centrally derived typed
   payload) and must not accept independently supplied code/message/exit
   combinations. No serializer-local owner may remap a registered code.
3. Validate against the active bundled `$defs.commandResult` and
   `$defs.commandError` rather than maintaining an unsynchronized partial
   schema copy. Invalid/hostile input must produce the stable typed
   `ERR_PARSE_FAILURE` contract path without a generic panic. Record the schema
   validator/library choice and its bundled-asset/runtime implications in the
   Nirvana audit; do not invent a second schema source.
4. Route human presentation through the pinned Nirvana
   `pretty.view()`/`TerminalView` boundary (preferably as an injected view/port
   for focused tests). Keep exact compact JSON serialization as the undecorated
   machine-output path. Document and narrowly solve the proven explicit
   per-call no-color gap without a local ANSI/color framework, ambient global
   mutation, or direct terminal I/O.
5. Replace the false-negative fixtures with a complete matrix: all JSON value
   kinds for `data` and `details`; all exit families; every required-field,
   type, exit-code, top-level-property, and nested-error-property rejection;
   nested additive compatibility; non-JSON/cyclic rejection; conflicting
   registered-code/exit attempts; and JSON/human/no-color presentation.

## Exact Files To Change

- `src/contracts/types.ts`
- `src/contracts/index.ts` if the serializable JSON contract is exported
- `src/foundation/commandEnvelopeSerializer.ts`
- `src/foundation/ResultRenderer.ts`
- `src/foundation/index.ts` if the corrected presentation boundary changes
- `spec/foundation/commandEnvelopeSerializer.spec.ts`
- `spec/foundation/ResultRenderer.spec.ts`
- `package.json` and `package-lock.json` only if a schema-validator dependency
  is required after the mandated pinned-package audit
- `.local/agent-reports/wt-read-model/RM-02-json-envelopes-and-schema-validation.md`
- `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- `docs/spec/implementation/wt-read-model/implementation-roadmap.md`
- this correction brief when its status changes

The illustrative object-only signatures in the earlier RM-02 launch prompt are
subordinate to the governing schema and this correction. Do not change the
schema bundle merely to preserve those stale signatures.

## Required Additional Proof

- Build, serialize, parse, and validate each JSON value kind for
  `commandResult.data` and `commandError.error.details` against the active
  bundled schema.
- Build each exit family from registered RM-01 errors and prove no public path
  can create a conflicting registered code/exit pair.
- Prove all closed-envelope rejection cases and all schema-permitted nested
  additions through both the runtime validator and an independent Draft
  2020-12 schema validator.
- Prove non-JSON values and cycles fail through the stable typed contract path
  before rendering.
- Prove JSON output is one compact undecorated value and human output is owned
  by the Nirvana presentation boundary; prove `noColor` changes or selects the
  conforming uncolored path rather than being ignored.
- Rerun `nvb build`, `nvb test`, `git diff --check`, line/function counts,
  ownership, implementation-agent no-commit, and `.local` staging checks.

All other RM-02 acceptance criteria remain unchanged. This correction does not
authorize command integration, schema weakening, a new error taxonomy, direct
terminal output, or implementation by the reviewer.
