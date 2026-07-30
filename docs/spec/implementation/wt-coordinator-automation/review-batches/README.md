# Watchtower v1 Coordinator Automation Review Batches

Status: active review brief pack
Date: 2026-07-30

## Purpose

This directory contains the reviewer-side acceptance briefs for the Watchtower v1
coordinator-automation delivery pack — 18 batches forming the M6 coordinator
automation foundation.

Each review batch includes:

- the review brief
- the paired review-agent launch prompt

## Acceptance Authority

This directory is the only executable acceptance brief pack for the 18
wt-coordinator-automation batches (CA-01 through CA-18). Reviewers rerun proofs,
inspect source independently, and are the acceptance authority. The
implementation agent does not commit; the reviewer owns the acceptance decision
and the commit.

## Rules

- Before any batch review, read the repo-level mandatory material named in
  `AGENTS.md`.
- Read the lane roadmap, tracker, and quality rules first.
- Read `docs/spec/implementation/wt-coordinator-automation/README.md` for the
  lane-level owner map.
- Read the paired implementation work brief and the implementation report.
- Rerun the focused and broader proofs independently. Do not treat the
  implementation report's conclusions as accepted facts.
- Compare every changed file against the allowed-areas table and the accepted
  prerequisite commit before evaluating behavior.
- Accept only when the batch satisfies its deliverables, tests pass, model-free
  integrity is proved (for CA-01–CA-04), all status docs are updated.
- If rejected and implementation follow-up is required, create a numbered
  correction brief in `corrections/`.
- Workspace and user files must remain owned by the host user.

## SQLite-Specific Review Rules (CA-01, CA-02, CA-03)

For index-foundation batches that use SQLite:

- **No raw SQL exposed to consumers**: Grep for `.exec(`, `.run(`, `.prepare(`,
  `.all(`, `.get(` — these must appear ONLY inside the designated storage
  capsule module (`index-store.ts`, `journal-wal.ts`). Any occurrence outside
  the capsule is a hard reject.
- **SQLite bytes never treated as semantic authority**: Verify that the semantic
  root is computed from canonical logical rows (RFC 8785 canonicalized export),
  never from raw SQLite file bytes or `PRAGMA` internal state.
- **Index is provably rebuildable (semantic root)**: Independently compile the
  same sealed pack twice. Verify identical logical row sets and identical
  semantic-root digest. Raw SQLite file bytes may differ — this is acceptable.
- **Corruption is detected, not silently served**: Corrupt the SQLite database
  bytes. Verify every query returns an error code, the index is invalidated,
  and no partial or incorrect data is served.
- **No full-pack/JSON-shard fallback exists**: Grep for pack-manifest reading,
  JSONL scanning, or full-file loading outside the compiler. Prove no fallback
  path bypasses the index.

## Additional Review Rules

- Use `../implementation-quality-and-agent-rules.md#reviewer-hard-reject-checklist`
  as a stop/go gate before discussing polish, naming, or minor cleanup.
- Verify that the implementation followed the ownership shape declared in the
  lane-level README and the governing specs. Cross-layer leakage is a hard
  reject.
- For all foundation batches (CA-01–CA-10), verify that no command or CLI
  rendering logic has entered the foundation layer.
- For CA-01–CA-04, verify model-free: no AI/LLM import exists in any source file.
- For CA-05, verify classification-only: no effect execution or mutation.
- For CA-09 and CA-10, verify the validator and executor are accepted before any
  downstream batch (CA-11–CA-13) can proceed.
- Reject any batch that leaves trackers, roadmap, or spec docs stale.
- Reject any batch whose implementation agent committed changes. The reviewer
  owns the acceptance commit.

## Mandatory Reviewer Independence

The reviewer must:

1. Rerun all proof commands independently from a clean build.
2. Inspect every changed file against the allowed ownership areas.
3. Compare the implementation against the governing specs, not just the
   implementation report's narrative.
4. Reject structural defects before discussing naming or polish.
5. Record correction briefs with exact required fixes when rejecting.
6. Create the acceptance commit only after all proofs pass and status docs
   are synchronized.

The reviewer's acceptance commit message must reference the batch ID, a
one-line summary, and the implementation report path.
