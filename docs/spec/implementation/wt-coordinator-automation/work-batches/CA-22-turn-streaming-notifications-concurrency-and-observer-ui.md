# Batch CA-22 — Turn Streaming, Notifications, Concurrency, and Observer UI

## Authority And Status

Governing sources: `AGENTS.md`, the mandatory engineering standard,
`v1-contracts.md`, `v1.md`, `nirvana-integration-architecture.md`,
`architecture.md`, `v1-implementation-map.md`, `operator-session.md`,
`cli-session.md`, and pack quality rules.
Required interfaces are normative in this pack's
`tui-interface-contracts.md §CA-22 Live Attachment Contract`.

Status: ❌ Not started
Depends on: CA-17, CA-20, and CA-21 accepted
Unblocks: CA-23 and CA-24
Reasoning floor: implementor `R5`; reviewer `R5`

## Objective

Connect the TUI to bounded operator-turn presentation: preflight, normalized
provisional streaming, validated replacement, notifications, same-session turn
contention, explicit waiting, observer restrictions, and attachment-local
refresh without creating a daemon, IPC authority, or unbounded queue.

## Owned Capabilities

- attachment lifecycle/controller integration with session services
- validated presentation-event reducer and immutable TUI view-model store
- provisional turn accumulator and frame-coalesced render scheduling
- notification/checkpoint refresh controller
- same-session contention/wait and observer presentation states

Exact owned production modules:

- `src/contracts/tuiEvents.ts`
- `src/presentation/tui/TuiAttachmentController.ts`
- `src/presentation/tui/PresentationEventReducer.ts`
- `src/presentation/tui/TuiViewModelStore.ts`
- `src/presentation/tui/ProvisionalTurnAccumulator.ts`
- `src/presentation/tui/NotificationRefreshController.ts`
- `src/presentation/tui/TuiRenderScheduler.ts`

Exact focused specs mirror those modules under `spec/basic/tui/`; concurrency,
observer, and checkpoint integration belongs in
`spec/integration/tui/TuiAttachmentConcurrencySpec.ts`.

## Required Interfaces And Work

1. Consume typed events and normalized provider chunks only. Components never
   parse provider-native output or infer durable truth from provisional text.
2. Implement preflight visibility/confirmation, invocation start, provisional
   output, schema validation, atomic validated replacement, stale/failure/
   interrupted terminal states, usage quality, and proposal availability.
3. Bound chunk accumulation, render coalescing, notification queues, refresh
   concurrency, and view-model caches. Decorative frames may drop; product
   events, ordering, validation, interruption, and durable checkpoints may not.
4. Preserve timeline live edge or a stable reading anchor. While scrolled away,
   show bounded new-output indication without moving the operator.
5. Enforce one active turn per session. Default contention fails; explicit wait
   follows the durable result without another invocation or held lock/
   reservation.
6. Observer attachments consume durable validated checkpoints and M0 queries
   only. They cannot submit natural language, confirm/apply, place/release
   holds, receive cross-process provisional chunks, or invoke endpoints.
7. Derive lane notifications mechanically. Refresh never changes focus,
   composer, scroll anchor, or active confirmation and never advances authority
   cursors. Foreground watch/poll ends with attachment and has a correctness-
   preserving checkpoint fallback.

## Exclusions

- No daemon, socket, remote protocol, attachment IPC, provider-side persistent
  chat, second session lock, lane lock during generation, or effect authority.
- No terminal signal/restoration ownership (CA-23) or public command wiring and
  final scale acceptance (CA-24).

## Required Proof

- Buffered and streaming adapters; malformed/failing streams; provisional-to-
  validated replacement; interruption; usage quality; proposal rendering.
- Burst/backpressure tests proving finite queues and ordered durable events.
- Live-edge/away-from-edge anchoring under stream, page prepend, resize, and
  notification.
- Same-session race, fail, wait, detach, and recovery with no duplicate turn,
  held lane lock, or leaked endpoint reservation.
- Observer allow/deny matrix and proof of no endpoint/provisional IPC.
- Notification coalescing, confirmation deferral, hidden-view suppression, and
  checkpoint correctness.
- `nvb build`, `nvb test`, architecture gates, line counts, and Nirvana audit.

## Documentation And Report

Write
`.local/agent-reports/coordinator-automation/CA-22-turn-streaming-notifications-concurrency-and-observer-ui.md`
with reducer/event contracts, all queue bounds, race traces, observer matrix,
files, line counts, and CA-23/CA-24 handoff. Do not commit.

## Independent Review

Use
`../review-batches/CA-22-review-turn-streaming-notifications-concurrency-and-observer-ui.md`.
The reviewer independently regenerates ordering, bounds, races, observer/
notification authority, structure, and test evidence.
