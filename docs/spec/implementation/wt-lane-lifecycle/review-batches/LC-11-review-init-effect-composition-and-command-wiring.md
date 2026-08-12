# Review Batch LC-11 — Init effect composition and command wiring

Review the exact LC-11 work brief and implementation handoff independently.
Verify the installed `wt init` apply path reaches the accepted LC-02/03/04/05/09
owners exactly once, preserves preview purity, and leaves no second effect
authority or command-local policy.

Required independent proof covers the Phase 4 refusal matrix, every staging and
post-commit failure boundary, rollback/recovery idempotence, membership and
index activation, and the real installed `init → status → watch/doctor` path.
Reject hand-built fixtures, source-tree fallback, missing tracker synchronization,
dirty/untracked handoff bytes, missing Nirvana audit, or any structural gate
failure. Reviewer owns the final verdict and acceptance commit.
