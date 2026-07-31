# Review Batch CA-24 — Session Command Integration, Scale/Replay, and M6 Acceptance

> Mandatory v1 gate: [`../specification-resolution-batch-amendment.md`](../specification-resolution-batch-amendment.md), CA-24 ownership and full acceptance fixture.

Status: ❌ Not started
Paired work: CA-24
Reviewer floor: `R5`; reviewer owns the Pack 5 acceptance commit.

Read every v1 governing spec, accepted CA-01–CA-23 report, pack index/roadmap/
tracker, paired brief, and mandatory engineering standard. Conclusions from
lower reports guide reproduction but are not accepted facts. Include the full
engineering acceptance matrix.
Verify the exact command/file and interface surface in the paired brief and
`tui-interface-contracts.md §CA-24`.
Trace every requirement in `tui-operational-experience.md` to independent
evidence; absence from a lower report is not permission to omit it.

## Independent Pack-Exit Proof

- Reproduce every public session/ask/hold command across success/error/empty,
  TTY/refusal, redirected, human/JSON, help, completion, and global install.
- Verify create, attach, lifecycle resume, observe, detach, close, many-session,
  concurrent attachment, wait, restart, and recovery semantics.
- Reproduce explicit/zero/one/many-lane entry and switching guards, proving no
  unintended creation, plus `doctor --tui` and redacted report content,
  permissions, overwrite, and non-mutation behavior.
- Independently generate 30/300/3,000/10,000-batch sealed fixtures with fixed
  affected neighborhoods. Record exact model envelope bytes/tokens and prove
  unrelated growth does not increase routine context.
- Grow retained turns and session count; prove bounded working sets, queries,
  cursors, viewport memory, replay, compaction, references, and no full-history
  fallback.
- Reproduce reference-profile startup/input/view latency, idle CPU, stabilized
  memory, render bounds, and two-hour PTY soak.
- Reproduce crash/replay, duplicate/interrupted events, renderer/native loss,
  stale/illegal proposals, hold interleaving, and multi-repository isolation.
- Audit every authority path: M0 uses no model; floors never downgrade; all
  effects use CA-10; generation/wait holds no lane lock; observers cannot
  mutate; project `nvb.json` is untouched.
- Independently run a bounded decision cycle through `opencode-cli`; rerun via
  `hermes-cli` when installed and record absence as an explicit skip otherwise.
  Prove changed catalog/model fingerprints invalidate eligibility, aliases
  share one pool, and economics never crosses a capability/access/reserve/
  independence constraint.
- Run clean `nvb build`, `nvb test`, `nvb dist`, all RT-03 global-install
  targets, architecture/security gates, link/docs consistency, line counts,
  staged-artifact and ownership checks.
- Reconcile every promoted target tuple and visual-catalog state against a
  reproducible evidence index, including search/draft/conflict/migration cases.

Reject on any unreproduced lower-batch claim, context/queue/memory growth beyond
declared bounds, missing target, command/help/schema drift, alternate authority,
lock across model work, failed test/gate, or known violation. No conditional
acceptance and no “follow-up” waiver.

Write
`.local/agent-reports/coordinator-automation/reviews/CA-24-session-command-integration-scale-replay-and-m6-acceptance-review.md`.
Only `ACCEPT` may mark CA-24, Pack 5, and M6 accepted and unblock REL-01. On
rejection create a numbered correction brief and leave Pack 5 incomplete.
