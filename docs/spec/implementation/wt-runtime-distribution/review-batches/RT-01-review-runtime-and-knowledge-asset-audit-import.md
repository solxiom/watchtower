# Review Batch RT-01 — Runtime and Knowledge Asset Audit/Import

Status: ❌ Pending
Reviews work batch: RT-01
Depends on: RT-01 implementation complete, implementation report written

**Required reviewer reasoning class:** `R4`
**Class rationale:** independent protection of asset completeness and provenance accuracy despite bounded audit work. The class is a floor; escalate under the lane reasoning rules when source inspection exposes additional risk.

## Scope Verification

Confirm that this batch audited every inherited shell runtime script and
coordinator knowledge doc with complete provenance, and that no asset was
modified, executed, or newly created during audit.

## Required Independent Proof

1. Independently enumerate every shell runtime script in the inherited
   `implementation-lane-coordinator` source. Compare the count with the audit
   records in `src/foundation/runtime-assets.ts`.
2. Independently enumerate every coordinator knowledge doc in the inherited
   source. Compare the count with the audit records.
3. For every recorded runtime asset, independently compute SHA-256 of the
   inherited source content and compare with the recorded digest.
4. Cross-reference the behavioral inventory against
   `docs/spec/coordinator-automation.md`. Verify every coordinator action has at
   least one script or doc entry.
5. Verify every script/doc in the inventory maps to at least one coordinator
   action (no orphan entries).
6. Verify the import provenance record contains source repository URI, commit
   hash, and import date.
7. Confirm this batch did NOT modify any inherited content, execute any script,
   or introduce shell execution/subprocess/catalog logic.
8. Run architecture checks. Confirm no runtime execution path was introduced.

## Required Reasoning Posture

The assigned agent must reason from the inherited source and governing
specifications, not from the batch title or predecessor report alone.

- Map every inherited script to one runtime role and one or more coordinator
  actions. Verify the audit agrees.
- Map every inherited knowledge doc to one behavioral role and one or more
  governed actions. Verify the audit agrees.
- Enumerate the complete set of v1 coordinator actions from
  `docs/spec/coordinator-automation.md` and cross-reference against the
  inventory.
- Identify any action that lacks a script or doc — this is a spec/import gap,
  not an audit error. Record it honestly in the review report.

## Structural And Module-Size Acceptance

- `runtime-assets.ts` must be a focused data module under 220 lines.
- `asset-audit.ts` must own only the behavioral inventory under 220 lines.
- No single module may exceed 350 lines for new hand-maintained code.
- No `helpers`, `utils`, `common`, or `misc` overflow modules.

## Acceptance Gate

Accept only if every inherited script and doc is accounted for, SHA-256 digests
match inherited source, the behavioral inventory is complete with no orphans,
provenance is recorded, and no shell execution or subprocess logic was introduced.

## Rejection Correction Brief Rule

If rejected, create a correction brief under:

- `docs/spec/implementation/wt-runtime-distribution/review-batches/corrections/RT-01-correction-<N>.md`

## Required Disk Report

Write exactly one review report to:

- `.local/agent-reports/wt-runtime-distribution/reviews/RT-01-runtime-and-knowledge-asset-audit-import-review.md`

If accepted, create the acceptance commit for all accepted non-`.local` changes.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Always plan and make task lists

When you work always plan and make task lists and todos!
