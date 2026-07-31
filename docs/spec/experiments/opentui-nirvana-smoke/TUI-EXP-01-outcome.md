# TUI-EXP-01 — Accepted Product Outcome

Status: **Closed**

Decision date: 2026-07-31

## Decision

Imperative `@opentui/core` with `@opentui/keymap` is technically feasible and
remains the selected Watchtower v1 TUI engine behind the generic Nirvana
adapter. No further disposable-spike correction or review is required.

The evidence is intentionally classified on two independent axes:

| Axis | Outcome | Meaning |
|------|---------|---------|
| Technical proof of concept | **PASS** | OpenTUI works with the required Nirvana CLI/NVB build-dist shape, Node FFI/native packaging, isolated relocation, PTY/tmux interaction, resize/input/streaming, signals, restoration, and terminal-content controls. |
| Experiment protocol compliance | **FAIL** | The final reviewer found a recreated user-global npm link, incomplete terminal-loss/per-bootstrap measurement proof, and disposable spike layering/size/test deficiencies. |

The compliance failure does not show engine incompatibility. It shows that the
disposable harness and its evidence did not satisfy every production-style
review rule. The formal review's `REJECT` is preserved and must not be relabeled
as independent acceptance of the submitted spike.

## Consequence

- OpenTUI engine suitability is settled; do not run another engine-selection
  experiment or continue polishing this sandbox.
- Do not copy spike source into Watchtower or treat its adapter as a product
  contract.
- CA-18 independently implements and qualifies the real Watchtower bootstrap,
  native manifest, non-TUI isolation, package relocation, lifecycle, security,
  and supported-platform evidence.
- CA-18 may reuse findings and test cases, but not the spike's compliance
  failures or global-install behavior.
- CA-19 remains gated on accepted CA-18 production evidence, not another
  TUI-EXP-01 review.
