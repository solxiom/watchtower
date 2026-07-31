# Review Batch RM-06 — Home-lane discovery and deterministic selection

## Synchronized batch execution matrix

- **Accepted-map title:** Home-lane discovery and deterministic selection
- **Dependencies:** `RM-03`, `RM-04`
- **Exclusive ownership/interface:** discovery/selection foundation
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory batch proof:** Descendant/lane-dir discovery; UUID/slug precedence; complete ambiguity matrix
- **Implementation report:** `.local/agent-reports/wt-read-model/RM-06-home-lane-discovery-and-selection.md`
- **Review report:** `.local/agent-reports/wt-read-model/reviews/RM-06-home-lane-discovery-and-selection-review.md`
- **Correction report:** `.local/agent-reports/wt-read-model/reviews/corrections/RM-06-home-lane-discovery-and-selection-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ⏳ Awaiting review
Reasoning: `R5`
Paired work brief: `work-batches/RM-06-home-lane-discovery-and-selection.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-06-home-lane-discovery-and-selection.md`

## Scope Verification

- [ ] `src/foundation/laneDiscovery.ts` with home-lane discovery and walk-up
- [ ] `src/foundation/LaneSelector.ts` with deterministic selection

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

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **discovery/selection foundation**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-read-model/reviews/RM-06-home-lane-discovery-and-selection-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-03`, `RM-04`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Descendant/lane-dir discovery; UUID/slug precedence; complete ambiguity matrix**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **discovery/selection foundation** and **Descendant/lane-dir discovery; UUID/slug precedence; complete ambiguity matrix**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-read-model/reviews/corrections/RM-06-home-lane-discovery-and-selection-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-read-model/reviews/RM-06-home-lane-discovery-and-selection-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
