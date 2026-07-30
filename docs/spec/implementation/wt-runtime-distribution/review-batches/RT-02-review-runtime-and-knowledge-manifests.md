# Review Batch RT-02 — Runtime and Knowledge Manifests

Status: ❌ Pending
Reviews work batch: RT-02
Depends on: RT-02 implementation complete, implementation report written

**Required reviewer reasoning class:** `R4`
**Class rationale:** independent verification of closed type contracts and every rejection path. Manifest types are consumed by every later batch. The class is a floor.

## Scope Verification

Confirm that this batch defined closed, versioned manifest schemas and a
validator that correctly rejects missing, extra, non-executable, and
checksum-mismatched assets. No runtime execution or catalog logic was introduced.

## Required Independent Proof

1. Compare `RuntimeManifestV1` and `KnowledgeManifestV1` types with the v1 spec
   requirements in `docs/spec/v1.md` §15. Every required field must be present.
2. Independently run JSON Schema validation of the manifest types against
   `docs/spec/schemas/v1.schema.json`.
3. Run the manifest validator against a synthetic valid manifest with matching
   files. Assert `valid: true` and zero errors.
4. Independently test each rejection path:
   - missing file in directory → `MISSING_ASSET`
   - extra file in directory not in manifest → `EXTRA_ASSET`
   - checksum mismatch → `CHECKSUM_MISMATCH`
   - executable bit wrong → `MODE_MISMATCH`
   - unknown `schemaVersion` → `UNKNOWN_SCHEMA_VERSION`
5. Verify unknown fields within schema version 1 are preserved (not dropped or
   rejected).
6. Verify every RT-01 inventoried asset is representable in the manifest types.
7. Run architecture checks.

## Acceptance Gate

Accept only if manifest types are closed and complete, every rejection path is
independently tested, unknown schema versions fail closed, unknown fields are
preserved, and all RT-01 assets are representable.

## Rejection Correction Brief Rule

- `docs/spec/implementation/wt-runtime-distribution/review-batches/corrections/RT-02-correction-<N>.md`

## Required Disk Report

- `.local/agent-reports/wt-runtime-distribution/reviews/RT-02-runtime-and-knowledge-manifests-review.md`

If accepted, create the acceptance commit.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Always plan and make task lists
