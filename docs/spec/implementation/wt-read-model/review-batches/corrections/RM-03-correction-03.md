# RM-03 Correction 03 — Restore One Path-Policy Owner And Complete Regressions

Status: implemented and independently accepted
Rejected review: `../RM-03-review-canonical-paths-and-workspace-resolution.md`
Prior corrections: `RM-03-correction-01.md`, `RM-03-correction-02.md`
Review report: `.local/agent-reports/wt-read-model/reviews/RM-03-canonical-paths-and-workspace-resolution-review.md`

## Runtime Behavior Accepted From Correction 02

Independent built-artifact proof now passes every functional path boundary:

- broken absolute outside-root links, existing outside-root links, and symlink
  loops reject through `authorizePath`, `isPathSafe`, and
  `buildLaneFilePath`;
- broken/looping `.watchtower` and `lanes` components reject through
  `buildLanePath`;
- contained symlinks and ordinary nonexistent descendants remain authorized;
- explicit/Git/valid-ancestor/cwd precedence, malformed markers, exact/wrong
  case, `..`, NUL/control, absolute lane files, invalid slugs, missing explicit
  workspaces, data-home precedence, barrel exports, and zero-write behavior all
  pass; and
- the clean NVB build and 187-spec suite pass.

These results must remain unchanged.

## Structural Rejection

The mandatory read-model one-owner rule explicitly names path canonicalization
and escape validation as policy that may not be recomputed in multiple layers.
The corrected tree contains three separate implementations of the same lexical
escape policy:

```text
src/foundation/canonicalPaths.ts: isLexicallySafePath
src/foundation/dataHomeResolver.ts: isLexicallySafePath
src/foundation/workspaceResolver.ts: isLexicallySafePath
```

Each independently defines the nonempty, C0/DEL-control, and `..`-segment
rules. `safeTarget` also repeats path-control redaction in the latter two
modules while `canonicalPaths.ts` owns the same decision in `pathError`.
Passing tests do not permit three sources of truth for a security boundary.

## Regression-Evidence Rejection

The correction-02 brief required exact focused regressions for valid contained
symlinks and for broken/looping `.watchtower` **and** `lanes` components.
The current spec proves broken/looping `.watchtower` components but not the
`lanes` variants, and it canonicalizes an ordinary symlink without exercising
contained-symlink authorization through the root-aware APIs. Independent
review probes pass those cells, but repeatable required failures/successes must
remain in the repository suite.

## Required Corrected State

1. Establish one precisely named foundation owner for lexical path validity
   and safe path error context. `dataHomeResolver.ts` and
   `workspaceResolver.ts` must consume that owner rather than duplicate the
   control/segment policy. Keep private implementation details out of the
   public foundation barrel unless they are intentionally supported APIs.
2. Preserve root-aware canonical authorization in `canonicalPaths.ts`; do not
   weaken the accepted `lstat`-aware component walk or reintroduce
   `existsSync`-based skipping.
3. Add focused root-aware success proof for a contained symlink descendant via
   `authorizePath`, `isPathSafe`, and `buildLaneFilePath`.
4. Add focused `buildLanePath` rejection for broken and looping `lanes`
   components, in addition to the existing `.watchtower` variants.
5. Retain valid ordinary nonexistent descendant and complete zero-write proof.
6. Refresh the implementation report after final bytes, including exact
   ownership, line/function counts, proof seed/output, and Git state.

## Expected Files

- `src/foundation/canonicalPaths.ts`
- `src/foundation/dataHomeResolver.ts`
- `src/foundation/workspaceResolver.ts`
- `spec/foundation/pathResolution.spec.ts`
- `.local/agent-reports/wt-read-model/RM-03-canonical-paths-and-workspace-resolution.md`
- affected RM-03 status references

If the single-owner design needs a narrowly named private foundation capsule,
record its responsibility and keep naming/size/dependency rules intact.

## Required Final Proof

- Every correction-01 and correction-02 functional matrix cell.
- Static proof that lexical escape policy and safe path sanitization have one
  owner and no copy remains in data-home/workspace modules.
- Exact contained-link authorization and broken/looping `lanes` regressions.
- Public barrel proof, all precedence/case/marker/error cells, and before/after
  zero-write proof for every exported RM-03 capability.
- `nvb build`, `nvb test`, `git diff --check`, source architecture checks,
  exact physical/function counts, `kavan:kavan` ownership, no implementation
  commit, and `.local/` not staged.
