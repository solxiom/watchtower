# RM-04 Correction 02 — Reject NUL And Remove Worktree-Depth Authority

Status: implemented and independently accepted
Rejected re-review: `../RM-04-review-strict-env-and-lane-state-parsers.md`
Prior correction: `RM-04-correction-01.md`
Review report: `.local/agent-reports/wt-read-model/reviews/RM-04-strict-env-and-lane-state-parsers-review.md`

## Rejection Reasons

1. Correction 01 still accepts NUL inside both quoted scalar forms. Unix shell
   variables and process environments cannot represent embedded NUL, so the
   TypeScript result cannot round-trip through the retained shell-compatible
   leaf projection. This fails the same complete-scalar-grammar gate that
   correction 01 was required to close.
2. `package-lock.json` was changed from `../../.nirvana/...` to
   `../../../.nirvana/...` solely to compensate for this review worktree's
   extra directory depth. From the correction worktree the new path resolves
   to `/home/kavan/.nirvana`; from the canonical checkout
   `/home/kavan/Projects/watchtower` the exact committed path resolves to
   `/home/.nirvana`. A reviewer-worktree dependency repair cannot become
   accepted product state or break the canonical checkout after integration.
3. `stateParser.ts` still owns three independently named concerns: scalar-state
   record ingestion, lifecycle normalization, and lifecycle contradiction
   policy. Its 67-line size does not waive the mandatory responsibility split.
4. The implementation report's comparable Nira audit points to
   `nira/dist/commands/database/support/shared/databaseEnvValidation.js`, which
   does not exist in the pinned tree. The inspected call site is
   `nira/commands/database/support/shared/databaseEnvValidation.js`. Required
   evidence must name the real inspected source.

## Exact Adverse Bytes And Parser State

| Input bytes | Parser state | Expected | Actual |
| --- | --- | --- | --- |
| `VALUE="a<NUL>b"` (`56 41 4c 55 45 3d 22 61 00 62 22`) | env, double-quoted scalar | reject line 1 as non-round-trippable | valid; `config.VALUE` is `a\u0000b` |
| `VALUE='a<NUL>b'` (`56 41 4c 55 45 3d 27 61 00 62 27`) | env, single-quoted scalar | reject line 1 as non-round-trippable | valid; `config.VALUE` is `a\u0000b` |

The fixtures were constructed from base64 (`VkFMVUU9ImEAYiI=` and
`VkFMVUU9J2EAYic=`) and passed only to the built pure parser. They were never
sourced, evaluated, or executed.

## Preserved Correction-01 Results

Do not regress the independently reproduced correction-01 closures:

- all 41 direct malicious values reject with line-2 diagnostics and no
  sentinel creation;
- backslash-LF, backslash-CR, unquoted backslash, tilde, array syntax, and
  literal Unicode-escape spelling reject;
- duplicate env/state keys retain the first safe record and make the result
  invalid; duplicate `lane_status` projects `unknown`;
- all seven documented env keys reproduce exactly;
- all lifecycle and four contradiction classes project correctly;
- lower-camel filenames, foundation exports, and the closed
  `ParserDiagnosticCode` contract are correct;
- clean `npm ci`, `nvb build`, and `nvb test` currently pass in this worktree,
  with 172 specs and no failures.

## Expected Corrected State

1. Reject NUL in every scalar form before the value enters `config`, `state`,
   `unknownKeys`, diagnostics, or redaction output. Add both exact byte fixtures
   and prove their line-1 diagnostics.
2. Remove the worktree-depth-specific accepted lockfile change. Restore the
   canonical dependency declaration or introduce a layout-independent pinned
   ecosystem bootstrap under its proper owner. Keep any reviewer-local link
   repair untracked. Prove both the correction worktree and canonical checkout
   resolve the intended pinned packages before claiming ordinary bootstrap.
3. Split state record parsing/orchestration from lifecycle normalization and
   contradiction policy. Keep lower-camel owners and export only the deliberate
   high-level foundation surface.
4. Correct the Nirvana audit to the real pinned b-core and Nira paths and retain
   the proven `NIRVANA_API_GAP` comparison against dotenv's broader grammar.

## Required Regression Proof

- Every correction-01 byte plus both NUL fixtures, with line diagnostics and
  before/after no-execution sentinel proof.
- Accepted blank/comment/empty/unquoted/single/double grammar table and exact
  seven-known-key reproduction.
- Duplicate known/unknown env and state policy; every lifecycle and
  contradiction class; all five redaction patterns.
- Dependency-path resolution proof from both the review worktree and canonical
  checkout, without committing a machine/worktree-depth repair.
- Complete Nirvana/Nira audit using paths that exist in the pinned tree.
- `nvb build`, `nvb test`, architecture checks, categorized module/function
  counts and responsibility inventory, `git diff --check`, ownership,
  implementation-agent no-commit proof, and `.local/` not staged.
