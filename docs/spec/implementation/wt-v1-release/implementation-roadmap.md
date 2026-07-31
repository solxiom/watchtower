# Watchtower v1 Release Implementation Roadmap

> **Accepted bootstrap implementation artifact.** Dispatch is authorized only under the
> accepted dependency DAG and paired independent batch-review gates. Product-created
> lanes remain subject to the structured pack acceptance and seal contract in
> `docs/spec/v1-contracts.md`.

All implementation/review work uses thin Nirvana command front doors,
capability-owned foundation modules, the immutable packaged NVB task catalog,
`LaneTaskRunner`, diagnostic-only Nirvana logging, appropriately bounded
Nirvana storage adapters, and manifest-declared shell leaves only. Project
`nvb.json` files, workflow-level shell, arbitrary task selection, relaxed module
limits, and acceptance-with-follow-up are forbidden.

Status: 🔴 Pending — batched, not started
Date: 2026-07-30
Owner areas: watchtower `docs/spec/`, `spec/e2e/`, `spec/security/`, `spec/performance/`, `help/`

Parent documents:

- `docs/spec/v1-implementation-map.md`
- `docs/spec/v1.md`
- `docs/spec/implementation/wt-v1-release/README.md`

## Mission

Qualify the assembled Watchtower v1 CLI against every release acceptance
criterion in `v1.md §17`. This pack adds no features. It produces end-to-end
evidence, system acceptance fixtures, security/performance/package
qualification proof, and a final documentation consistency audit.

The pack must guarantee:

- one globally installed `wt` package completes an implementer→reviewer→accept
  cycle without copying the runtime tree
- two isolated lanes coexist; multi-repository commit verification and
  partial-push recovery are proven
- traversal, config, permission, manifest, and global install proof passes
- every §17 acceptance criterion has reproducible evidence
- all help fragments and product docs agree with shipped behavior
- no scaffold, generated, or local artifact is committed

## Non-Negotiable Delivery Rules

- No new product features are added in this pack. REL-01 through REL-03 build
  qualification fixtures and run acceptance trials; REL-04 audits consistency.
- All packs 1–5 must be accepted before REL-01 begins. Each REL batch
  depends on the prior REL batch.
- Security and performance claims require fixture-based, reproducible evidence.
  Narrative-only claims are rejected.
- End-to-end evidence must use the globally installed `wt` binary and real
  filesystem/Git fixtures. Mock-only trials are rejected.
- Documentation audit (REL-04) must not retroactively invent missing help
  fragments or spec sections. Discrepancies are recorded as findings; only a
  prior pack may create the missing artifact.
- Every release acceptance criterion in `v1.md §17` must be traceable to the
  owning batch and its proof. No criterion is satisfied by intent or
  specification alone.
- Reviewer acceptance commits are the authority. Implementation reports,
  green prose, and implementer-proposed commit messages are not acceptance
  evidence.

## Delivery Phases

### Release Qualification

Goal: prove the assembled product is complete, safe, and performant.

Batches:

- REL-01 — Fresh-lane implementer→reviewer→accept trial
- REL-02 — Concurrent and multi-repository recovery trials
- REL-03 — Security, ownership, performance, and package qualification
- REL-04 — Documentation consistency and release gate

Status: 🔴 All pending

### REL-01: Fresh-lane implementer→reviewer→accept trial

Goal: globally install `wt`, initialize a complete implementation lane,
dispatch work, hand off to a reviewer, record independent acceptance, and
publish acceptance commits — one end-to-end documented cycle.

Depends on: LC-08, UK-05, CA-24 accepted (Packs 3, 4, 5 complete).

Primary ownership: `spec/e2e/accept-trial.spec.ts`, release evidence fixtures.

Required proof:
- `nvb dist` produces a globally installable package
- `npm install -g ./dist` succeeds
- `wt init` creates a usable lane from the bundled runtime
- `wt init` refuses an unaccepted, unsealed, uncommitted, or critically
  drifted implementation pack
- `wt watch` preserves wake/heartbeat stdout and signal exit behavior
- a fresh lane completes one implementer→reviewer→accept cycle
- `wt doctor` detects missing dependencies, broken links, unsafe config
- `wt status --json` output is stable and schema-valid
- `wt upgrade --apply` changes only manifest-owned paths, retains old runtime
  on failure, preserves operator-session history

Acceptance snapshot (target):
- globally installed `wt` binary functions from any working directory
- `wt init <slug> --tmux-prefix=<pfx> --impl-pack=<path> --coordinator-routing=<path>` succeeds
  without copying the runtime tree into the target project
- the created lane is discoverable from control-home descendants, the lane
  directory, and registered participating-repository paths
- `wt status --json` returns a valid `laneStatus` matching the JSON Schema
- `wt watch` starts the watcher, emits heartbeat lines, and exits on Ctrl-C
- one implement batch dispatches, completes, handoffs, and a reviewer session
  independently accepts and publishes commits
- the release evidence packet documents exact commands, outputs, and timestamps

### REL-02: Concurrent and multi-repository recovery trials

Goal: prove two isolated lanes coexist without slug or state collision; a
multi-repository commit set is verified and partially pushed with
documented recovery; shared-write refusal is proven.

Depends on: REL-01 accepted.

Primary ownership: `spec/e2e/concurrent.spec.ts`, `spec/e2e/multi-repo.spec.ts`.

Required proof:
- one repository participates in multiple active lanes without slug or state
  collision
- one lane binds multiple repositories and records per-repository acceptance
  commits
- concurrent writable bindings are rejected or explicitly isolated with
  dedicated worktrees
- ambiguous multi-lane selection fails with actionable candidates
- reviewer acceptance remains durable and distinct from partial Git publication
- interrupted or duplicate coordinator cycles recover idempotently
- copied-template lanes are ignored and never modified

Acceptance snapshot (target):
- two lanes with different slugs bound to one repository execute independently
- a lane binding two repositories accumulates per-repository acceptance commits
- shared-write worktree conflict is detected and refused
- a partial Git push (one repository succeeds, one fails) leaves the accepting
  lane in a recoverable state with complete push journals
- duplicate cycle idempotency key replay returns the recorded outcome without
  repeating the effect
- a pre-existing copied-template directory with `.watchtower/` is not
  discovered, inspected, or modified

### REL-03: Security, ownership, performance, and package qualification

Goal: produce traversal, config, permission, manifest, and global install
fixture evidence; prove bounded discovery and status performance; verify
packaging integrity.

Depends on: REL-01, REL-02 accepted.

Primary ownership: `spec/security/`, `spec/performance/`.

Required proof:
- traversal suite: path escape through symlinks, lane directory, repository
  binding, and runtime store is refused
- config suite: strict env parsing rejects shell injection, command
  substitution, and variable expansion; malformed state is reported not
  executed
- permission suite: `wt doctor` verifies configured OS account access;
  runtime entrypoints are readable/executable but not writable by worker
  accounts; lane store is writable only by the operator account
- manifest proof: every packaged runtime and knowledge asset is represented
  in manifests with matching checksums; missing or extra files fail build
  validation
- global install proof: the installed `dist/` package contents match manifests;
  staged immutable runtimes under XDG data are checksum-verified
- boundedness proof: lane discovery and status complete in bounded time
  independent of unrelated lane/pack count; ambiguous selection fails fast
- cost proof: ordinary `wt status` and `wt list` do not grow in tokens or
  wall time as unrelated pack size grows from 30 to 10,000 batches
- idle polls, heartbeats, event filtering, session checks, and ready-set
  calculation invoke no model

Acceptance snapshot (target):
- all traversal, config, and permission negative fixtures pass
- build validation fails on missing, extra, non-executable, or
  checksum-mismatched managed assets
- `wt doctor` passes all checks for a correctly configured lane and correctly
  reports violations for each deliberately broken fixture
- status/list wall time and output size remain bounded across synthetic
  scaling fixtures
- model invocation count is zero for every mechanical coordination operation
  enumerated in the spec

### REL-04: Documentation consistency and release gate

Goal: trace every v1 acceptance criterion to its owning batch and current
evidence; verify every shipped command has a help fragment, product docs,
and spec agreement; confirm no scaffold, generated, or local artifact is
committed.

Depends on: REL-01, REL-02, REL-03 accepted.

Primary ownership: `help/`, `docs/`, release notes.

Required proof:
- every §17 acceptance criterion is traced to an owning batch and proof
- every shipped command has a help fragment registered in `help/help.json`
- every help fragment matches the current behavior of its command
- product docs (`v1.md`, `architecture.md`, `v1-contracts.md`) agree with
  actual behavior on every shipped command
- `hello` scaffold command and all its artifacts (help, spec, test) are removed
- no build (`build/`), dist (`dist/`), `node_modules/`, `.nira/local/`, or
  `.watchtower/` artifact is committed
- the `package.json` version, README, and release notes are consistent
- final release verdict is recorded

Acceptance snapshot (target):
- requirement-to-batch traceability matrix is complete and cross-referenced
- help audit: every command in `help/help.json` exists, matches its spec
  description, and has no undocumented flags
- doc audit: `v1.md`, `architecture.md`, and `v1-contracts.md` contain no
  stale or contradictory claims about shipped behavior
- scaffold audit: `hello` command, `help/commands/hello.hlp.json`, and
  `src/commands/HelloCommand.ts` are removed
- artifact audit: `git ls-files` confirms no build, dist, node_modules,
  `.nira/local`, or `.watchtower` files are tracked
- release verdict: `ACCEPT` with evidence traceability map, or `REJECT`
  with enumerated unresolved criteria

## Sequencing Rule

- REL-01 depends on LC-08, UK-05, and CA-24 accepted (Packs 3, 4, 5 complete).
- REL-02 depends on REL-01 accepted.
- REL-03 depends on REL-01 and REL-02 accepted.
- REL-04 depends on REL-01, REL-02, and REL-03 accepted.
- No REL batch may begin before all prior packs (1–5) are accepted.

## Recommended Honest Execution Order

1. Verify Pack 5 acceptance and all prerequisite packs.
2. REL-01: global install, init, dispatch, handoff, accept, publish — one full
   cycle with documented evidence.
3. REL-02: concurrent lanes, multi-repository acceptance, shared-write
   refusal, partial push recovery.
4. REL-03: security fixtures, performance bounds, packaging integrity proof.
5. REL-04: documentation audit, scaffold removal, artifact audit, release
   verdict.

## Rejected Shortcut

This roadmap rejects:

- accepting release criteria from narrative or prior-handoff claims without
  independent re-proof
- using mock-only trial fixtures where the spec requires a real installed
  package and real filesystem/Git operations
- deferring documentation consistency to post-release cleanup
- claiming security or performance properties without fixture-based
  reproducible evidence
- marking release criteria satisfied because a prior batch claims them
  without current evidence
- treating REL-04 as permission to "fill in" missing help or spec content
  that should have been created by the owning batch
- accepting the release if any scaffold, generated, dist, or local artifact
  is committed
