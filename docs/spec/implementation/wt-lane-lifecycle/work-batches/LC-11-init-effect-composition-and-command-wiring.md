# Batch LC-11 — Init effect composition and command wiring

## Synchronized execution matrix

- **Accepted-map title:** Init effect composition and command wiring
- **Dependencies:** `LC-01`, `LC-02`, `LC-03`, `LC-04`, `LC-05`, `LC-09`
- **Exclusive ownership/interface:** the single `wt init` effect orchestrator
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory proof:** real installed `wt init --json` apply path; transactional failure matrix; Phase 4 refusal contract
- **Implementation report:** `.local/agent-reports/wt-lane-lifecycle/LC-11-init-effect-composition-and-command-wiring.md`
- **Review report:** `.local/agent-reports/wt-lane-lifecycle/reviews/LC-11-init-effect-composition-and-command-wiring-review.md`
- **Correction report pattern:** `.local/agent-reports/wt-lane-lifecycle/reviews/corrections/LC-11-init-effect-composition-and-command-wiring-correction-<NN>.md`
- **Status authority:** implementer emits handoff/blocker only; independent reviewer owns verdict and acceptance commit.

## Objective and ownership

Compose the already accepted lane-lifecycle capabilities into one reachable,
validated `wt init` effect path. The command must validate the accepted pack,
acquire the init lock, stage and commit the lane layout, register bindings,
materialize coordinator/session baselines, and activate the seal-bound pack
index through the existing effect boundary. Keep preview behavior explicit and
side-effect free; do not duplicate LC-02/03/04/05/09 policy or create a second
authority.

## Required proof

1. A real installed `wt init --json` creates a usable lane in an isolated
   control home and reports the applied result through the operator interface.
2. Preview remains read-only and `--apply`/closed grammar behavior is resolved
   by the normative command contract, not an ad hoc flag parser.
3. Refuse unaccepted, unsealed, uncommitted, critically drifted, malformed, or
   mismatched packs before any destination or membership mutation (Phase 4).
4. Exercise failure injection at pack validation, lock acquisition, each
   staging/write/fsync/rename boundary, membership registration, baseline
   materialization, index activation, and post-commit verification. Prove
   rollback leaves authoritative bytes and membership unchanged, and prove
   post-commit recovery is idempotent.
5. Prove the full installed sequence `init → status → watch/doctor` without
   hand-built lane directories, mocks replacing the installed binary, or
   source-tree fallback.
6. Run focused tests, `git diff --check`, `nvb build`, `nvb test`, and `nvb dist`
   where package/runtime bytes are affected. Include the Nirvana API audit,
   size/cohesion inventory, ownership, and clean Git evidence.

## Boundaries

No changes to participating repositories' root `nvb.json`, no product logic in
`src/cli.ts`, no arbitrary shell/task dispatch, no model invocation, and no
REL-01 evidence work. The implementer does not commit or issue a verdict.
