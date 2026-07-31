# Review Batch RM-07 — Membership index and secondary-repository discovery

## Synchronized batch execution matrix

- **Accepted-map title:** Membership index and secondary-repository discovery
- **Dependencies:** `RM-03`, `RM-06`
- **Exclusive ownership/interface:** membership/discovery foundation
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** Advisory validation; stale entries ignored/reported; reads never repair
- **Implementation report:** `.local/agent-reports/wt-read-model/RM-07-membership-index-and-secondary-discovery.md`
- **Review report:** `.local/agent-reports/wt-read-model/reviews/RM-07-membership-index-and-secondary-discovery-review.md`
- **Correction report:** `.local/agent-reports/wt-read-model/reviews/corrections/RM-07-membership-index-and-secondary-discovery-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ⏳ Awaiting review
Reasoning: `R4`
Paired work brief: `work-batches/RM-07-membership-index-and-secondary-discovery.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-07-membership-index-and-secondary-discovery.md`

## Scope Verification

- [ ] `src/foundation/membershipIndex.ts` with membership index validation
- [ ] `src/foundation/SecondaryDiscovery.ts` with secondary-repository discovery

## Required Independent Proof

1. **Valid index**: Create a membership index with valid entries. Verify all entries validated and returned.
2. **Stale — PATH_MISSING**: Entry path no longer exists → stale warning, PATH_MISSING reason.
3. **Stale — LANE_JSON_MISSING**: Referenced lane home has no lane.json → stale warning.
4. **Stale — BINDING_MISMATCH**: Lane exists but no binding matches entry path → stale warning.
5. **Mixed index**: One valid + one stale entry. Verify valid returned, stale warned, valid still works.
6. **No-repair proof**: After every operation, verify the index file's modification time and MD5/SHA-256 are unchanged.
7. **Missing index**: File doesn't exist → null/empty, no error.
8. **Secondary discovery**: From a participating repo path, discover lanes through validated entries.
9. Run `nvb build` and `nvb test` independently.

## Acceptance Gate

- All stale-entry classes detected and reported.
- Index file never modified by reads.
- Missing index handled gracefully.
- Build and tests pass independently.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **membership/discovery foundation**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-read-model/reviews/RM-07-membership-index-and-secondary-discovery-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-03`, `RM-06`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Advisory validation; stale entries ignored/reported; reads never repair**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **membership/discovery foundation** and **Advisory validation; stale entries ignored/reported; reads never repair**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-read-model/reviews/corrections/RM-07-membership-index-and-secondary-discovery-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-read-model/reviews/RM-07-membership-index-and-secondary-discovery-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
