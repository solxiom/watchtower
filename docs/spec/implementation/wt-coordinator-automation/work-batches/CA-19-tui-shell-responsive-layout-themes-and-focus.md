# Batch CA-19 — TUI shell, responsive layout, themes, and focus

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
Depends on: CA-18 accepted with a `PASS` verdict
Unblocks: CA-20 and CA-21
Reasoning floor: implementor `R4`; reviewer `R4`

## Objective

Implement the accepted CA-18 generic adapter contract and framework-free
OpenTUI application shell:
canonical conversation-left/inspector-right layout, responsive degradation,
focus and action/keymap ownership, semantic themes, bounded motion, and safe
operator-local display preferences. Use synthetic bounded view models; session
features belong to later batches.

## Owned Capabilities

- `TuiApplication` composition root and `RootLayout`
- `TuiLayoutResolver` for wide, standard, narrow, and unusable dimensions
- `TuiFocusManager` and central `TuiActionRegistry`/keymap
- `TuiThemeResolver` and semantic design tokens
- bounded display-preference parsing for layout, theme, motion, and keymap
- model-free lane-entry picker and canonical P0–P5 attention reduction
- shell components: header, conversation slot, inspector slot, overlay host,
  toast region, status footer, and resize-required surface

Exact owned production modules:

- `src/contracts/tuiShell.ts`
- `src/presentation/tui/NirvanaTuiAdapter.ts`
- `src/presentation/tui/OpenTuiRendererAdapter.ts`
- `src/presentation/tui/TuiApplication.ts`
- `src/presentation/tui/RootLayout.ts`
- `src/presentation/tui/TuiLayoutResolver.ts`
- `src/presentation/tui/TuiFocusManager.ts`
- `src/presentation/tui/TuiActionRegistry.ts`
- `src/presentation/tui/TuiThemeResolver.ts`
- `src/presentation/tui/TuiPreferences.ts`

Exact owned focused specs use matching names under `spec/basic/tui/`. Adding or
renaming an owner requires a brief amendment. Do not create a generic UI helper
directory or put presentation behavior in `src/foundation/`.

## Required Interfaces And Work

1. Implement the accepted CA-18 adapter contract. Only
   `OpenTuiRendererAdapter.ts` may import OpenTUI; this batch does not implement
   the process/command FFI bootstrap owned by CA-24.
2. Define immutable shell/layout/focus/theme view models and typed UI
   intentions in contracts or the presentation capability.
3. Implement the exact `cli-session.md §5.1` shell and `§5.3` breakpoints.
   Resize preserves composer slot state, selected session identity, valid
   focus, timeline anchor token, inspector intent, and overlay intent.
4. Implement one visible focus owner, overlay focus trapping, deterministic
   focus restoration, keyboard completeness, mouse parity, and conflict-
   rejecting keymap loading. Actions carry availability, mutation class,
   confirmation, observer eligibility, and focus scope.
5. Implement semantic theme tokens and truecolor→256→16→monochrome
   degradation. Ship dark, light, and system mappings plus high contrast,
   no-color, and reduced-motion behavior.
6. Parse bounded non-authoritative display preferences transactionally.
   Invalid themes, unsafe values, and conflicting keys use documented safe
   defaults with diagnostics. Preferences never alter policy or authority.
7. Coalesce decorative layout/animation frames without discarding input or
   product events. Hidden/inactive UI does not animate.
8. Implement zero/one/many-lane entry presentation without creating a session
   before selection, plus deterministic P0–P5 priority/focus behavior.
9. Version and transactionally migrate preferences; preserve unknown keys,
   use bounded owner-only backups, and treat derived UI caches as disposable.

## Exclusions

- No session store, SQLite, provider, model, effect executor, NVB, or raw
  subprocess imports.
- No conversation paging/composer semantics (CA-20), inspector data/actions
  (CA-21), live streaming/concurrency (CA-22), terminal lifecycle qualification
  (CA-23), or public command integration (CA-24).
- No React, Solid, Ink, JSX/TSX, Babel, framework binding, private ANSI/layout
  engine, or second build pipeline.

## Required Proof

- Pure breakpoint/layout cases at boundary dimensions and repeated resize.
- Golden shell screens for wide right inspector, optional mirrored preference,
  standard drawer, narrow single pane, and unusable-size recovery.
- Unicode cell measurement, long stable IDs, focus traversal/trapping/
  restoration, key conflicts, keyboard-only parity, and mouse selection.
- Theme matrices across color capabilities, no-color, high contrast, and
  reduced motion; animation frame/backpressure bounds.
- Invalid/partial preference fixtures prove atomic safe-default behavior and
  no authority changes.
- Lane-entry and P0–P5 collision fixtures prove deterministic ordering, no
  model use, no unintended session, and no focus-stealing notification.
- Older/newer/corrupt preference and cache fixtures prove transactional
  fallback without loss of authoritative state.
- Dependency audit proves components consume only bounded view models and the
  accepted adapter.
- `nvb build`, `nvb test`, architecture gates, categorized line counts, and
  Nirvana API audit.

## Documentation And Report

No command/help/schema change is expected. Amend normative docs only if accepted
behavior changes. Write
`.local/agent-reports/coordinator-automation/CA-19-tui-shell-responsive-layout-themes-and-focus.md`
with files, interfaces, CA-18 handoff consumed, proofs, line counts, ownership,
and the exact CA-20/CA-21 handoff. Do not commit; the independent reviewer owns
acceptance.

## Independent Review

Use `../review-batches/CA-19-review-tui-shell-responsive-layout-themes-and-focus.md`.
The reviewer independently regenerates breakpoint, focus, theme, dependency,
structure, and test evidence; the implementation report is not proof.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **TUI application shell/components**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/CA-19-tui-shell-responsive-layout-themes-and-focus.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`CA-18`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Wide right inspector shell; model-free lane entry; P0–P5 attention; standard/narrow layouts; resize; focus/keymap; themes; transactional preferences; bounded animation**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **TUI application shell/components** and **Wide right inspector shell; model-free lane entry; P0–P5 attention; standard/narrow layouts; resize; focus/keymap; themes; transactional preferences; bounded animation**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-coordinator-automation/CA-19-tui-shell-responsive-layout-themes-and-focus.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
