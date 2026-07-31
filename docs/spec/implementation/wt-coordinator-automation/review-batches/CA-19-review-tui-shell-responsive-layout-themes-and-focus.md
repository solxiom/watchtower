# Review Batch CA-19 — TUI Shell, Responsive Layout, Themes, and Focus

Status: ❌ Not started
Paired work: CA-19
Reviewer floor: `R4`; reviewer owns acceptance commit.

Read the paired brief, `AGENTS.md`, mandatory engineering standard, v1
contracts/spec, Nirvana integration architecture, implementation map,
`cli-session.md`, `tui-operational-experience.md`, accepted CA-18 report, and
pack rules. Independently verify
scope, layering, Nirvana audit, structural limits, tests, docs, ownership, and
artifact hygiene; include the engineering-standard acceptance matrix.
Verify every owned module implements only `tui-interface-contracts.md §CA-19`.

## Independent Proof

- Confirm only the accepted imperative core/keymap adapter is consumed; no
  React/Solid/Ink/JSX/Babel, renderer import leakage, or bootstrap change.
- Reproduce wide/right, mirrored preference, standard/drawer, narrow, unusable,
  and recovery layouts at exact breakpoint edges and repeated resize.
- Verify composer slot state, anchor token, overlay intent, and valid focus
  survive resize; reproduce focus traversal/trap/restore and key conflicts.
- Reproduce keyboard completeness, mouse parity, Unicode cell measurement, long
  stable IDs, and bounded animation/frame scheduling.
- Reproduce dark/light/system, capability degradation, no-color, high contrast,
  reduced motion, and invalid transactional preference behavior.
- Reproduce zero/one/many-lane entry and colliding P0–P5 states; prove no
  pre-selection session/model use, focus theft, or stale lower-priority cover.
- Reproduce old/new/corrupt preference and cache migration/fallback with
  bounded backups and no authoritative-state loss.
- Trace component dependencies: bounded view models only; no store, SQL,
  provider, effect, NVB, subprocess, or policy import.
- Run `nvb build`, `nvb test`, architecture gates, and independent line counts.

Reject on invented session behavior, mixed shell god object, private ANSI/
layout framework, partial preference application, authority-bearing
preferences, lost focus/input state, missing breakpoint/accessibility proof, or
any mandatory gate failure. No conditional acceptance.

Write
`.local/agent-reports/coordinator-automation/reviews/CA-19-tui-shell-responsive-layout-themes-and-focus-review.md`
with verdict and exact CA-20/CA-21 handoff. On rejection issue a numbered
correction brief; on acceptance commit all eligible changes, never `.local/`.
