# Review Batch CA-21 — Inspector Views, Command Palette, and Overlays

Status: ❌ Not started
Paired work: CA-21
Reviewer floor: `R4`; reviewer owns acceptance commit.

Read the paired brief and governing specs. Apply every mandatory engineering
gate and independently trace CA-14/CA-17/CA-19 reuse, query bounds, action
authority, confirmation, and presentation security.
Verify the exact file and interface surface in the paired brief and
`tui-interface-contracts.md §CA-21`.

## Independent Proof

- Reproduce all nine inspector views in loading, empty, stale, truncated,
  unavailable, error, and populated states with stable cursors/revisions.
- Prove every view is bounded and model-free, hidden views do not poll, stale
  query results cannot replace current state, and index loss has no scan
  fallback.
- Reproduce palette search bounds, action/slash parity, availability, mutation
  class, confirmation, observer eligibility, disabled reason, and key binding.
- Verify selection alone is inert; reference insertion changes only composer
  state; details/help/settings remain bounded.
- Independently walk accept, cancel, stale, illegal, expired, escape, mouse,
  and keyboard confirmation paths. Every effect still uses CA-17 revalidation
  and CA-10.
- Attack labels, metadata, errors, and details for escape/secret disclosure.
- Run build/test/architecture gates and independent size/Nirvana audits.

Reject on model-backed inspector data, direct store/journal scanning, arbitrary
shell/CLI palette execution, confirmation bypass, observer mutation, hidden
poll fan-out, or any failed mandatory gate. No conditional acceptance.

Write
`.local/agent-reports/coordinator-automation/reviews/CA-21-inspector-command-palette-and-overlays-review.md`
and hand the exact registry/action contracts to CA-22.
