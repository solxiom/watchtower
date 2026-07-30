# Batch RM-07 — Membership Index And Secondary-Repository Discovery

Status: ❌ Pending
Phase: Membership
Depends on: RM-03, RM-06 accepted

**Required implementor reasoning class:** `R4`
**Class rationale:** membership with staleness detection; advisory reads with no-repair proof. Wrong validation silently treats stale entries as authoritative.

## Objective

Validate user-local membership index. Discover secondary repositories. Report
stale entries; reads never repair.

## Required Work

1. Create `src/foundation/membership.ts`: validate the advisory user-local
   membership index at `<watchtower-data-root>/index/repository-memberships.json`.
   Parse the index. Validate each entry: canonicalize path, verify existence,
   resolve referenced lane home to a valid `lane.json`, verify binding matches.
2. Create `src/foundation/secondary-discovery.ts`: discover lanes from a
   participating secondary repository through the validated membership index.
   Each candidate must resolve to a valid `lane.json` with matching binding.
3. Stale-entry detection: path no longer exists, lane.json missing, binding
   mismatch → report as stale warning, do not repair.
4. Write focused specs: valid index validation, stale-entry detection for each
   class, missing index handling, no-repair proof.

## Expected Ownership

- `src/foundation/membership.ts`, `src/foundation/secondary-discovery.ts`
- Respective focused specs.

## Tests And Evidence

- Valid index: all entries resolve to valid lane.json with matching bindings.
- Stale entry — path removed: path no longer exists → reported, not repaired.
- Stale entry — lane.json missing: lane home has no lane.json → reported.
- Stale entry — binding mismatch: lane exists but binding doesn't match path.
- Missing index file: no error, returns empty.
- No-repair proof: after stale detection, the index file remains unchanged.
- `nvb build` and `nvb test` pass.

## Review Procedure Highlights

1. Verify each stale-entry class is detected and reported.
2. Confirm index file is never written to by read-only operations.
3. Trace secondary discovery from a participating repository path.
4. Verify stale entries are ignored but reported.

## Completion And Handoff

Membership validation and secondary discovery are accepted. RM-08 consumes
membership for conflict inspection. RM-10 consumes secondary discovery for
multi-repository status output. No read command repairs the index.
