# Review Batch REL-01 — Fresh-lane implementer→reviewer→accept trial

## Synchronized batch execution matrix

- **Accepted-map title:** Fresh-lane implementer→reviewer→accept trial
- **Dependencies:** `LC-08`, `UK-05`, `CA-24`
- **Exclusive ownership/interface:** end-to-end fixture/release evidence
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory batch proof:** Global install; init; dispatch; handoff; independent accept; publication
- **Implementation report:** `.local/agent-reports/watchtower-release/REL-01-fresh-lane-implementer-reviewer-accept-trial.md`
- **Review report:** `.local/agent-reports/watchtower-release/reviews/REL-01-fresh-lane-implementer-reviewer-accept-trial-review.md`
- **Correction report:** `.local/agent-reports/watchtower-release/reviews/corrections/REL-01-fresh-lane-implementer-reviewer-accept-trial-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ✅ Accepted | Reviews work batch: REL-01
Work ID: `REL-01`
Governing spec: `docs/spec/v1.md` §17; `docs/spec/v1-contracts.md` §§2–8

**Required reviewer reasoning class:** `R5`
**Class rationale:** independent reproduction of the complete end-to-end pipeline spanning all six packs. The reviewer must verify: global install from `nvb dist`, lane initialization without runtime-tree copy, init refusal on unaccepted/unsealed/uncommitted/drifted packs, lane discovery from all documented paths, `wt status --json` schema compliance, `wt watch` heartbeat and signal behavior, the implementer→reviewer→accept cycle with real Git commits, operator-session lifecycle (create/ask/hold/release/close), `wt doctor` pass/warn/fail on broken fixtures, `wt upgrade` preview/apply with managed-path-only changes and session-history preservation. The reviewer must independently execute every step, not accept the implementation report's claims. The class is a floor.

## Scope Verification

Confirm that the implementation produced:

1. `spec/e2e/accept-trial.spec.ts` — e2e Jasmine spec exercising the full pipeline through the globally installed `wt` binary.
2. `.local/agent-reports/watchtower-release/REL-01-fresh-lane-trial.md` — the release evidence packet.
3. Updated trackers (`implementation-tracker.md`, `implementation-roadmap.md`, work/review indexes, `v1-implementation-map.md`).
4. No new product features, commands, or foundation modules.
5. No mock that replaces the real `wt` binary where the spec requires real CLI/filesystem/Git operations.

## Required Independent Proof

### Contract pass

1. **Prerequisite verification:** Open pack 1–5 trackers. Confirm every batch is marked accepted. Run `nvb build` and `nvb test` independently. Record commit hash.
2. **Hello scaffold removal:** Verify `src/commands/HelloCommand.ts`, `help/commands/hello.hlp.json`, and any hello spec file do not exist.
3. **Global install:** Verify `nvb dist` exit code. List `dist/` contents and verify every required directory exists. Compare `dist/runtime/manifest.json` managed assets against actual files. Install globally with `npm install -g ./dist`. Verify `wt --version` exits 0 and `wt help` lists no `hello`.
4. **Init trial:** Independently run `wt init` with a valid implementation pack fixture. Verify `lane.json` has correct schema, UUID, slug, kind, initiative, control home. Verify `install.json` has correct versions. Verify `repositories.local.json` exists. Verify `bin/` links are symlinks to the XDG runtime store, not copied files. Verify no runtime tree was copied into the target project.
5. **Init refusal:** For each negative case, independently reproduce: unaccepted pack → refusal, unsealed pack → refusal, uncommitted file → refusal, critically drifted pack → refusal, existing lane → refusal, missing gitignore → refusal.
6. **Status JSON:** Run `wt status --json` independently. Verify the output validates against `docs/spec/schemas/v1.schema.json` (the `laneStatus` definition). Verify `schemaVersion` is 1, lane identity is correct, `lifecycle.status` matches.
7. **Discovery:** Independently run `wt list` from control home root, descendant directory, lane directory, and unrelated directory. Verify correct results per path.
8. **Watch:** Independently run `wt watch` with a timeout. Verify heartbeat lines appear on stdout. Verify exit on signal (SIGTERM or Ctrl-C).
9. **Implementer→reviewer→accept cycle:** Independently trace the complete cycle. Verify implementer `handoff` event in coordinator journal. Verify reviewer `accept` event with per-repository commit set. Verify each commit exists, is reachable, and was created after reviewer launch. Verify per-repository push journals.
10. **Operator sessions:** Independently execute create → list → ask → hold place → hold release → close. Verify status reflects hold presence. Verify response is advisory.
11. **Doctor:** Independently run `wt doctor` on the healthy lane. Then deliberately break one check and re-run. Verify the break is reported as `fail` or `warn`.
12. **Upgrade:** Independently run `wt upgrade` preview and apply. Verify only manifest-owned paths change. Verify operator-session history is preserved. Verify downgrade refusal.

### Flow pass

Trace the full pipeline end to end, executing every command in order without skipping steps. Record:
- Exact command, exit code, stdout (truncated if large), and time of execution.
- Any deviation from the implementation report's claimed outcome.
- Any environmental factor that affects reproducibility.

### Validation pass

1. **Pipeline reproducibility:** Re-run the entire pipeline from a clean checkout. Verify every step produces the same outcome as the implementation report.
2. **Negative case correctness:** For each init refusal case, verify the diagnostic message clearly identifies the issue (not a generic "error" message).
3. **Schema conformance:** Validate `wt status --json` output against the JSON Schema bundle using a JSON Schema validator. Document any schema violations.
4. **Journal integrity:** Inspect the coordinator journal, decision journal, and effect journal. Verify events are valid JSONL with correct `schemaVersion`, `eventId`, `sequence`, `at`, `laneId`, `producer`, and type-specific payload.

### Architecture pass

1. **Source change scope:** Verify the diff touches only spec files (`spec/e2e/accept-trial.spec.ts`), trackers, and the release evidence report (`.local/`). No `src/` files changed.
2. **No feature additions:** Verify no new command class, foundation module, or contract type was created.
3. **Line counts:** Verify e2e spec files do not exceed the 400-line ceiling. Split by phase if needed.
4. **Architecture check:** Independently run `nvb check:architecture`. Must exit 0.

### Test-quality pass

1. **E2E spec execution:** Independently run `spec/e2e/accept-trial.spec.ts`. Verify it passes with the globally installed `wt` binary. Record Jasmine pass/fail counts.
2. **Full test suite:** Run `nvb test` independently. Compare pass/fail counts to the implementation report's baseline. Any new failure not already documented is a defect.

### Security and compatibility pass

1. **No secrets in evidence:** Review the release evidence packet. Verify no password, token, connection URL, or credential appears.
2. **No runtime tree copy:** Inspect the initialized lane's `bin/` directory. Every entry must be a symlink to the XDG runtime store, not a regular file.
3. **Config safety:** Verify `lane.config.env` values are strictly parsed (no shell execution). The reviewer should attempt to inject a shell command into a config key and verify it is stored as literal text.

## Nira/Watchtower-Specific Guardrails For Review

1. Verify `wt init` does not copy runtime scripts into the target project. The `bin/` directory must contain only symlinks.
2. Verify `hello` scaffold is completely removed from source, help, and specs.
3. Verify `wt status --json` output agrees with the schema bundle.
4. Verify no `.watchtower/` directory is committed.
5. Verify no build, dist, node_modules, or `.nira/local/` artifacts are in git.
6. Verify the coordinator journal format matches the accepted Pack 5 contract.

## Structural And Module-Size Acceptance

Line count is a design alarm, never permission to accumulate unrelated work.
Count physical lines, including comments and blanks, in new and materially
rewritten hand-maintained files. Generated artifacts are excluded only when
their generator ownership is explicit and they contain no hand-maintained
behavior.

Use the exact project-wide matrix:

| Category | Preferred maximum | Warning band | Hard reject |
| --- | ---: | ---: | ---: |
| CLI command, NVB TaskHandler/front door, registry, renderer, public barrel | 120 | 121–160 | over 180 |
| Orchestrator, controller, coordinator, presenter | 140 | 141–180 | over 200 |
| Foundation service, planner, validator, adapter, store | 200 | 201–260 | over 300 |
| Contract/type-only module | 240 | 241–320 | over 400 |
| Test/spec module | 300 | 301–420 | over 500 |

Functions target 40 lines, warn at 41–60, and reject above 80. Constructors
target 25 lines, warn at 26–40, and reject above 50. Warning-band owners require
a responsibility inventory and explicit reviewer judgment.

Every module has one primary responsibility and one cohesive reason to change.
Commands and TaskHandlers validate, normalize, delegate, and map results.
Orchestrators sequence collaborators without absorbing their algorithms.
Storage, validation, rendering, subprocess/leaf I/O, and state-machine policy do
not accumulate in one owner. Three independently nameable responsibilities
require a split even below a preferred maximum.

Class-owning TypeScript modules use PascalCase filenames; function/value modules
use lowerCamelCase. New source filenames do not use dashes or underscores.
Generic `helpers`, `utils`, `common`, and `misc` overflow bags are rejected.

Any size exception must be approved before implementation and name the exact
file, proposed maximum, cohesion reason, reviewer, and expiry/follow-up batch.
Existing oversized files are not precedent: when touched they become smaller,
split, or remain line-count neutral under an approved extraction plan.

The implementation report records categorized line counts for every new or
materially rewritten file plus warning-band functions/constructors. The
reviewer reproduces those counts and independently judges cohesion. Passing a
line-count check never overrides the responsibility gate.

# Agent Launch Prompt — Work Batch RT-05

## Required Review Packet

The review report must include:
- Changed-file list with ownership role.
- Independent execution: every command run, exit code, and key output.
- Pass/fail counts from independent spec execution.
- Line counts for new spec files.
- Any finding with severity, requirement reference, and recommended correction.
- Confirmation that no runtime tree was copied.
- Confirmation that no build artifacts are staged.
- Final verdict: ACCEPT or REJECT.

## Acceptance Gate

Accept only if all of the following are true:
- The full pipeline is independently reproducible from a clean checkout.
- `nvb dist` produces a valid package.
- `wt init` creates a usable lane without copying the runtime tree.
- `wt init` refuses every documented unaccepted/unsealed/uncommitted/drifted case.
- Lane discovery works from all documented paths.
- `wt status --json` is valid against the schema bundle.
- `wt watch` emits heartbeats and exits on signal.
- The implementer→reviewer→accept cycle completes with correct journals.
- `wt doctor` detects deliberately broken checks.
- `wt upgrade --apply` only changes manifest-owned paths and preserves session history.
- Operator-session lifecycle works through create→ask→hold→release→close.
- No product features were added. No mock replaced the real binary.
- `nvb check:architecture` exits 0.
- No build, dist, node_modules, `.nira/local`, or `.watchtower/` artifact is committed.
- Release evidence packet is complete and honest about limitations.

## Reject Conditions

Reject if any of the following is true:
- The pipeline cannot be independently reproduced.
- `wt init` copies the runtime tree into the target project.
- `wt init` accepts an unaccepted, unsealed, uncommitted, or critically drifted pack.
- `wt status --json` fails schema validation.
- `wt watch` daemonizes or fails to emit heartbeats.
- The implementer→reviewer→accept cycle does not complete.
- `wt doctor` passes a deliberately broken check.
- `wt upgrade` overwrites lane-owned config or session history.
- An e2e spec mocks the real `wt` binary where the spec requires real CLI/filesystem/Git.
- Any product feature was added.
- `hello` scaffold remains anywhere in the committed tree.
- A prohibited artifact is committed.

## Verdict, Correction, And Commit Ownership

- On rejection, create `corrections/REL-01-correction-NN.md` with exact defects, evidence, required correction, and proof to rerun.
- On acceptance, synchronize trackers, create the reviewer-owned acceptance commit, write the durable review report to `.local/agent-reports/watchtower-release/reviews/REL-01-fresh-lane-trial-review.md`, and settle the ACCEPT verdict.
- REL-02 is blocked until REL-01 is accepted.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **end-to-end fixture/release evidence**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/watchtower-release/reviews/REL-01-fresh-lane-implementer-reviewer-accept-trial-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`LC-08`, `UK-05`, `CA-24`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Global install; init; dispatch; handoff; independent accept; publication**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **end-to-end fixture/release evidence** and **Global install; init; dispatch; handoff; independent accept; publication**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/watchtower-release/reviews/corrections/REL-01-fresh-lane-implementer-reviewer-accept-trial-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/watchtower-release/reviews/REL-01-fresh-lane-implementer-reviewer-accept-trial-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
