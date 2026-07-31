# Batch RM-07 — Membership index and secondary-repository discovery

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

Status: ❌ Pending
Phase: Membership
Depends on: RM-03, RM-06 accepted

**Required implementor reasoning class:** `R4`
**Class rationale:** membership with staleness detection; advisory reads with no-repair proof. Wrong validation silently treats stale entries as authoritative.

## Objective

Validate user-local membership index. Discover secondary repositories. Report
stale entries; reads never repair.

## Required Work

1. Create `src/foundation/membershipIndex.ts`: validate the advisory user-local
   membership index at `<watchtower-data-root>/index/repository-memberships.json`.
   Parse the index. Validate each entry: canonicalize path, verify existence,
   resolve referenced lane home to a valid `lane.json`, verify binding matches.
2. Create `src/foundation/SecondaryDiscovery.ts`: discover lanes from a
   participating secondary repository through the validated membership index.
   Each candidate must resolve to a valid `lane.json` with matching binding.
3. Stale-entry detection: path no longer exists, lane.json missing, binding
   mismatch → report as stale warning, do not repair.
4. Write focused specs: valid index validation, stale-entry detection for each
   class, missing index handling, no-repair proof.

## Expected Ownership

- `src/foundation/membershipIndex.ts`, `src/foundation/SecondaryDiscovery.ts`
- Respective focused specs.

## Tests And Evidence

- Valid index: all entries resolve to valid lane.json with matching bindings.
- Stale entry — path removed: path no longer exists → reported, not repaired.
- Stale entry — lane.json missing: lane home has no lane.json → reported.
- Stale entry — binding mismatch: lane exists but binding doesn't match path.
- Missing index file: no error, returns empty.
- No-repair proof: after stale detection, the index file remains unchanged.
- `nvb build` and `nvb test` pass.

## Review Procedure Highlights

1. Verify each stale-entry class is detected and reported.
2. Confirm index file is never written to by read-only operations.
3. Trace secondary discovery from a participating repository path.
4. Verify stale entries are ignored but reported.

## Completion And Handoff

Membership validation and secondary discovery are accepted. RM-08 consumes
membership for conflict inspection. RM-10 consumes secondary discovery for
multi-repository status output. No read command repairs the index.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **membership/discovery foundation**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-read-model/RM-07-membership-index-and-secondary-discovery.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-03`, `RM-06`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Advisory validation; stale entries ignored/reported; reads never repair**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **membership/discovery foundation** and **Advisory validation; stale entries ignored/reported; reads never repair**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-read-model/RM-07-membership-index-and-secondary-discovery.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
