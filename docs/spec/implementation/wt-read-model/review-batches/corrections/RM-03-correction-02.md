# RM-03 Correction 02 — Reject Unresolved Symlink Components

Status: implemented but rejected in re-review; superseded by correction 03
Rejected review: `../RM-03-review-canonical-paths-and-workspace-resolution.md`
Prior correction: `RM-03-correction-01.md`
Review report: `.local/agent-reports/wt-read-model/reviews/RM-03-canonical-paths-and-workspace-resolution-review.md`
Superseding correction: `RM-03-correction-03.md`

## Preserved Findings Closed By Correction 01

- The deliberate RM-03 API is exported through `src/foundation/index.ts`, and
  focused tests import that surface.
- Existing outside-root symlinks are rejected by `authorizePath`,
  `isPathSafe`, `buildLaneFilePath`, and `buildLanePath` where applicable.
- Regular-file, broken, looping, and outside-root `.watchtower/lanes` markers
  are ignored; only a contained directory wins ancestor precedence.
- Exact-case/wrong-case fixtures exist and pass on the supported Linux target.
- The implementation report was regenerated after the final correction bytes;
  its file/function counts and proof output are accurate.

These gates must remain closed. Correction 02 must not regress them.

## Substantive Rejection

`findExistingParent` uses `existsSync`. Node reports `false` for both a broken
symlink and a symlink loop, so the walk skips the symlink inode and
canonicalizes a higher ordinary directory. The unresolved component is then
mistakenly authorized.

Independent built-code results:

```text
authorizePath(<lane>, "brokenOutside/future") -> accepted
isPathSafe("brokenOutside/future", <lane>)     -> true
authorizePath(<lane>, "loop/future")          -> accepted
isPathSafe("loop/future", <lane>)              -> true
buildLanePath(<home-with-broken-.watchtower>, "lane-a") -> accepted
```

For `brokenOutside`, the symlink target was an absolute nonexistent path
outside the authorized root. The reviewed API returned the lexical path as
authorized without inspecting the symlink inode. If that outside target later
exists, the same returned path resolves outside the authority root. This
violates the correction-01 root-aware broken-link/loop matrix and the governing
fail-closed path rule.

## Required Corrected State

1. Existing-parent discovery must distinguish a path that does not exist from
   a symlink inode whose target cannot be resolved. Inspect components without
   following them as necessary; do not skip broken or looping symlinks merely
   because `existsSync` is false.
2. `authorizePath` and `isPathSafe` must reject every candidate whose existing
   component is a broken symlink, symlink loop, or outside-root symlink.
3. `buildLanePath` and `buildLaneFilePath` must apply the same component-aware
   authorization, including a broken/looping `.watchtower`, `lanes`, or
   lane-relative component.
4. Preserve valid nonexistent descendants below ordinary contained
   directories; authorization must remain usable for planned create-once paths.
5. Preserve correction 01's public barrel, marker-directory, case, existing
   symlink, precedence, registered error, and zero-write behavior.
6. Keep raw filesystem work inside the focused canonical-path adapter under the
   accepted `NIRVANA_API_GAP:CANONICAL_PATH_AUTHORIZATION`; do not initialize
   the global Nirvana storage singleton.

## Exact Files To Change

- `src/foundation/canonicalPaths.ts`
- `spec/foundation/pathResolution.spec.ts`
- `.local/agent-reports/wt-read-model/RM-03-canonical-paths-and-workspace-resolution.md`
- RM-03 owner/status references affected by the correction outcome

Change another file only when the corrected design genuinely requires it and
record the ownership reason.

## Required Regression Proof

- Broken symlink to an absolute nonexistent outside-root target, tested through
  `authorizePath`, `isPathSafe`, and `buildLaneFilePath`.
- Looping symlink component through those same three APIs.
- Broken and looping `.watchtower`/`lanes` components through `buildLanePath`.
- Existing outside-root symlink rejection and valid inside-root symlink
  behavior.
- Valid nonexistent descendant below ordinary contained directories.
- Complete preserved correction-01 precedence, malformed-marker, case,
  `..`/NUL/control/absolute/slug, missing-explicit, barrel, and zero-write
  matrices.
- `nvb build`, `nvb test`, `git diff --check`, source architecture checks,
  exact physical/function counts, `kavan:kavan` ownership, no implementation
  commit, and `.local/` not staged.
