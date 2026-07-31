# Review Batch CA-22 — Turn Streaming, Notifications, Concurrency, and Observer UI

Status: ❌ Not started
Paired work: CA-22
Reviewer floor: `R5`; reviewer owns acceptance commit.

Read the paired brief and governing sources. Apply the full engineering review
matrix. Independently model event ordering, queue bounds, contention, observer
authority, locks, reservations, refresh, and failure recovery.
Verify the exact file and interface surface in the paired brief and
`tui-interface-contracts.md §CA-22`.

## Independent Proof

- Reproduce buffered/streaming/malformed/failing/interrupted turns and atomic
  provisional-to-validated replacement with usage/staleness/proposal states.
- Burst chunks and notifications; verify finite accumulators/queues/caches,
  ordering, frame coalescing, and no lost product event.
- Reproduce live-edge and reading-anchor behavior under stream, prepend,
  resize, notification, and validation replacement.
- Race two attachments on one session: default fail and explicit durable wait
  must create no duplicate invocation, lane lock, session lock while waiting,
  or leaked endpoint reservation.
- Reproduce observer allow/deny matrix; prove zero endpoint invocation,
  mutation, confirmation, hold change, and provisional IPC.
- Verify refresh is foreground-only, cancellable, checkpoint-correct,
  visibility-aware, model-free, and does not move focus/composer/anchor/
  confirmation or advance authority cursors.
- Trace reducer inputs to normalized typed events and components to immutable
  view models; run build/test/gates and independent size/Nirvana audits.

Reject on provider-native parsing in UI, provisional truth, unbounded queue,
duplicate turn, lock held across generation/wait, daemon/socket/IPC authority,
observer mutation, notification model use, or any failed mandatory gate.

Write
`.local/agent-reports/coordinator-automation/reviews/CA-22-turn-streaming-notifications-concurrency-and-observer-ui-review.md`
and hand exact bounds/lifecycle states to CA-23/CA-24.
