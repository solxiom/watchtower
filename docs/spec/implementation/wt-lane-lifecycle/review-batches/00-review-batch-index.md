# Review Batch Index — Watchtower v1 Lane Lifecycle

Status: active index
Date: 2026-07-30

## Review Order

Review batches must be executed in numerical order, following the work batch
dependency chain. A review batch may not begin before the paired implementation
batch is complete, the implementation report is written, and all prerequisite
review batches are accepted.

| Review batch | Reviews work batch | Reviewer minimum proof |
|-------------|-------------------|----------------------|
| LC-01 | LC-01 | All argument combinations (slug, prefix, scope, routing); invalid slug/prefix rejection; ambiguous binding rejection; scope JSON validation; missing/invalid impl-pack path; dry-run premise (zero filesystem writes); exact preflight plan shape; prefix pattern `^[a-z0-9][a-z0-9-]{0,15}$`; slug pattern `^[a-z0-9][a-z0-9-]{0,62}$`; path escape and shell injection rejection |
| LC-02 | LC-02 | JSON Schema validation of all three document types; RFC 8785 seal reproduction against known-good vectors; reject missing/deleted/shifted sealed bytes; all six drift codes with representative fixtures for each; file-set rejection (symlinks, devices, sockets, untracked, ignored); no model classification |
| LC-03 | LC-03 | Adjacent staging on same filesystem; atomic rename commit point with no observable partial state; rollback on write failure, fsync failure, rename failure, partial manifest generation; manifest written last; `lane.json` and `install.json` schema validation; duplicate lane rejection; complete lane-directory layout |
| LC-04 | LC-04 | Lock acquisition order in all code paths (data-root → lane → session → projection/index); `.gitignore` atomic update preserving original content; conditional rollback on digest mismatch; membership index under its lock; post-commit registration retry; idempotent registration; stale entries reported but never repaired |
| LC-05 | LC-05 | Shipping-policy baseline: every value matches v1-contracts.md §7 exactly; routing policy: all 15 rules present in correct order; operator-session policy defaults match; provenance markers reference correct spec sections; pack index seal matches active pack seal; deterministic byte-identical reproduction; no model invocation; no full-pack fallback |
| LC-06 | LC-06 | All preflight failure conditions (exit 3, 4, 5 with correct codes); `--json` rejected with exit 2; WT_* variables complete and correct (11 required, 0 coordinator-only); RuntimeInvoker called with correct action, env, and stdio: "inherit"; foreground exec (no daemonization); Ctrl-C terminates without orphans; exit code propagation |
| LC-07 | LC-07 | All 15 check categories represented with at least one check each; every check returns correct pass/warn/fail/skip on appropriate fixtures; tool checks (fail on absent mandatory, warn on absent optional); read-only proof (zero filesystem writes); exit code 0 on pass/warn, exit code 4 on any fail; JSON output matches doctorReport schema; grouped category output |
| LC-08 | LC-08 | End-to-end fixture: init creates valid lane, status reads it, watch preflight passes, doctor returns pass/warn; rollback proof: invalid init and missing-arg init leave no residual state; all hello artifacts deleted (`src/commands/HelloCommand.ts`, `help/commands/hello.hlp.json`, hello spec); `src/commands/index.ts` cleaned; `help/help.json` cleaned; zero hello references in `src/`, `help/`, `spec/`, `runtime-nvb/`; `nvb build` and `nvb test` pass after removal; all real commands intact |

## Shared Review Rule

The reviewer must independently regenerate evidence. Implementation report
conclusions are not accepted facts. Every reviewer must run the exact test
commands named by the batch and record the output, not narrate the outcome.

Acceptance commits must include all accepted non-`.local` changes with a
descriptive commit message. Rejections must produce a numbered correction
brief under `corrections/` with exact required fixes.

## Batch Acceptance Criteria

A review batch is accepted only when:

1. All minimum proof obligations (above) are independently reproduced and pass.
2. No hard-reject checklist item is flagged.
3. Status docs (`implementation-tracker.md`, `implementation-roadmap.md`) are
   updated for the batch outcome.
4. The corrected `v1.md` command status table is updated when the batch owns
   a CLI command (LC-01, LC-06, LC-07, LC-08).
5. All files are owned by `kavan:kavan`.
6. No `.local/` artifacts are staged.
7. The reviewer creates the acceptance commit.

## Dependency Order

Review batches follow the dependency order established by the work batch
dependency graph:

- LC-01 and LC-02 may be reviewed in parallel after their external dependencies
  from Pack 1 and Pack 2 are accepted.
- LC-03 depends on both LC-01 and LC-02 being accepted.
- LC-04 and LC-05 may be reviewed in parallel after LC-03 is accepted.
- LC-06 depends on LC-05 being accepted.
- LC-07 depends on LC-04, LC-05, and LC-06 all being accepted.
- LC-08 depends on LC-07 being accepted.

A review batch may not begin while its paired work batch is in correction.
