# Specification-Resolution Batch Amendment

Status: **Normative for Watchtower v1 implementation**

This amendment assigns the lifecycle in
[`../../specification-resolution.md`](../../specification-resolution.md) to the
existing Pack 5 batches. It does not create a later milestone or a second
coordination subsystem.

## Cross-Batch Invariants

1. A detected normative contradiction creates a durable
   `NORMATIVE_CONTRADICTION` blocker and an impact-scoped D3/C5 system hold.
   Unaffected batches and repositories continue.
2. A C5 architect advisor receives a bounded immutable envelope and may return
   only `propose-specification-resolution`. Advice has no mutation authority.
3. Spec authority confirmation, pack authorship, and independent pack review
   remain distinct authority steps. An advisor response, operator prose, or an
   unreviewed commit cannot activate an amendment.
4. `admit-pack-amendment` validates accepted review evidence, the replacement
   seal, commit identities, impact scope, and current lane state before the sole
   effect executor atomically activates a new pack revision.
5. Existing worktrees are never rebased or merged automatically. Affected
   worktrees become `worktree-sync-required`; explicit synchronization must be
   validated against the active revision before work resumes.
6. `resume-specification-blocked-session` resumes the same durable worker and
   operator-session identities when they remain valid. It does not silently
   spawn replacement work or discard prior session history.
7. Every transition is journaled and replay-safe. Duplicate proposals,
   admissions, activations, synchronizations, and resumes are idempotent or
   rejected deterministically.

## Batch Ownership

| Batch | Mandatory responsibility |
|---|---|
| CA-05 | Add `normative-contradiction-v1` after safety/integrity routing and before ordinary pack-semantic drift; classify it D3 with a C5 floor and impact-scoped hold. |
| CA-07 | Build bounded immutable contradiction and advisor envelopes containing conflict references, active seals/commits, impact scope, evidence references, and no unbounded pack text. |
| CA-09 | Type and validate `propose-specification-resolution`, `admit-pack-amendment`, and `resume-specification-blocked-session`, including origin, authority, state, seal, independence, staleness, and idempotency failures. |
| CA-10 | Execute atomic `activate-pack-revision` and `resume-blocked-session` effects. Keep the old revision active on any validation or commit failure; never perform Git synchronization. |
| CA-13 | Prioritize blocker events, preserve impact-scoped parallel progress, replay the lifecycle, invalidate stale derived state on activation, and expose synchronization-required/resumed events. |
| CA-14 | Implement thin human/JSON/help surfaces for `resolution show`, `resolution propose`, `resolution sync-check`, and `resolution resume`. |
| CA-17 | Implement `session amendment admit`, the `spec-resolution-v1` C5 escalation profile, authority confirmation, scoped holds, and same-session continuation semantics. |
| CA-24 | Reproduce the complete lifecycle end to end, including an unaffected parallel line, rejected unauthorized advice, accepted/resealed activation, stale-worktree refusal, explicit sync, replay, and same-session resume. |

## Required Acceptance Fixture

The independent CA-24 review must construct one lane with two concurrent lines.
Line A encounters a real normative contradiction; line B remains eligible.
Evidence must prove all of the following:

1. only line A is held;
2. the advisor cannot edit or activate normative state;
3. a proposal without spec-authority confirmation is rejected;
4. an amendment without independent pack acceptance and a current replacement
   seal is rejected;
5. accepted activation is atomic and makes old envelopes stale;
6. an unsynchronized worktree cannot resume;
7. explicit synchronization plus current-state validation resumes the original
   session and worker identity;
8. crash/replay and duplicate command delivery do not repeat effects; and
9. line B continues throughout.

Failure of any item rejects CA-24 and Pack 5/M6.
