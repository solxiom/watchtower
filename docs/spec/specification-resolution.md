# Specification-Resolution Cycle

Status: **Accepted — normative for v1**

This document defines how Watchtower handles a material contradiction or
missing normative decision discovered after an implementation lane starts. It
extends the routing, operator-session, pack-consumer, and effect contracts in
`v1-contracts.md`, `coordinator-automation.md`, and `operator-session.md`.

## 1. Purpose and boundary

Watchtower must stop affected implementation rather than guess between
authorities. It then coordinates bounded architect advice, authoritative pack
amendment, independent acceptance, safe revision activation, and resumption of
the same blocked work.

The architect/advisor is not specification authority. It may analyze evidence
and emit a typed resolution proposal, but it cannot edit an accepted pack,
approve its own amendment, activate a revision, rebase a worktree, release a
hold, or mutate lane state. Those actions retain their existing human/role,
review, validator, and effect boundaries.

## 2. Blocker classification

`NORMATIVE_CONTRADICTION` is a closed blocker class. It applies when two or
more governing accepted references require incompatible behavior, or when a
required material product/architecture choice has no governing answer.

The blocker record contains:

- blocker, lane, initiative, pack, batch, worker-session, and correlation IDs,
  plus `blockerKind` (`contradiction` or `missing-decision`);
- every conflicting reference with path, heading/identifier, digest, authority
  rank, and a bounded excerpt or broker reference;
- the exact implementation decision that cannot legally be made;
- affected batches, repositories, worktrees, claims, proofs, and dependents;
- current pack ID/seal, reviewed commit, index ID, and worker base revisions;
- reporter and detection evidence; and
- status, timestamps, and supersession references.

A vague uncertainty, ordinary implementation defect, missing dependency with a
unique owner, or failing test is not a normative contradiction.

## 3. Routing and holds

`normative-contradiction-v1` is evaluated after safety-integrity and before
general pack-semantic drift. It routes to `D3/C5`, opens a system escalation
session with profile `spec-resolution-v1`, and places a system hold on:

- the blocked batch;
- dispatch/effects whose dependency or proof inputs intersect the conflict; and
- acceptance/publication of an affected candidate.

The hold is impact-scoped, not lane-wide by default. Unrelated parallel lines
continue. Expansion requires deterministic impact evidence or spec-authority
confirmation. Model unavailability never removes the hold or loses the blocker.

## 4. Canonical lifecycle

```text
detected -> held -> advising -> proposed -> authority-review
  -> amendment-in-progress -> amendment-accepted -> activating
  -> worktree-sync-required -> revalidated -> resumed -> closed
```

`rejected`, `superseded`, and `unresolved` are terminal/attention outcomes, not
permission to continue affected work. Every transition is journaled and
idempotent. Restart reconstructs the state from authoritative events/artifacts.

## 5. Architect/advisor allocation

The coordinator selects a `C5` endpoint satisfying the normal project-access,
freshness, independence, budget, and reserve rules. The advisor receives a
bounded envelope containing the blocker, precedence policy, dependency/impact
projection, relevant pack fragments, and broker references. It does not receive
unrestricted pack or repository history.

The advisor returns one `propose-specification-resolution` value with:

- conflict restatement and precedence analysis;
- two or more alternatives when genuinely available;
- one recommended decision and rationale;
- affected normative artifacts and requirement IDs;
- compatibility, migration, proof, branch/worktree, and release impacts;
- proposed hold-scope changes;
- evidence references and unresolved uncertainty; and
- `requiresSpecAuthority: true`.

No model consensus, price, or endpoint brand grants authority. The pack author
and independent pack reviewer must be different actor/session identities; the
advisor may be neither reviewer nor sole authority for its own proposal.

## 6. Authority review and amendment

Only the locally recorded `pack/spec-authority` role may accept a resolution
choice. Confirmation creates an amendment mandate; it does not edit the pack.
The authoritative producer updates the normative sources and all derived briefs,
prompts, maps, schemas, and acceptance criteria implicated by impact analysis.

An independent pack reviewer then accepts or rejects the amended candidate.
The accepted amendment artifact must name:

- current/superseded pack seal and candidate pack seal;
- parent reviewed commit and new reviewed commit;
- blocker and resolution proposal IDs;
- changed normative paths and requirement IDs;
- impact-analysis digest;
- reviewer identity/session and acceptance evidence; and
- exact canonical seal algorithm/version.

The advisor cannot self-accept. A rejected amendment returns to
`amendment-in-progress` or `authority-review`; it never weakens the hold.

## 7. Admission and atomic activation

`admit-pack-amendment` is allowed only from a confirmed spec-authority action.
Before activation Watchtower proves:

1. pack identity matches the active lane and `supersedesSeal` equals the current
   active seal;
2. reviewed commits and acceptance ancestry satisfy the pack contract;
3. the new seal reproduces and every changed accepted input is declared;
4. the blocker/resolution/impact references resolve and affected requirements
   retain implementation and independent-review paths;
5. no critical finding remains;
6. current effects are not left ambiguous; and
7. the activation idempotency key has not already committed.

Under the lane mutation lock the sole effect executor atomically records the
new active pack revision, publishes its verified immutable index, invalidates
old pack-bound envelopes/proposals/ready projections, refreshes impact-scoped
holds, and appends `specification-revision-activated`. Failure retains the old
revision and hold; there is no partially active pack.

## 8. Worktree synchronization and resumption

Activation never runs arbitrary Git commands or silently rebases worktrees.
Each affected active assignment becomes `worktree-sync-required` and records
the required pack revision/commit. The operator or assigned worker performs the
normal authorized branch synchronization. Watchtower validates:

- expected repository/worktree identity and clean/declared dirty state;
- ancestry includes the admitted specification revision;
- no accepted implementation change was lost;
- pack-bound generated artifacts/index references match; and
- ownership and active claims remain valid.

Only then may `resume-specification-blocked-session` target the original worker
session/assignment. The resume envelope contains the accepted resolution and
changed references, not the full pack. A missing original session may be
recovered under the normal session-recovery policy while preserving assignment
and blocker correlation.

The hold releases only after every affected imminent effect is revalidated.
Unrelated lines remain runnable throughout.

## 9. Commands and artifacts

```text
wt coordinator resolution show <blocker-id>
wt coordinator resolution propose <blocker-id> [--dry-run]
wt coordinator session amendment request <session-id> ...
wt coordinator session amendment admit <request-id>
  --acceptance=<pack-acceptance.json> [--dry-run]
wt coordinator resolution sync-check <blocker-id> --worktree=<id>
wt coordinator resolution resume <blocker-id> [--dry-run]
```

`show` and `sync-check` are read-only. `propose` invokes at most one bounded D3
advisor cycle. `admit` and `resume` require confirmation, current-state
validation, and the normal effect executor. `--dry-run` invokes no model and
performs no write, Git operation, index publication, hold change, or resume.

Authoritative artifacts live under:

```text
coordinator/specification-blockers/<id>.json
coordinator/amendment-requests/<id>.json
coordinator/specification-resolutions/<id>.json
coordinator/pack-revisions/<seal>.json
```

## 10. Required events

- `specification-blocker-detected`;
- `specification-resolution-advising`;
- `specification-resolution-proposed`;
- `specification-resolution-authorized` or `-rejected`;
- `pack-amendment-accepted`;
- `specification-revision-activated`;
- `worktree-specification-stale` and `-synchronized`;
- `specification-blocker-resolved`;
- `specification-blocked-session-resumed`; and
- `specification-resolution-closed`.

## 11. Acceptance fixtures

V1 must prove an active multi-worktree lane where a worker reports conflicting
schema and batch-brief requirements. The fixture must show D3 classification,
an impact-scoped hold, unrelated-line progress, bounded advisor output,
spec-authority confirmation, independent amendment review/seal, atomic pack
activation, stale-worktree refusal, explicit synchronization, same-session
resume, crash/replay idempotency, and no direct model/spec/Git mutation path.
