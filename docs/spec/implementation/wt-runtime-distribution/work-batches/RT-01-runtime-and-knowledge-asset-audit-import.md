# Batch RT-01 — Canonical Runtime and Knowledge Asset Audit/Import

Status: ❌ Pending
Phase: Asset audit and manifest foundation
Depends on: RM-01 accepted (Pack 1 — contract kernel and error taxonomy)

**Required implementor reasoning class:** `R4`
**Class rationale:** deep asset audit with provenance tracking and behavioral inventory across inherited coordinator knowledge. The class is a floor; escalate under the lane reasoning rules when source inspection exposes additional risk.

## Objective

Audit and import every inherited shell runtime script and coordinator knowledge
asset from the `implementation-lane-coordinator` source. Record full provenance.
Build a complete behavioral inventory covering every coordinator action and doc.
No asset may be packaged in RT-03 without first appearing in this audit.

## Required Work

1. Discover every shell runtime script in the inherited
   `implementation-lane-coordinator` source tree. For each script record:
   - source path (relative to the coordinator repo root)
   - SHA-256 digest of verbatim content
   - physical line count
   - human-readable description of purpose
   - coordinator action(s) the script implements
   - whether the script is a watcher, worker launcher, event writer, tmux
     helper, or other runtime role

2. Discover every coordinator knowledge doc in the inherited source tree. For
   each doc record:
   - source path
   - SHA-256 digest of verbatim content
   - title derived from the doc's heading or filename
   - behavioral role (playbook, guide, state-machine reference, skill
     descriptor, adapter config, or other knowledge role)

3. Build a complete behavioral inventory. Every known coordinator action must
   have at least one entry in the inventory. The inventory maps:
   - action name → script(s) that perform it
   - action name → knowledge doc(s) that describe or govern it
   - knowledge doc → behavioral role classification

4. Write the audit results into `src/foundation/runtime-assets.ts` and
   `src/foundation/asset-audit.ts` as typed, versioned records. Include:
   - a `RuntimeAssetRecord` type with source, digest, role, and action mappings
   - a `KnowledgeAssetRecord` type with source, digest, title, and role
   - a `BehavioralInventory` type mapping actions to scripts and docs
   - an import record describing source provenance (repository URI, commit
     hash, import date)

5. Cross-reference the inventory against the coordinator specification in
   `docs/spec/coordinator-automation.md` to verify no coordinator action or doc
   is omitted.

## Expected Ownership

- `src/foundation/runtime-assets.ts` — canonical asset records, import
  provenance, runtime script registry
- `src/foundation/asset-audit.ts` — behavioral inventory, coordinator action map,
  completeness cross-reference
- `src/contracts/manifests.ts` — `RuntimeAssetRecord` and `KnowledgeAssetRecord`
  types (if not already present from RM-01)

## Tests And Evidence

- Prove every inherited shell script is enumerated (the count must equal the
  actual file count in the inherited source)
- Prove every coordinator knowledge doc is enumerated
- Prove the behavioral inventory has no orphan actions (every action has at
  least one script or doc)
- Prove the behavioral inventory has no orphan scripts/docs (every script/doc
  maps to at least one action)
- Prove SHA-256 digests match verbatim source content
- Record exact source repository URI, commit hash, and import date in the
  provenance record
- Run architecture checks to confirm no runtime shell execution from TypeScript
- Confirm no new subprocess, filesystem, or network dependencies introduced

## What Must Not Change

- Do not modify any inherited shell script or knowledge doc content — this is
  pure audit
- Do not execute any inherited shell script during audit
- Do not import or depend on the coordinator source repository at build time
  — the audit records are static typed data
- Do not create new runtime scripts or knowledge docs in this batch
- Do not introduce any NVB staging, catalog, or adapter logic

## Review Procedure Highlights

1. Independently enumerate every shell script and knowledge doc in the
   inherited source. Compare counts with the audit records.
2. Verify SHA-256 digests against the inherited source content byte-for-byte.
3. Cross-reference the behavioral inventory against
   `docs/spec/coordinator-automation.md` for omission.
4. Verify every action has at least one script or doc entry.
5. Verify every script/doc maps to at least one action.
6. Confirm no shell execution, subprocess spawning, or runtime staging was
   introduced.

## Required Reasoning Posture

The assigned agent must reason from the inherited source and governing
specifications, not from filenames or the batch title alone.

- Map every inherited script to one runtime role and one or more coordinator
  actions.
- Map every inherited knowledge doc to one behavioral role and one or more
  governed actions.
- Enumerate the complete set of v1 coordinator actions from
  `docs/spec/coordinator-automation.md` and cross-reference against the
  inventory.
- Identify any action that lacks a script or doc — this is a spec/import gap,
  not an audit error.
- Use the canonical coordinator decision rules as the authoritative source for
  "what actions exist."

## Structural And Module-Size Acceptance

- `runtime-assets.ts` must be a focused data module, not a runtime logic owner.
  Target 220 lines or fewer.
- `asset-audit.ts` must own the behavioral inventory and cross-reference logic
  only. Target 220 lines or fewer.
- Asset record types in contracts must be pure type definitions with zero
  runtime behavior. Target 160 lines or fewer.
- No single module may exceed 350 lines for new hand-maintained code.
