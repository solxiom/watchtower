# RM-02 Correction 02 — Close Structure, Trust, And Evidence Gates

Status: correction complete — awaiting independent re-review
Rejected batch: RM-02 correction 01 re-review
Rejected review: `../RM-02-review-json-envelopes-and-schema-validation.md`
Rejected on: 2026-07-31
Reviewer session: `wt-review-RM-02-kavan4`
Prior correction: `RM-02-correction-01.md`
Review report: `.local/agent-reports/wt-read-model/reviews/RM-02-json-envelopes-and-schema-validation-review.md`

## Rejection Reasons

1. `nvb.json:7-33,198` grows the already oversized hand-maintained repository
   task registry from 202 to 213 physical lines. The project matrix hard-rejects
   registries over 180 lines, and touched legacy files must become smaller, be
   split, or remain line-count neutral under a separately accepted extraction
   plan. No exception or plan exists. The two new schema-copy tasks also use
   compressed one-line handler definitions, which cannot be used to evade the
   structural limit.
2. `src/foundation/schemaBundle.ts:3-6` parses a runtime file through an
   unchecked cast, while
   `src/foundation/commandEnvelopeSerializer.ts:13,16-17,42,83,98` adds further
   schema-boundary casts and non-null assertions. The engineering standard
   requires external/runtime data to enter as `unknown`, be validated, and be
   normalized without unchecked trust-boundary casts or `!`. A missing,
   malformed, or incompatible staged schema/definition must fail through an
   explicit typed integrity/contract path rather than relying on module-load
   exceptions or asserted validator existence.
3. `src/foundation/schemaBundle.ts:1-6` introduces direct `node:fs` asset
   loading without the mandatory Nirvana-first comparison and documented
   `NIRVANA_API_GAP`. RM-03's deferred CLI-safe storage bootstrap may justify a
   focused platform adapter, but that boundary, its missing semantics, and its
   runtime failure behavior must be stated and proved rather than denied.
4. The required implementation report is not a truthful review packet.
   `.local/agent-reports/wt-read-model/RM-02-json-envelopes-and-schema-validation.md:36-38`
   says package, lock, and NVB configuration are unchanged; lines 52-59 omit
   `schemaBundle.ts`, `nvb.json`, dependencies, and package files; lines 65-68
   describe the removed local human renderer and claim no filesystem/NVB
   behavior; and lines 74-82 retain obsolete counts. The actual serializer is
   100 lines, renderer 22, schema loader 6, contracts 169/52, and specs 65/34.
   Required changed-file ownership, the direct-filesystem/Nirvana comparison,
   schema-validator choice, runtime asset implications, and current structural
   inventory are therefore absent or contradictory.

## Architect Reclassification — Not An RM-02 Rejection Ground

The fresh-prefix tarball attempt that returned npmjs.org `E404` for
`@nirvana/b-core@*` used an undeclared public-registry channel. It does not show
that Watchtower's project-pinned Nirvana ecosystem is absent or invalid.

The 2026-08-01 installed-ecosystem audit resolved Watchtower's selected
`1.0.0-alpha` release at
`/home/kavan/.nirvana/ecosystem/versions/1.0.0-alpha`, validated manifest digest
`9d18a2f764ce32f22825200c9126e57897e40f09803a79815cca492fdc7b4c6d`, and
proved the `b-core`, `base`, `builder`, `commons`, and `framework` projections
resolve into that version store. RM-02 does not own publication of Nirvana
packages to npmjs.org or the global CLI ecosystem projection/bootstrap
contract. Those belong to runtime-distribution/release work. The E404 is
therefore removed from this correction's rejection reasons and must not be
"fixed" by this feature batch.

## Preserved Passing Behavior

Correction 01's behavior must remain unchanged. Independent re-review proved:

- all six JSON value kinds build and validate in `commandResult.data` and
  `commandError.error.details` (12 schema-valid envelopes);
- all tested closed-object, missing-field, wrong-type, and exit-code failures
  reject;
- forged independent error construction rejects and RM-01 owns exit mapping;
- BigInt, non-finite numbers, and cycles reject before rendering;
- JSON output is one compact undecorated value; and
- human/no-color output routes through the TerminalView boundary and strips
  ANSI only on the selected no-color path.

Do not regress or redesign these corrected behaviors.

## Expected Corrected State

1. Remove the structural violation. Do not grow the 202-line base registry.
   Use a cohesive accepted extraction/generation shape or another NVB-native
   asset-staging mechanism that leaves every touched registry within policy.
   If a legacy remediation plan is proposed, it must be accepted before
   implementation and may not authorize further growth.
2. Give schema loading/compilation a focused boundary that parses as `unknown`,
   validates the bundle identity and required definitions, checks compiled
   validator availability explicitly, and maps failures to the appropriate
   stable typed contract/integrity error. Remove every unchecked cast and
   non-null assertion at that boundary.
3. Complete the Nirvana-first audit for schema asset loading. Document why
   direct filesystem access is required before RM-03's CLI-safe Nirvana storage
   bootstrap, name the exact facade semantics that do not fit, and keep the
   platform access inside one focused adapter; otherwise use a conforming
   pinned facade.
4. Rewrite the implementation report so every statement describes the current
   correction tip. Include all changed files, current counts/categories,
   responsibility inventories, the complete Nirvana/API-gap audit, dependency
   and staged-asset decisions, exact commands/outcomes, ownership, no-commit,
   and staging evidence. Remove superseded claims rather than appending a new
   paragraph above contradictory history.
5. Run source/build/test proof against the project-pinned installed Nirvana
   `1.0.0-alpha` projection and an appropriate ecosystem-equipped detached
   feature proof. Materialize the supported target-local projection from that
   same validated ecosystem version and prove resolution stays inside the
   version store. Do not use npmjs.org availability as RM-02 evidence and do
   not expand this correction into global CLI projection or release-channel
   design.

## Implementer correction record — 2026-08-01

Status superseded by the completed correction evidence below.

- RM-02 removed its `schema:copy-build` and `schema:copy-dist` additions and
  restored the root `nvb.json` to 202 lines. It does not recreate RM-13 schema
  composition or RT-08 dependency-closure/distribution ownership.
- The new focused schema-asset boundary parses file bytes as `unknown`, checks
  the RM-13 aggregate `$id` and the two required envelope definitions, checks
  compiled Ajv validators explicitly, and maps unreadable/malformed/wrong-ID/
  missing-definition cases to `ERR_INTEGRITY_FAILURE`. It uses no unchecked
  cast or non-null assertion at that boundary.
- `NIRVANA_API_GAP:RUNTIME_READONLY_SCHEMA_ASSET` is documented in the RM-02
  implementation report: the inspected pinned facade offers no CLI-safe,
  read-only packaged-asset operation with typed absent/malformed results before
  RM-03 storage bootstrap. Direct `node:fs` access is contained to one
  fixed-path read-only adapter and its focused tests.
- The selected `/home/kavan3/.nirvana/ecosystem/versions/1.0.0-alpha`
  projection passes the ecosystem audit. The accepted RM-13 task boundary
  checks/generates the source aggregate only; the accepted RT-08 closure fixture
  packages Nirvana dependencies only. Neither exposes the required schema-asset
  staging interface. RM-02 cannot truthfully pass build/dist/detached schema
  proof without an owner-provided RM-13/RM-11/RT-08 staging surface.

## Correction completion — 2026-08-01

- Added capability-owned `distributionAssets.nvb.json` through NVB's pinned
  parent-config mechanism. It stages the generated aggregate after build and
  dist compilation with the Nirvana `CopyHandler` and deterministic overwrite.
- Extracted the existing bin/help/config copy tasks into that parent. Root
  `nvb.json` is now 173 lines (from 202); the parent registry is 63 lines.
- Source/build and source/dist schema bytes compare equal, and both compiled
  loaders return the canonical schema identity.
- Against accepted ecosystem manifest
  `9d18a2f764ce32f22825200c9126e57897e40f09803a79815cca492fdc7b4c6d`,
  `nvb build`, `nvb test` (243 specs, 0 failures), and `nvb dist` pass.
- `git diff --check` passes; no implementation commit or staged `.local` path
  exists. Correction 02 is ready for independent re-review.

## Exact Files To Change

- `nvb.json` and any accepted capability-owned NVB development catalog fragment
- `src/foundation/schemaBundle.ts` (or its more precise replacement boundary)
- `src/foundation/commandEnvelopeSerializer.ts`
- focused schema-loader/serializer specs
- `package.json` and `package-lock.json` only if RM-02's non-Nirvana runtime
  dependencies change; do not alter Nirvana publication/projection channels
- `.local/agent-reports/wt-read-model/RM-02-json-envelopes-and-schema-validation.md`
- `docs/spec/implementation/wt-read-model/implementation-tracker.md`
- `docs/spec/implementation/wt-read-model/implementation-roadmap.md`
- `RM-02-correction-01.md` and this correction brief when statuses change

## Required Additional Proof

- Rerun the complete original RM-02 and correction 01 schema/rendering matrix.
- Prove malformed, missing, wrong-ID, and missing-definition schema assets fail
  deterministically without unchecked assertions or generic module-load panic.
- Reproduce physical module/function/registry counts and the hard-reject
  architecture scan, including before/after `nvb.json` evidence.
- Run `nvb build`, `nvb test`, and the feature-appropriate dist/schema checks
  against the validated project projection.
- Equip the detached target from the selected
  installed ecosystem, record version-root/manifest provenance, prove every
  `@nirvana/*` resolution stays in that store, and exercise schema loading plus
  both render modes. Public-registry/global-bootstrap qualification remains
  outside RM-02.
- Run `git diff --check`, ownership, implementation-agent no-commit, and
  `.local` staging checks.

All other RM-02 and correction 01 acceptance criteria remain unchanged. This
correction does not authorize command integration, schema changes, product-code
edits by the reviewer, public Nirvana publication, or global CLI projection
design. Await coordinator authorization before remediation or re-review.
