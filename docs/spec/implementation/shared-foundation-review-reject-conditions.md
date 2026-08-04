# Shared Foundation Review Reject Conditions

Status: **Mandatory insert for every review batch that touches foundation code**
Authority: [foundation-agent-guardrails.md](../architecture/foundation-agent-guardrails.md)
Date: 2026-08-04

Every review batch brief already requires the pack's `agent-launch-contract.md`. That contract mandates the guardrails document. **Reviewers must apply this block in addition to batch-specific reject conditions.**

## Mandatory independent checks

1. Diff-scan every changed path under `src/foundation/`, `src/commands/`, and `src/run.ts`.
2. Verify placement against the capability tree (no flat prefix clusters; correct domain owner).
3. Grep imports for command deep-import bypass and L4→L5 sub-capsule paths.
4. If `src/foundation/index.ts` changed: ≤50 lines, no `export *`, no denylisted exports.
5. Independently run `nvb build && nvb test` — architecture gate specs must pass.

## Standard reject conditions (foundation)

Reject with a numbered correction brief when **any** of the following hold:

- **FLG-01** — flat prefix cluster introduced at `src/foundation/` root
- **FLG-02** — new `.ts` file at foundation root other than `index.ts`
- **FLG-03** — root barrel policy violated (>50 lines, `export *`, or denylisted export)
- **FLG-04** — command/`run.ts` imports `foundation/index.js` or a deep capsule path
- **FLG-05** — L4 imports L5 sub-capsule internals instead of a capability barrel
- **FLG-06** — upward layer import (L1→L2+, L2→L3+, L3→L4+) outside documented exceptions
- **FLG-07** — directory-shadow layout or generic helper bag under foundation
- **FLG-08** — SQLite driver import outside `foundation/storage/`
- **FLG-09** — architecture gate spec fails or inventory/boundary spec not updated for moves
- **FLG-10** — implementation report omits foundation layout proof for a foundation-touching batch

Record the **FLG-** code(s), exact paths/lines, expected correction, and required re-proof in the correction brief.

Working behavior does **not** override layout violations. **REJECT** — no accept-with-follow-up.

## Review report matrix row

| Gate | Required verdict |
|------|------------------|
| Foundation layout and import guardrails | PASS / FAIL / N/A |

`FAIL` requires correction brief with FLG codes.
