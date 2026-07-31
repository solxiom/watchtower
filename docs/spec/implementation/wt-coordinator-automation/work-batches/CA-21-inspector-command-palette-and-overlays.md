# Batch CA-21 — Inspector Views, Command Palette, and Overlays

## Authority And Status

Governing sources: `AGENTS.md`, the mandatory engineering standard,
`v1-contracts.md`, `v1.md`, `nirvana-integration-architecture.md`,
`architecture.md`, `v1-implementation-map.md`, `operator-session.md`,
`cli-session.md`, and pack quality rules.
Required interfaces are normative in this pack's
`tui-interface-contracts.md §CA-21 Inspector And Action Contract`.

Status: ❌ Not started
Depends on: CA-14, CA-17, and CA-19 accepted
Unblocks: CA-22
Reasoning floor: implementor `R4`; reviewer `R4`

## Objective

Implement bounded contextual inspection and discoverable actions: the closed
nine-view inspector registry, command palette, pickers, help/details/settings,
and fail-closed confirmation overlays over shared Watchtower query and command
authority.

## Owned Capabilities

- inspector registry and sessions/lane/batches/agents/budgets/holds/proposals/
  events/context view presenters
- bounded inspector-query controller with cancellation/revision handling
- central command palette over the CA-19 action registry
- overlay models for picker, help, details, settings, and confirmation
- typed action dispatch from UI intention to shared application capability

Exact owned production modules:

- `src/contracts/tuiInspector.ts`
- `src/presentation/tui/InspectorRegistry.ts`
- `src/presentation/tui/InspectorQueryController.ts`
- `src/presentation/tui/Inspector.ts`
- `src/presentation/tui/CommandPalette.ts`
- `src/presentation/tui/OverlayController.ts`
- `src/presentation/tui/ConfirmationOverlay.ts`

The nine view presenters are cohesive modules under
`src/presentation/tui/inspectorViews/`, one named `<View>InspectorView.ts` per
closed registry entry. Exact focused specs mirror those names under
`spec/basic/tui/`; confirmation integration is
`spec/integration/tui/ConfirmationOverlaySpec.ts`.

## Required Interfaces And Work

1. Consume CA-14 bounded commands/queries, CA-17 session proposal/hold/budget
   capabilities, and CA-19 shell/action/overlay ports. Do not duplicate them.
2. Implement every `cli-session.md §5.2` view with loading, empty, stale,
   truncated, unavailable, and error states. Every page has finite limits and
   stable cursors/revisions; unavailable indexes fail closed.
3. Selection may navigate retained content, open bounded details, insert an
   authorized reference, or invoke a registered action. Selection alone never
   mutates state or invokes a model.
4. Palette and slash surfaces share one closed action registry and availability
   policy. Display mutation class, confirmation, observer eligibility, disabled
   reason, and current key binding.
5. Confirmation overlays show exact proposed action/effect, target, snapshot,
   risk, staleness, and choices. Focus is trapped; escape/cancel applies no
   effect. Confirmation delegates to CA-17 and never executes directly.
6. Prevent hidden-view polling, unbounded fan-out, stale result replacement,
   secret exposure, and action bypass through mouse or palette routes.

## Exclusions

- No inspector model summarization, journal/full-pack scanning, direct store or
  provider imports, shell command palette, arbitrary `wt` command execution, or
  alternate effect path.
- No streaming/concurrent refresh policy (CA-22), terminal lifecycle/security
  qualification (CA-23), or command-class/help integration (CA-24).

## Required Proof

- All nine views across all seven data states with page/cursor/truncation
  assertions and zero-model proof.
- Query cancellation and stale-revision races; hidden views do not poll.
- Palette discoverability, search bounds, action parity, disabled reasons,
  observer filtering, focus trap/restoration, and keyboard/mouse parity.
- Confirmation accept/cancel/stale/illegal/expired cases prove CA-17
  revalidation and CA-10 effect authority remain mandatory.
- Adversarial labels/metadata are sanitized and secrets redacted.
- `nvb build`, `nvb test`, architecture gates, line counts, and Nirvana audit.

## Documentation And Report

No public command change is expected. Write
`.local/agent-reports/coordinator-automation/CA-21-inspector-command-palette-and-overlays.md`
with registry/action matrices, bounded-query proof, confirmation traces, files,
line counts, and CA-22 handoff. Do not commit.

## Independent Review

Use `../review-batches/CA-21-review-inspector-command-palette-and-overlays.md`.
The reviewer independently regenerates all view states, bounds, action parity,
confirmation authority, security, structure, and tests.
