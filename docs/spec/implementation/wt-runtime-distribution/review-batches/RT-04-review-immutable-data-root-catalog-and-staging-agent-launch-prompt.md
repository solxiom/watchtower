# Agent Launch Prompt — Review Batch RT-04

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high to very high`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high to very high — atomic staging and immutability verification`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`
- acceptable only with strong human steering and mandatory independent
  re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration
- selection constraint: the agent must retain the complete prompt, governing
  specs, current source, predecessor handoff, and proof output in context; if it
  cannot do so, escalate the agent rather than shortening or partitioning away
  safety instructions
- final-authority constraint: a steering-only or lower-reasoning agent may help
  with bounded exploration, but it cannot issue the final implementation or
  acceptance judgment for this batch

## Capability-Based Agent Selection Rule

The declared `R` class is authoritative. Select a currently available agent that
can load the complete context, inspect and edit the repository, and run proof
without replacing evidence with narrative confidence.

## Your Review Mission

You are assigned **review batch RT-04**. Independently verify XDG precedence,
atomic staging, immutability, and version coexistence. Simulate crash-during-staging
and prove the catalog leaves no partial state.

## Read In This Order

1. `docs/spec/implementation/wt-runtime-distribution/review-batches/RT-04-review-immutable-data-root-catalog-and-staging.md`
2. Paired work brief and implementation report
3. `docs/spec/v1.md` §7, RT-02 manifest types, RM-03 path resolution
4. Quality rules

## Required Independent Proof

- Test XDG precedence: `WATCHTOWER_DATA_HOME` > `XDG_DATA_HOME` > `~/.local/share/watchtower`
- Prove `~` from `os.userInfo().homedir`, not `$HOME`
- Simulate kill-during-staging: staging to temp dir, kill before rename, verify target version dir absent
- Prove immutability: re-stage same version fails; raw write to staged dir fails
- Prove coexistence: two versions exist independently; `listInstalledRuntimes()` returns both
- Test rejection: invalid version string, manifest mismatch, uninstalled version, I/O error
- Architecture checks

## Acceptance Gate

Accept only if XDG precedence correct, staging atomic, versions immutable after
commit, coexistence works, and every rejection path independently proved.

## Rejection Correction Brief Rule

- `corrections/RT-04-correction-<N>.md`

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Required Disk Report

- `.local/agent-reports/wt-runtime-distribution/reviews/RT-04-immutable-data-root-catalog-and-staging-review.md`

If accepted, create the acceptance commit.

## Always plan and make task lists
