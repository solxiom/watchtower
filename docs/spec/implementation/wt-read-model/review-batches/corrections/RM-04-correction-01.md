# RM-04 Correction 01 — Close Scalar Grammar And Parser Boundaries

Status: implemented but rejected in re-review; superseded by accepted correction 02
Rejected review: `../RM-04-review-strict-env-and-lane-state-parsers.md`
Review report: `.local/agent-reports/wt-read-model/reviews/RM-04-strict-env-and-lane-state-parsers-review.md`

## Rejection Reasons

1. The scanner accepts shell-significant bytes that do not round-trip between
   the strict TypeScript projection and the narrowly retained source-compatible
   leaf projection. This violates `v1.md` §8 and the review acceptance gate.
2. Duplicate authoritative lifecycle records overwrite one another. The exact
   state `lane_status=complete\nlane_status=active\nactive_batch=RM-04` is
   reported as valid `active`, hiding contradictory authoritative input.
3. `EnvParser.ts` and `StateParser.ts` are function/value modules with
   PascalCase filenames. This conflicts with the mandatory engineering naming
   rule. The new parsers are also absent from `src/foundation/index.ts`, so a
   downstream command cannot consume them through the required foundation
   surface.
4. `ParseDiagnostic.code` is an unrestricted public `string`, while the
   implementation emits new lowercase diagnostic identifiers that are neither
   closed by a contract union nor reconciled with the accepted reason/schema
   registries. Public identifiers must have one accepted owner.
5. The mandatory `nvb build` and `nvb test` gates both fail with 16 TypeScript
   errors because the ordinary installed Nirvana package links do not resolve.
   Focused compilation is useful diagnostic evidence but cannot replace either
   project gate.
6. The implementation report does not complete the required Nirvana audit: it
   names no comparable Nira env-parser call site and does not compare the
   available dotenv-based behavior with Watchtower's stricter grammar and
   diagnostic requirements.

## Exact Adverse Bytes And Parser State

| Input bytes | Parser state | Expected | Actual |
| --- | --- | --- | --- |
| `VALUE=foo\\` + LF + `NEXT=bar` (`56 41 4c 55 45 3d 66 6f 6f 5c 0a 4e 45 58 54 3d 62 61 72`) | env, unquoted first value | reject line 1 because backslash-newline is shell continuation | valid; `{VALUE: "foo\\", NEXT: "bar"}` |
| `VALUE=foo\\bar` (`56 41 4c 55 45 3d 66 6f 6f 5c 62 61 72`) | env, unquoted | reject or prove exact non-evaluating decode compatible with the leaf projection | valid; backslash is retained by TypeScript although shell lexical processing removes it |
| `VALUE=~root` (`56 41 4c 55 45 3d 7e 72 6f 6f 74`) | env, unquoted | reject ambient tilde expansion; quoting may preserve a literal tilde | valid literal `~root`, which does not match shell-compatible projection semantics |
| `VALUE=()` (`56 41 4c 55 45 3d 28 29`) | env, unquoted | reject non-scalar array syntax with line 1 diagnostic | valid literal `()` |
| `VALUE=\\u0024HOME` (`56 41 4c 55 45 3d 5c 75 30 30 32 34 48 4f 4d 45`) | env, unquoted Unicode-escape spelling | reject or prove exact byte/value reproduction without shell interpretation | valid literal backslash sequence |
| `lane_status=complete` + LF + `lane_status=active` + LF + `active_batch=RM-04` | state, duplicate known key | invalid/`unknown`; duplicate authoritative status must not erase contradiction | valid `active`, no diagnostic |

These fixtures were passed only to the pure parser. They were never sourced,
evaluated, or executed. A sentinel named by the malicious corpus remained
absent before and after all 44 probes.

## Expected Corrected State

1. Define the accepted scalar grammar explicitly enough to prove exact
   TypeScript/leaf-compatible value reproduction. Reject line continuation,
   array/non-scalar syntax, ambient tilde behavior, and ambiguous escape forms
   unless a bounded non-evaluating decoder proves identical semantics.
2. Reject duplicate keys that can change authoritative interpretation. At
   minimum, duplicate `lane_status` must produce a source-line diagnostic and
   invalid/`unknown` state. Apply one documented duplicate policy consistently
   to env, state, known, and unknown records.
3. Rename function/value modules to lower camel case and update every source,
   test, report, and accepted pack owner reference. Export the intended parser
   surface from `src/foundation/index.ts`; do not force downstream deep imports.
4. Give parser diagnostic identifiers one closed owner. Either keep them
   internal and typed or update the owning contract/schema registry in the same
   correction. Do not expose `code: string` as an invented public reason-code
   namespace.
5. Add regression fixtures for every row above, embedded CR/LF variants,
   nested quote/escape tricks, literal Unicode escape spellings, and duplicate
   lifecycle records. Every rejected physical record must identify its source
   line, and tests must continue proving no command or sentinel is executed.
6. Update the Nirvana audit with the inspected pinned package exports, the
   b-core dotenv parser, and the comparable Nira database env-validation call
   site. Record why their broader grammar and missing strict diagnostics do not
   satisfy this boundary.
7. Make both repository NVB gates pass from the supported ordinary dependency
   bootstrap; focused custom TypeScript compilation is supplementary only.

## Exact Files To Change

- `src/foundation/scalarLineParser.ts`
- `src/foundation/EnvParser.ts` (rename/remove in favor of a lower-camel owner)
- `src/foundation/StateParser.ts` (rename/remove in favor of lower-camel owners)
- `src/foundation/index.ts`
- `src/contracts/types.ts`
- `src/contracts/index.ts`
- the three RM-04 focused spec modules, split further if responsibility demands
- `.local/agent-reports/wt-read-model/RM-04-strict-env-and-lane-state-parsers.md`
- RM-04 owner/status references in this implementation pack

## Required Regression Proof

- Complete accepted grammar table: blank, comment, empty value, unquoted,
  single-quoted, and double-quoted records with exact values.
- At least 30 direct shell-injection fixtures plus every adverse byte row above,
  with line diagnostics and a before/after sentinel no-execution proof.
- Every documented known env key, unknown-key preservation, duplicate-key
  policy, all five redaction patterns in leading/middle/trailing/case variants.
- Every lifecycle, missing/unknown lifecycle, all contradiction classes, and
  duplicate lifecycle records.
- `nvb build`, `nvb test`, `git diff --check`, source architecture checks,
  categorized physical/function counts, ownership, no implementation commit,
  and `.local/` not staged.
