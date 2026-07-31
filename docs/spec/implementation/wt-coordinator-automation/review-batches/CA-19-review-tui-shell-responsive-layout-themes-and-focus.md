# Review Batch CA-19 — TUI shell, responsive layout, themes, and focus

## Synchronized batch execution matrix

- **Accepted-map title:** TUI shell, responsive layout, themes, and focus
- **Dependencies:** `CA-18`
- **Exclusive ownership/interface:** TUI application shell/components
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** Wide right inspector shell; model-free lane entry; P0–P5 attention; standard/narrow layouts; resize; focus/keymap; themes; transactional preferences; bounded animation
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-19-tui-shell-responsive-layout-themes-and-focus.md`
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-19-tui-shell-responsive-layout-themes-and-focus-review.md`
- **Correction report:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-19-tui-shell-responsive-layout-themes-and-focus-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

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

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **TUI application shell/components**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/reviews/CA-19-tui-shell-responsive-layout-themes-and-focus-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`CA-18`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Wide right inspector shell; model-free lane entry; P0–P5 attention; standard/narrow layouts; resize; focus/keymap; themes; transactional preferences; bounded animation**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **TUI application shell/components** and **Wide right inspector shell; model-free lane entry; P0–P5 attention; standard/narrow layouts; resize; focus/keymap; themes; transactional preferences; bounded animation**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-19-tui-shell-responsive-layout-themes-and-focus-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-coordinator-automation/reviews/CA-19-tui-shell-responsive-layout-themes-and-focus-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
