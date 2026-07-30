# Decision: Implementation Pack Location

Status: **Resolved**
Decision date: 2026-07-30
Outcome: **Committed design pack plus local execution overlay**
Related:

- `docs/spec/v1-draft.md` §§ 6–9
- `docs/spec/architecture.md` §§ 3, 5, 12
- `docs/spec/pack-design-draft.md` §§ 10–15

## Context

Large implementation packs can contain roadmaps, traceability, quality rules,
difficulty rankings, work/review pairs, corrections, and launch material. Live
packs exposed legitimate problems:

- runtime prompts duplicated canonical batch briefs;
- machine/account configuration appeared near durable design;
- reports, logs, events, and budgets were mixed with project documentation;
- version and dependency structure depended too heavily on naming convention;
- unbounded agent context could consume substantial tokens.

The original proposal moved work/review briefs and roadmaps into local lane
storage under `.local/`. That would reduce committed file count, but it would
also remove the durable architecture needed to reproduce, audit, review, and
continue an implementation effort.

## Decision

The accepted implementation pack remains committed and version controlled.
Watchtower stores only execution-specific overlays under the local lane root.

```text
# COMMITTED — normative architecture and acceptance instruments
docs/spec/<domain>/implementation/<pack-version>/
  README.md
  implementation-pack.json
  implementation-pack.lock.json
  pack-acceptance.md
  requirements-traceability.md
  implementation-map.md
  risk-and-decision-register.md
  implementation-quality-and-agent-rules.md
  batch-reasoning-difficulty-ranking.md
  implementation-roadmap.md
  implementation-tracker.md
  work-batches/
  review-batches/
    corrections/

# LOCAL — machine/operator/runtime execution
.watchtower/lanes/<lane-slug>/
  lane.json
  install.json
  lane.config.env
  repositories.local.json
  model-plan.md
  operator-tracker.md
  state/
  prompts/
  reports/
  budgets/
  logs/
```

The exact committed pack path is project-defined and stored as a logical
repository ID plus repository-relative path. It must resolve inside a declared
version-controlled repository.

## Why briefs remain committed

Work and review briefs are not disposable prompts. They record:

- requirement-to-work traceability;
- source and target ownership;
- dependency and sequencing decisions;
- non-goals and rejected shortcuts;
- compatibility and failure boundaries;
- required proof and independent rerun obligations;
- reasoning requirements;
- reviewer commit authority; and
- correction history.

A tracker line stating that a batch was accepted cannot reconstruct these
decisions. A fresh clone must contain enough information to understand why the
implementation was divided and accepted as it was.

## What moves local

- provider/model/account allocation;
- local repository/worktree paths;
- assignment graphs and coordinator state;
- token/cost plans and usage ledgers;
- generated thin launch envelopes;
- implementer/reviewer/architect reports;
- tmux observations and durable worker events;
- logs, locks, watcher state, and assistant transcripts.

These artifacts are machine-specific, operational, high-churn, or potentially
sensitive. They are never committed.

## Prompt and context policy

Committed `*-agent-launch-prompt.md` files that duplicate batch briefs are not
canonical. Watchtower generates thin local envelopes that reference:

- the canonical committed brief;
- shared quality/agent policy;
- relevant repository bindings;
- local report path;
- event command;
- selected model/effort/account; and
- bounded context manifest.

This addresses token and drift problems without discarding the durable pack.

## Versioning

Pack version is explicit in `implementation-pack.json` and normally reflected
in its committed directory, such as `implementation/v2/`. The manifest and
seal provide exact file roles, batch graph, source baselines, and digests.

Multiple pack versions are durable architecture history, not runtime clutter.
Agents consume bounded context and do not read every historical pack by
default.

## Multi-repository packs

Committed content refers to logical repository IDs:

```json
{
  "repositories": [
    {"id": "awrux", "role": "primary", "access": "write"},
    {"id": "ux-dev-server", "role": "integration", "access": "write"}
  ]
}
```

Absolute paths belong only in
`.watchtower/lanes/<slug>/repositories.local.json`. Each accepted input, source
baseline, batch scope, proof environment, and reviewer commit is qualified by
repository ID.

## Consequences

Positive:

- reproducible from a fresh clone;
- independently reviewable and sealable;
- naturally synchronized through Git;
- preserves architecture and correction history;
- supports multi-machine and team continuation;
- removes duplicated prompt prose and runtime noise from Git;
- gives pack versions a machine-readable identity.

Costs:

- committed repositories retain pack history;
- implementation acceptance may update committed tracker/status artifacts;
- pack authors must separate canonical briefs from runtime envelopes.

These costs are intentional auditability, not accidental runtime pollution.

## Rejected alternatives

### Local-only pack

Rejected. It loses reproducibility, collaboration, independent review context,
and durable architecture.

### XDG archive as durable record

Rejected. XDG data is local execution storage, not collaborative version
control.

### `wt pack push/pull`

Rejected. It would recreate an inferior content synchronization system beside
Git.

### Commit/export only after completion

Rejected. Review and implementation must operate against the same versioned
pack throughout the lane, not a retrospective snapshot.

## Command implications

- `wt pack init` creates a committed skeleton and local pack-design lane.
- `wt pack validate`, `graph`, `diff`, and `seal` operate on the committed pack.
- `wt pack context` creates local bounded context/prompt material.
- `wt init --from-pack` binds an accepted committed pack to a new local
  implementation lane.
- Future archive/cleanup commands may prune local prompts, reports, logs, and
  state, but never delete the committed pack.

## Final rule

```text
Git repository
  = accepted intent, architecture, batch/review contracts, corrections,
    traceability, and outcomes

.watchtower/
  = local execution state, repository paths, allocation, prompts, reports,
    events, budgets, and logs
```
