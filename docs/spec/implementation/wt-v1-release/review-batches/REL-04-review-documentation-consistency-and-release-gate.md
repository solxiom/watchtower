# Review Batch REL-04 — Documentation Consistency And Release Gate

Status: ❌ Pending | Reviews work batch: REL-04
Work ID: `REL-04`
Governing spec: `docs/spec/v1.md` §17; `docs/spec/v1-contracts.md` §8

**Required reviewer reasoning class:** `R3`
**Class rationale:** audit-only batch with bounded traceability and cross-reference verification. The reviewer must independently re-verify every finding in the audit report by reading the referenced help fragments, command source, spec docs, and Git-tracked files. The work is comparison and cross-reference, not implementation or adversarial testing. However, accuracy is critical because a missed discrepancy in the release gate is a false acceptance. The reviewer must form independent judgment about each finding's classification (BLOCKING vs NON-BLOCKING) and must not accept the audit report's conclusions without re-reading the referenced documents.

## Scope Verification

Confirm that the implementation produced:

1. `.local/agent-reports/watchtower-release/REL-04-documentation-release-gate.md` — the complete audit report.
2. Updated trackers (`implementation-tracker.md`, `implementation-roadmap.md`, `v1-implementation-map.md`).
3. No new committed source files beyond tracker updates.
4. No newly created help fragments, spec sections, or documentation. The audit records findings; missing artifacts are returned to the owning prior pack.

## Required Independent Proof

### Contract pass

1. **Prerequisite verification:** Confirm REL-01, REL-02, and REL-03 are marked accepted. Run `nvb build` and `nvb test` independently. Record commit hash.
2. **Requirement traceability:** Independently read the traceability matrix in the audit report. For a sample of at least 8 of the 32 release acceptance criteria from `v1.md §17`:
   - Read the criterion text.
   - Identify the owning batch from `v1-implementation-map.md` section 9 or the tracker.
   - Read the claimed evidence (spec file, e2e trial report, release evidence packet).
   - Form an independent judgment: is the evidence current, reproducible, and sufficient?
   - If the audit report classifies a criterion as `traced` but your independent reading finds the evidence stale or missing, that is a finding against the audit.
3. **Help fragment audit:** Independently verify for at least 5 shipped commands:
   - A help fragment exists in `help/commands/<command>.hlp.json`.
   - The help fragment's described options, arguments, and behavior match the command class in `src/commands/`.
   - No undocumented flags exist.
   - `hello` command and `help/commands/hello.hlp.json` do not exist.
4. **Product doc audit:** Independently read `docs/spec/v1.md` §10.3 (command table) and compare against actual behavior for at least 3 commands. Independently read `docs/spec/architecture.md` and verify component descriptions match the current `src/` structure. Independently read `docs/spec/v1-contracts.md` and verify exit codes and public JSON schemas match the current source.
5. **Scaffold audit:** Independently search for `hello` artifacts. Verify `src/commands/HelloCommand.ts`, `help/commands/hello.hlp.json`, and any `hello` spec do not exist.
6. **Committed artifact audit:** Independently run `git ls-files` and filter for `build/`, `dist/`, `node_modules/`, `.nira/local/`, `.watchtower/`, `.local/`. Verify zero matches. Verify `.gitignore` covers these directories.
7. **Package version audit:** Independently verify `package.json` `version` is `1.0.0` and `bin.wt` maps to the correct entry point. Read `README.md` and verify it accurately describes Watchtower without claiming unsupported features.

### Flow pass

Trace the full audit report section by section. For each finding:
- Read the referenced source file or spec section yourself.
- Form an independent judgment about whether the finding is correctly classified.
- If the audit report asserts a doc section matches behavior, independently verify at least one claim.
- Record every instance where your independent reading disagrees with the audit report's conclusion.

### Validation pass

1. **Audit completeness:** Verify the audit covers all 32 release acceptance criteria, all shipped commands in the help registry, all three normative spec documents (`v1.md`, `architecture.md`, `v1-contracts.md`), scaffold artifacts, committed artifacts, and package version/README.
2. **Finding classification:** For each BLOCKING finding, independently verify the classification is correct under the criteria: absence of required evidence, missing help for a shipped command, committed prohibited artifact, scaffold artifact remaining, or a release criterion with no evidence.
3. **Non-retroactive creation:** Verify no help fragment, spec section, or command source file was created or modified by REL-04. The audit only records findings.

### Architecture pass

1. **Source change scope:** Verify the diff touches only trackers and the audit report (`.local/`). No `src/`, `help/`, or `docs/spec/` files changed.
2. **No feature additions:** Verify no new command class, foundation module, or contract type was created.
3. **Architecture check:** Independently run `nvb check:architecture`. Must exit 0.

### Test-quality pass

1. **Test suite consistency:** Run `nvb test` independently. Verify pass/fail counts match the REL-03 baseline. Any new failure not already documented is a finding.

### Security and compatibility pass

1. **No secrets in evidence:** Review the audit report. Verify no password, token, connection URL, or credential appears.
2. **No committed local artifacts:** Verify `.local/` is not tracked by Git and is covered by `.gitignore`.

## Nira/Watchtower-Specific Guardrails For Review

1. Verify `hello` scaffold is completely removed from source, help, and specs.
2. Verify `help/help.json` registers every shipped command and no deleted commands.
3. Verify `docs/spec/v1.md` §17 acceptance criteria are all traced to owning batches and evidence.
4. Verify no `.watchtower/` directory is committed.
5. Verify no build, dist, node_modules, or `.nira/local/` artifacts are in git.
6. Verify the final release verdict is either ACCEPT (zero BLOCKING findings) or REJECT (with enumerated unresolved criteria).

## Structural And Module-Size Acceptance

- This batch creates one local report file (`.local/`). No committed source files beyond tracker updates.
- The audit report may be large. Verify it is organized in clearly labeled sections.

## Required Review Packet

The review report must include:
- Changed-file list with ownership role.
- Independent traceability verification: which criteria were independently sampled, independent judgment per criterion, any disagreement with the audit report.
- Independent help audit: which commands were sampled, independent judgment, any disagreement.
- Independent doc audit: which sections were sampled, independent judgment, any disagreement.
- Independent scaffold audit: search commands run and results.
- Independent committed artifact audit: search commands run and results.
- Independent package version/README verification.
- Any finding with severity, requirement reference, and recommended correction.
- Final verdict: ACCEPT or REJECT.
- If ACCEPT: proposed release commit message.

## Acceptance Gate

Accept only if all of the following are true:
- Every §17 release acceptance criterion has a traceable owner and current evidence (confirmed by independent sampling).
- Every shipped command has a registered help fragment matching actual behavior (confirmed by independent sampling).
- Product docs agree with shipped behavior on every sampled command (confirmed by independent reading).
- `hello` scaffold is fully removed from the committed tree.
- No build, dist, node_modules, `.nira/local`, `.watchtower`, or `.local` artifact is committed.
- Package version, bin entry, and README are consistent.
- The audit report correctly identifies all BLOCKING findings (zero false negatives, zero false positives).
- REL-04 did not retroactively create any missing help, spec, or source content.
- `nvb check:architecture` exits 0.

## Reject Conditions

Reject if any of the following is true:
- A §17 release acceptance criterion has no evidence traceable to an accepted batch.
- A shipped command lacks a help fragment.
- A product doc contradicts actual behavior on a shipped command.
- The `hello` scaffold remains anywhere in the committed tree.
- A prohibited artifact (build, dist, node_modules, `.nira/local`, `.watchtower`, `.local`) is committed.
- The audit report misclassifies a finding (e.g., marks a criterion as `traced` when the evidence is missing or stale).
- REL-04 created or modified any help fragment, spec section, or command source file.
- Package version does not match `1.0.0` or bin entry is incorrect.

## Verdict, Correction, And Commit Ownership

- On rejection, create `corrections/REL-04-correction-NN.md` with exact defects, evidence, required correction, and proof to rerun. Note: resolution of BLOCKING findings belongs to the owning prior packs, not to REL-04.
- On acceptance, synchronize trackers, create the reviewer-owned final release gate commit, write the durable review report to `.local/agent-reports/watchtower-release/reviews/REL-04-documentation-release-gate-review.md`, and settle the ACCEPT verdict.
- REL-04 acceptance is the v1 release gate. No batch follows REL-04.
