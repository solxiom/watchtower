# Review Batch LC-02 — Pack Acceptance, Seal, and Drift Validation

Status: ⏳ Awaiting review
Reasoning: `R5`
Paired work brief: `work-batches/LC-02-pack-acceptance-seal-and-drift-validation.md`
Implementation report: `.local/agent-reports/wt-lane-lifecycle/LC-02-pack-acceptance-seal-and-drift-validation.md`

## Scope Verification

- [ ] `src/foundation/pack-consumer.ts` created with JSON Schema validation for `implementation-pack.json`, `implementation-pack.lock.json`, `pack-acceptance.json`
- [ ] `src/foundation/pack-seal.ts` created with RFC 8785 canonicalization, seal reproduction, drift classification matrix
- [ ] Pack consumer validates file sets: regular files pass, symlinks/devices/sockets/untracked/ignored rejected
- [ ] Pack seal implements correct drift codes: `PACK_BYTES_CHANGED`, `PACK_FILESET_CHANGED`, `ACCEPTED_INPUT_CHANGED`, `SOURCE_BASELINE_CRITICAL`, `SOURCE_BASELINE_UNRELATED`, `SOURCE_BASELINE_UNAVAILABLE`
- [ ] No model invocation for drift classification — purely mechanical
- [ ] No mutation of any filesystem path — read-only validation
- [ ] No product logic in `src/cli.ts`

## Required Independent Proof

1. JSON Schema validation:
   - `implementation-pack.json`: valid fixture passes; invalid with missing `schemaVersion` rejected; invalid with duplicate batch IDs rejected; invalid with missing requirement coverage rejected.
   - `implementation-pack.lock.json`: valid fixture passes; tampered digest rejected; truncated file rejected; duplicate file paths rejected.
   - `pack-acceptance.json`: valid fixture passes; non-accept verdict rejected; open critical findings rejected.
2. File-set validation: normal regular files pass; symlink rejected; device node rejected; socket rejected; untracked file rejected; ignored file rejected; paths outside pack root rejected; non-UTF-8 paths rejected.
3. RFC 8785 canonicalization: independently verify against known-good test vectors. Produce canonical bytes and compare against reference implementation or known-good outputs. Verify key sorting by code-point order. Verify number serialization without exponential notation.
4. Seal reproduction: build a seal input from a known-good fixture, compute the seal, compare against the locked seal in the fixture. Seal mismatch: modify one file in the fixture, verify seal computation no longer matches.
5. Drift code matrix: for each of the six drift codes, create a representative fixture and verify the correct code is produced:
   - `PACK_BYTES_CHANGED`: modify a sealed file's contents
   - `PACK_FILESET_CHANGED`: add or remove a file from the pack
   - `ACCEPTED_INPUT_CHANGED`: modify the acceptance record's input digests
   - `SOURCE_BASELINE_CRITICAL`: change a file that intersects a writable batch claim
   - `SOURCE_BASELINE_UNRELATED`: change a file outside writable batch claims
   - `SOURCE_BASELINE_UNAVAILABLE`: remove a repository needed for baseline
6. Lock verification: missing sealed file detected; digest mismatch detected; extra file in pack detected.
7. Adversarial tests: lock referencing files outside pack root rejected; manifest with zero batches rejected; acceptance with future commit ID rejected.
8. Run `nvb build` and `nvb test` independently. Confirm focused specs pass.
9. Verify no model invocation anywhere in pack-consumer or pack-seal. Search imports and function bodies.

## Required Reasoning Posture

The reviewer must independently reproduce seal computation and drift
classification. Do not trust the implementation report's claims about RFC 8785
correctness — verify against known-good test vectors. The drift matrix must be
exhaustively tested: every code must have at least one fixture that produces it
and at least one fixture where it should NOT be produced. Verify that drift
classification is purely mechanical (no model, no heuristic judgment).

## Structural And Module-Size Acceptance

- Verify `pack-consumer.ts` is within the appropriate size band (target ≤300 lines, ceiling 400, given the schema validation breadth this is a large module).
- Verify `pack-seal.ts` is within the appropriate size band (target ≤300 lines, ceiling 400, given RFC 8785 canonicalization and drift matrix).
- Confirm no `helpers`, `utils`, `common`, or `misc` modules.
- Verify both modules import only from RM-01 (contracts) and RM-08 (conflicts), not from commands or CLI layers.

## Required Review Packet

The review report must include: independently rerun proof commands and outcomes,
drift matrix coverage table (every code, fixture name, expected result, actual result),
RFC 8785 verification details, structural verification results, line-count
verification, tracker/roadmap sync status, and the acceptance or rejection decision.

## Acceptance Gate

- All hard-reject checklist items are clear.
- JSON Schema validation correct for all three document types.
- RFC 8785 canonicalization verified against known-good vectors.
- Seal reproduction matches locked seal on known-good fixtures.
- All six drift codes tested with representative fixtures.
- File-set validation rejects all invalid path classes.
- No model invocation for drift classification.
- No filesystem mutations.
- `nvb build` and `nvb test` pass with zero failures.
- Tracker and roadmap updated.
- No `.local/` artifacts staged.

## Reject Conditions

- Incorrect RFC 8785 implementation (key ordering, number formatting, Unicode normalization).
- Drift code produced for wrong condition or missed for correct condition.
- Model invocation for any validation or classification.
- Filesystem mutation during validation.
- Missing drift code coverage.
- `any`-typed public interfaces.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.
