# Independent Review — Implementation-Pack Planning Remediation

Status: **Design-gate review contract**

Candidate branch: `wt/spec-pack-remediation`

The reviewer must be independent of the amendment author. Review the real Git
candidate and governing specifications; do not treat the amendment's findings
or proposed graph as accepted facts.

## Scope

Review these candidate surfaces together:

- `planning-remediation-amendment.md`;
- `../v1-implementation-map.md`;
- `../v1.md`;
- `../nirvana-integration-architecture.md`;
- `../../development/engineering-and-review-standard.md`;
- the supersession notices in this directory and all six pack READMEs/quality
  rules; and
- the accepted DB-01 outcome and pinned Nirvana/Nira package/config evidence
  cited by the amendment.

This first gate reviews design and planning authority only. Detailed batch
brief/prompt synchronization and new seals deliberately follow a successful
design verdict so rejected architecture does not create dozens of disposable
artifacts.

## Mandatory independent checks

The reviewer must independently prove or reject each item:

1. Reproduce the unpublished-Nirvana dependency failure and distinguish a
   source-linked folder install from an isolated packed-artifact install.
2. Inspect the exact pinned ecosystem closure and confirm the proposed
   development/release dependency-source contract is complete, relocatable,
   and does not invent registry availability.
3. Reproduce the current `nvb.json` and aggregate-schema line-count risks; verify
   that native NVB parent composition and deterministic schema fragments close
   those risks without changing participating repositories.
4. Build the corrected dependency graph from explicit edges, reject unknown
   IDs/self-edges/cycles, and verify every wave occurs after all prerequisites.
5. Audit every split for single ownership, one final verdict, and no dependency
   on a capability defined only by a later batch.
6. Verify CA-01/LC-09 removes duplicate pack-index authority, UK-02 removes
   fictional migrations, CA-14/CA-25 closes the session dependency, and
   CA-05 policy provenance does not hardcode normative policy.
7. Search active briefs for broad `any`, mutable global registries, repeated
   TUI feasibility, stale counts, and contradictory ownership. Record each
   artifact that the pack-synchronization pass must replace.
8. Apply every hard gate in the engineering and review standard. Working or
   plausible behavior is not a waiver for structural debt.

## Verdicts

Exactly one verdict is allowed:

- `ACCEPT_DESIGN` — the corrected 74-batch architecture and normative changes
  are sound enough to authorize detailed pack synchronization;
- `REJECT_DESIGN` — the report names every blocking defect and the exact
  governing evidence; or
- `SPEC_BLOCKED` — a genuine unresolved product-authority decision prevents a
  verdict and is identified precisely.

`ACCEPT_DESIGN` does not lift the coordinator hold, authorize RM-02, change the
active batch total, accept product code, or publish seals. Those effects require
the later `ACCEPT_PACKS` gate.

## Evidence and handoff

Record the reviewed commit, commands/evidence, reconstructed graph result,
finding matrix, and verdict in the local reviewer report. Do not edit product
source. If rejected, route corrections to the preserved architect branch. If
accepted, instruct the coordinator to keep dispatch frozen and request the
pack-synchronization pass.
