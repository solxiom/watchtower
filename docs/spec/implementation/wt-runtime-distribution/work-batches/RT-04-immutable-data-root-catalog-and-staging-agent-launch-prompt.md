# Agent Launch Prompt — Work Batch RT-04

## Recommended agent/model class for forwarding:

- brief-declared reasoning level: `R4`
- agent suitability: `high`
- primary: `Claude Opus 4.1`, `GPT-5.4`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
- acceptable only with strong human steering and mandatory independent re-review: `Composer 2.5`, `Cursor Auto`
- do not use for the final pass: `Claude Haiku` or any fast/low-reasoning configuration

### Complete forwarding profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high — deep filesystem state transitions, atomicity, and version coexistence`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
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

The declared `R` class is authoritative. Product names above are only
non-normative examples and may become unavailable or stale. Select a currently
available agent that can load the complete brief/spec/source context, inspect
and edit the repository with tools, reason across package boundaries, and run
the required proof without replacing evidence with narrative confidence.

- For `R3`, require reliable bounded repository reasoning and focused regression
  work; a fast low-reasoning model is still unsuitable for final acceptance.
- For `R4`, require deep code reasoning, compatibility analysis, negative-path
  design, and ownership-boundary judgment across multiple files.
- For `R5`, use the strongest available reasoning configuration with sufficient
  context for state machines, concurrency, graph/planner logic, driver behavior,
  destructive migration safety, or cross-package closure evidence.
- If the assigned agent cannot retain the governing context, independently
  inspect the source, or execute the proof, escalate to a stronger agent or
  split only along the existing brief's ownership boundaries. Never reduce the
  contract to fit a weaker model.

You are assigned **implementation work batch RT-04** for the Watchtower
`wt-runtime-distribution` pack.

This batch builds the immutable data-root catalog and XDG precedence resolver.
Every later foundation module depends on the catalog's staging, validation, and
query methods. Atomic first-stage writes and version coexistence are the core
safety guarantees.

## Read In This Order

Repository prerequisites: `AGENTS.md`.

1. `docs/spec/implementation/wt-runtime-distribution/work-batches/RT-04-immutable-data-root-catalog-and-staging.md`
2. `docs/spec/implementation/wt-runtime-distribution/work-batches/README.md`
3. `docs/spec/implementation/wt-runtime-distribution/work-batches/00-work-batch-index.md`
4. `docs/spec/implementation/wt-runtime-distribution/README.md`
5. `docs/spec/implementation/wt-runtime-distribution/implementation-quality-and-agent-rules.md`
6. `docs/spec/v1.md` — especially §7 (filesystem contract, global runtime store)
7. `docs/spec/v1-contracts.md` — especially §11 (locking, transactions, recovery)
8. `docs/spec/architecture.md` — especially §5.2 (user data)
9. RT-02 manifest types — `src/contracts/manifests.ts` and validator
10. RM-03 path resolution — from Pack 1 foundation

## Reasoning / Agent Class

- brief-declared reasoning level: `R4`

### Complete local forwarding and reasoning profile — mandatory

- brief-declared reasoning level: `R4`
- agent suitability: `high — deep filesystem state transitions, atomicity, and version coexistence`
- primary: `GPT-5.4`, `Claude Opus 4.1`
- good alternatives: `Claude Sonnet 4.6`, `GPT-5.2` with high-reasoning configuration
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

## Mandatory Reasoning Protocol

Before editing or accepting code:

1. Build a dependency and ownership map from the governing specs to the exact
   XDG resolution, catalog staging, and validation boundaries.
2. Inspect the current source and accepted predecessor-batch output.
3. Enumerate the atomic staging invariants: temp-directory on same filesystem,
   fsync-before-rename, cleanup on failure, immutability after commit.
4. Use counterexamples: staging to a different filesystem (invalid),
   concurrent-staging race, partial filesystem failure during copy, kill during
   staging, version directory already exists.
5. When a spec and current source disagree, stop and resolve.
6. Treat predecessor reports as leads, not proof.

## Structural Design And Module-Size Gate

- `data-root.ts` targets 220 lines or fewer — it owns XDG resolution only.
- `runtime-catalog.ts` targets 300 lines or fewer — it owns staging, validation,
  and queries. A responsibility inventory is required above 220 lines.
- No single module may exceed 350 lines for new hand-maintained code.
- Do not create `helpers`, `utils`, `common`, or `misc` overflow bags.

## Your Mission

Build the immutable data-root catalog:

1. Implement `resolveDataRoot()` in `src/foundation/data-root.ts` with XDG
   precedence and `~` resolution from OS user home.
2. Implement `RuntimeCatalog` in `src/foundation/runtime-catalog.ts`:
   - `stageRuntime()` — atomic staging via temp-directory-plus-rename
   - `stageKnowledge()` — same pattern for knowledge
   - `isRuntimeInstalled()`, `isKnowledgeInstalled()`
   - `getRuntimeRoot()`, `getKnowledgeRoot()`
   - `listInstalledRuntimes()`, `listInstalledKnowledge()`
3. Validate version strings with `^[0-9]+\.[0-9]+\.[0-9]+(-.+)?$`
4. Enforce immutability: no overwrite of existing version; no mutable path exposed.
5. Error codes: `VERSION_ALREADY_INSTALLED`, `VERSION_NOT_INSTALLED`,
   `INVALID_VERSION_STRING`, `STAGING_VALIDATION_FAILED`, `STAGING_IO_ERROR`.

## What You Must Not Do

- Do not execute any runtime script during staging.
- Do not use `$HOME` — use `os.userInfo().homedir`.
- Do not create directories outside `<data-root>/runtimes/<version>/` or
  `<data-root>/knowledge/<version>/`.
- Do not introduce adapter or managed-link logic.
- Do not add npm scripts. Do not commit.

## Required Proof

- XDG precedence: `WATCHTOWER_DATA_HOME` > `XDG_DATA_HOME` > `~/.local/share/watchtower`
- `~` resolved from OS user home, not `$HOME`
- Atomic staging: kill before rename leaves no valid version directory
- Immutability: write attempt on staged version fails
- Two versions coexist independently
- Invalid version string rejected
- Already-installed version rejected
- Staging validation passes/fails as expected
- `getRuntimeRoot` throws for uninstalled
- `listInstalledRuntimes` returns correct sorted list
- Architecture checks pass

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Required Disk Report

Write exactly one implementation report to:

- `.local/agent-reports/wt-runtime-distribution/RT-04-immutable-data-root-catalog-and-staging.md`

## Always plan and make task lists

When you work always plan and make task lists and todos!

## Leave a helpful handoff message for the next agent

Record the XDG precedence order, version string regex, staging algorithm
(temp-dir-rename, same-filesystem requirement), all five error codes, and the
immutability guarantee. Make explicit that RT-05 and RT-06 depend on the
catalog's staging and query methods.
