# Batch RM-02 — Public JSON Envelopes And Schema Validation

Status: ❌ Pending
Phase: Contract foundation
Depends on: RM-01 accepted

**Required implementor reasoning class:** `R4`
**Class rationale:** JSON contract and schema validation with additive compatibility; wrong envelope shape silently breaks every downstream command's JSON output.

## Objective

Define success/error JSON envelopes, implement schema validation, ensure additive
compatibility and no decorative JSON output. This serializer is used by every
later command.

## Required Work

1. Create `src/foundation/serializer.ts` with functions to construct
   `commandResult` (success) and `commandError` (failure) JSON envelopes
   that conform to `v1.schema.json` definitions.
2. Implement schema validation against the bundled v1.schema.json. Validate
   envelope shapes before emitting them; panic on invalid shapes.
3. Create `src/foundation/result-renderer.ts` with functions for human and
   JSON rendering modes. `--json` must produce exactly one JSON value on stdout
   with no decorative text, ANSI, emojis, or progress indicators.
4. Ensure additive compatibility: new optional fields may be added within
   schema version 1; removed or retyped fields are rejected at validation time.
5. Write focused specs proving round-trip serialization of every envelope
   variant, `--json` output purity, and additive-field compatibility.

## Expected Ownership

- `src/foundation/serializer.ts` and its focused specs.
- `src/foundation/result-renderer.ts` and its focused specs.
- Contracts in `src/contracts/` for the public envelope types (if not already
  defined by RM-01).

## Tests And Evidence

- Round-trip tests for `commandResult` and `commandError` envelopes.
- Schema validation tests: valid envelopes pass, invalid shapes panic.
- Purity tests: `--json` output contains exactly one JSON value, no decorations.
- Additive-field compatibility: new optional fields do not break validation.
- `nvb build` and `nvb test` pass.

## What Must Not Change

- Do not define domain types in the serializer; type-check against contracts.
- Do not add decorative text, ANSI, or emojis to any output path.
- Do not change the schema bundle or introduce new required fields.

## Review Procedure Highlights

1. Verify every serialized envelope validates against `v1.schema.json`.
2. Confirm `--json` output has exactly one JSON value and no decorative text.
3. Trace every output path to confirm no bypass of the serializer.
4. Test with new optional fields added to verify additive compatibility.

## Required Reasoning Posture

The assigned agent must reason from the governing specifications and current
source, not from the batch title or predecessor report alone.

- Map every requested behavior to one contract owner, one lower-layer
  implementation owner, its front-door delegation point, and focused proof.
- Enumerate invalid states, failure ordering, compatibility risks, concurrency or
  re-entrancy concerns, unsupported behavior, and likely shortcut failures.
- Use negative cases and counterexamples to prove that happy-path success does
  not hide invalid JSON shapes, decorative text leakage, or schema violations.
- Escalate unresolved spec/source contradictions through a correction brief.

## Structural And Module-Size Acceptance

- Front doors and public barrels target at most 160 physical lines. 161-220 band
  requires explicit cohesion justification; over 220 is rejectable; 300 is the
  absolute front-door ceiling.
- Focused implementation modules target at most 220 physical lines. 221-300
  band requires a responsibility inventory; 301-350 requires a source-backed
  reason not to split; over 350 is rejected.
- No hand-maintained JS/TS source or spec module may exceed 400 physical lines.
- Do not create `helpers`, `utils`, `common`, or `misc` bags.

## Required Review Packet

The implementation report must include: exact changed files and ownership roles,
physical line counts, responsibility inventories for warning-band files, exact
proof commands and outcomes, final git status, and proof that `.local/` is not
staged.

## Completion And Handoff

The serializer is accepted and every later command emits valid JSON envelopes
through it. RM-10 consumes this serializer for all three commands. No command
may emit raw JSON outside this serializer.
