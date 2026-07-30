# Review Batch RM-07 — Membership Index And Secondary-Repository Discovery

Status: ⏳ Awaiting review
Reasoning: `R4`
Paired work brief: `work-batches/RM-07-membership-index-and-secondary-discovery.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-07-membership-index-and-secondary-discovery.md`

## Scope Verification

- [ ] `src/foundation/membership.ts` with membership index validation
- [ ] `src/foundation/secondary-discovery.ts` with secondary-repository discovery

## Required Independent Proof

1. **Valid index**: Create a membership index with valid entries. Verify all entries validated and returned.
2. **Stale — PATH_MISSING**: Entry path no longer exists → stale warning, PATH_MISSING reason.
3. **Stale — LANE_JSON_MISSING**: Referenced lane home has no lane.json → stale warning.
4. **Stale — BINDING_MISMATCH**: Lane exists but no binding matches entry path → stale warning.
5. **Mixed index**: One valid + one stale entry. Verify valid returned, stale warned, valid still works.
6. **No-repair proof**: After every operation, verify the index file's modification time and MD5/SHA-256 are unchanged.
7. **Missing index**: File doesn't exist → null/empty, no error.
8. **Secondary discovery**: From a participating repo path, discover lanes through validated entries.
9. Run `nvb build` and `nvb test` independently.

## Acceptance Gate

- All stale-entry classes detected and reported.
- Index file never modified by reads.
- Missing index handled gracefully.
- Build and tests pass independently.
