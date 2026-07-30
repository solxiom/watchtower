# Review Batch RM-06 — Home-Lane Discovery And Deterministic Selection

Status: ⏳ Awaiting review
Reasoning: `R5`
Paired work brief: `work-batches/RM-06-home-lane-discovery-and-selection.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-06-home-lane-discovery-and-selection.md`

## Scope Verification

- [ ] `src/foundation/discovery.ts` with home-lane discovery and walk-up
- [ ] `src/foundation/lane-selector.ts` with deterministic selection

## Required Independent Proof

1. **Ambiguity matrix — audit every cell**: Draw the complete matrix (0 lanes, 1 lane, 2+ lanes, invalid lane.json, missing schemaVersion) × (UUID match, slug match, cwd deduction, single deduction, no deduction). Verify each cell has a focused test with the correct expected outcome.
2. **Discovery walk**: Set up temp workspace with `.watchtower/lanes/<slug>/lane.json` at multiple levels. Walk from cwd, from lane dir, from descendant. Verify discovery finds correct lanes.
3. **Selection precedence**: Test each rule independently. Confirm order is exactly as specified (UUID → slug → cwd → single active → single relevant → ambiguity).
4. **Invalid lane.json**: Missing required field → excluded. Missing `schemaVersion` → excluded. Bad JSON → error.
5. **Symlink/case**: Set up workspace with symlinked parent. Verify resolved paths used in comparison.
6. **Non-Watchtower directories**: Directories without `lane.json` silently skipped. No error.
7. **No interactive picker**: Verify no code path reads stdin or prompts for selection.
8. Run `nvb build` and `nvb test` independently.

## Acceptance Gate

- Every ambiguity matrix cell tested and correct.
- Selection precedence matches v1.md §9.3 exactly.
- Symlink/case safety verified.
- No interactive picker.
- Build and tests pass independently.

## Reject Conditions

- Any matrix cell untested or incorrect.
- Silent selection when ambiguous.
- Non-Watchtower directories scanned or modified.
- Interactive picker implemented.
- Stale tracker/roadmap.
- Implementation agent committed.
