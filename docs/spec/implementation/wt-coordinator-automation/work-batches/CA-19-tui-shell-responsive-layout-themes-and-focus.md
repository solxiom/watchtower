# Batch CA-19 — TUI Shell, Responsive Layout, Themes, and Focus

## Authority And Status

Governing sources: `AGENTS.md`,
`docs/development/engineering-and-review-standard.md`,
`docs/spec/v1-contracts.md`, `docs/spec/v1.md`,
`docs/spec/nirvana-integration-architecture.md`, `docs/spec/architecture.md`,
`docs/spec/v1-implementation-map.md`, `docs/spec/cli-session.md`, and the pack
quality rules. Stop for amendment on conflict or unresolved behavior.
Required interfaces are normative in this pack's
`tui-interface-contracts.md §CA-19 Shell Contract`.

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
