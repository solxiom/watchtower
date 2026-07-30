# Batch Reasoning Difficulty Ranking — wt-lane-lifecycle

Status: pack-authoring baseline
Date: 2026-07-30

This document ranks each batch's minimum reasoning class based on state risk,
concurrency risk, transaction complexity, seal-validation depth, cross-repository
mutation scope, integration breadth, and closure evidence requirements.

Reasoning scale:

- **R3**: bounded repository reasoning, focused regression work, deterministic
  algorithm with few external dependencies
- **R4**: deep code reasoning, compatibility analysis, negative-path design,
  ownership-boundary judgment across multiple files
- **R5**: strongest available reasoning for state machines, concurrency,
  graph/planner logic, destructive-safety reasoning, cross-package closure

## Ranking Matrix

| Batch | Reasoning | State risk | Concurrency | Transaction | Seal/drift | Cross-repo | Integration | Closure | Justification |
|-------|-----------|------------|-------------|-------------|------------|------------|-------------|---------|---------------|
| LC-01 | R4 | Low (read) | None | None | None | None | None | None | Argument parsing with schema validation is bounded but requires precise spec-matching across prefix/scope/routing/impl-pack resolution. Property-based slug/prefix validation needs adversarial coverage. |
| LC-02 | R5 | Low (read) | None | None | High | None | None | None | RFC 8785 canonicalization is mathematically exacting. Seal reproduction must match spec byte-for-byte. Drift matrix has six branches with Git-object traversal. JSON Schema validation needs comprehensive fixture coverage. |
| LC-03 | R5 | High (write) | High (rename) | Full | None | None | None | None | Transactional layout with adjacent staging, atomic rename, and complete rollback demands correctness at every fsync/write/rename failure stage. Must prove every failure point. Manifest generation includes schema-valid JSON construction. |
| LC-04 | R4 | High (write) | Medium (locks) | Partial | None | Medium | None | None | Lock ordering is fixed and must be verifiable. Git-ignore atomic replace with digest-aware conditional rollback. Membership registration is idempotent post-commit. Less severe than full transaction but still multi-write. |
| LC-05 | R5 | Medium (write) | None | None | High | None | Low | None | Seeding finite policies from spec requires exact value transfer. Pack index must be deterministic, model-free, and seal-bound. Provenance must be correct. No full-pack fallback path. |
| LC-06 | R4 | Medium (exec) | None | None | Low | None | None | None | Foreground exec with signal forwarding, stdio passthrough, and Ctrl-C compatibility. Process lifecycle must be correct. Missing/corrupt watcher binary rejection. No daemonization. |
| LC-07 | R4 | Low (read) | None | None | Low | Medium | Medium | None | Comprehensive diagnostic registry with many check categories. Each must produce correct pass/warn/fail/skip. Tools, accounts, packs, policies, indexes, permissions. Read-only constraint must be proven. |
| LC-08 | R3 | Medium (delete) | None | None | None | None | High | High | End-to-end integration fixture. Safe removal of hello artifacts. Integration breadth is high but individual changes are straightforward. Risk is in completeness audit, not algorithmic depth. |

## Ranking By Wave

### Wave 1 (parallel): LC-01 (R4), LC-02 (R5)
Two independent read-only batches. LC-02 has higher reasoning due to
cryptographic seal precision.

### Wave 2: LC-03 (R5)
Full transactional write batch. Highest individual batch risk in this pack.
Must prove rollback at every failure stage.

### Wave 3 (parallel): LC-04 (R4), LC-05 (R5)
LC-04 handles lock-ordered mutation with conditional rollback. LC-05 requires
deterministic seal-bound index construction.

### Wave 4: LC-06 (R4)
Foreground process management with signal forwarding.

### Wave 5: LC-07 (R4)
Comprehensive diagnostic registry with many check categories.

### Wave 6: LC-08 (R3)
Integration and cleanup. Broadest scope, lowest algorithmic risk.

## Reasoning Class Justification Detail

### Why LC-02 is R5

RFC 8785 JSON Canonicalization Scheme is mathematically precise: object keys
must be sorted by code-point order, numbers must be serialized without
exponential notation, whitespace must follow exact rules, and Unicode escape
sequences must be normalized. The resulting byte stream is hashed with SHA-256.
Every deviation produces a different digest. The drift matrix requires Git
tree/blob traversal with exact byte comparison against sealed manifests.
JSON Schema validation against the v1.schema.json bundle must cover every
required field, pattern, enum, and constraint. The combination of
cryptographic accuracy, JSON Schema completeness, and Git-object precision
demands the strongest available reasoning.

### Why LC-03 is R5

Transactional layout is a correctness-critical concurrent operation. The
writer must:
- stage complete content adjacently on the same filesystem
- fsync every staged file and directory
- atomic rename the staging directory to the final path
- detect and reject a pre-existing destination
- roll back on write failure, fsync failure, rename failure, and partial
  manifest generation
- write manifests last (to make interruption-detectable)
- generate schema-valid `lane.json` with UUID, slug, kind, initiative,
  repository bindings, and claims
- generate schema-valid `install.json` with managed asset entries

Each failure stage must be independently provable via fault injection.
This is state-machine reasoning across filesystem operations.

### Why LC-01 is R4 (not R3)

While argument parsing appears mechanical, init has many interacting
validation rules:
- slug pattern `^[a-z0-9][a-z0-9-]{0,62}$`
- tmux-prefix pattern `^[a-z0-9][a-z0-9-]{0,15}$`
- impl-pack path resolution (absolute vs control-home-relative)
- coordinator-routing JSON validation
- scope JSON validation with repository ID/role/access/branch/path checking
- workspace resolution with canonicalization
- dry-run mode with complete plan generation but no writes
- optional runtime-version resolution

The combinatorial interaction of optional inputs with validation rules
produces enough edge cases to require deep reasoning.

### Why LC-05 is R5 (not R4)

Pack index construction must be:
- deterministic: same inputs → same index
- seal-bound: matched to the active `packSealId`
- model-free: no AI/ML involved in index construction
- reproducible: verified by rebuild comparison
- bounded: linear build proportional to batch count, not pack prose size
- provenance-correct: every policy default traced to v1-contracts.md §7

Policy seeding copies exact numeric values (token limits, session limits,
retention periods, hold expiry) from the specification. A single wrong
value creates a lane whose operational behavior silently diverges from
spec. The combination of index-correctness and policy-precision demands R5.

### Why LC-08 is R3 (not R4)

Integration testing and artifact removal are broad but shallow. Each
individual change (remove a file, update a registry) is straightforward.
The risk is in completeness — missing one hello artifact reference — not
in algorithmic depth. The reasoning load is audit/completeness, which
R3 with careful checklist discipline handles well.
