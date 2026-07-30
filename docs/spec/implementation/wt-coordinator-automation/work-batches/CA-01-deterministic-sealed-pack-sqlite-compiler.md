# Batch CA-01 — Deterministic sealed-pack SQLite compiler

## Mandatory Governing References

This draft brief is subordinate to:

- `AGENTS.md`
- `docs/development/engineering-and-review-standard.md`
- `docs/spec/v1-contracts.md`
- `docs/spec/schemas/v1.schema.json`
- `docs/spec/v1.md`
- `docs/spec/nirvana-integration-architecture.md`
- `docs/spec/architecture.md`
- `docs/spec/v1-implementation-map.md`
- `docs/spec/coordinator-automation.md`
- `docs/spec/operator-session.md`
- `docs/spec/cli-session.md`
- this pack's `implementation-quality-and-agent-rules.md`

Only the references relevant to the batch's accepted scope need drive its
product logic, but the engineering and Nirvana/NVB architecture standards
always apply. If this brief names a stale path, title, size threshold, or
mechanism, follow the governing source and correct the brief/report rather than
implementing the stale claim. Stop for a specification amendment when the
governing sources leave a product decision unresolved.

## Mandatory Cross-Cutting Acceptance

- Include a Nirvana API usage audit with inspected packages/symbols, comparable
  Nira usage, selected APIs, and any proven `NIRVANA_API_GAP`.
- Keep commands as thin Nirvana front doors and place behavior in
  capability-oriented foundation owners.
- Use the packaged immutable NVB task catalog for substantial mechanical
  workflows. `LaneTaskRunner` is the sole task invocation boundary; project
  `nvb.json` files are never modified or trusted as Watchtower authority.
- Retain shell only as a manifest-declared leaf adapter. Workflow-level shell,
  arbitrary task selection, and direct raw subprocess use are hard rejects.
- Apply the exact module/function/constructor limits and reviewer matrix from
  the mandatory engineering standard. A pack-local statement cannot relax
  those limits.
- Reconcile every reason code, exit mapping, event name, and schema identifier
  with accepted RM-01 contracts and `docs/spec/schemas/v1.schema.json`; a local
  illustrative name does not silently create a public identifier.

Status: ❌ Not started
Pack: wt-coordinator-automation (Pack 5)
Phase: Index foundation
Depends on: DB-01, LC-02, LC-05 accepted
Owned files: `src/foundation/PackIndex.ts`,
`src/foundation/PackIndexWriter.ts`,
`src/foundation/PackIndexCompiler.ts`,
`coordinator/index/pack/<index-id>/`

**Required implementor reasoning class:** `R5`
**Class rationale:** deterministic SQLite index with seal verification; identical logical rows required across independent compilations from the same sealed input. FK integrity across artifacts, batches, dependencies, requirements, repository-claims, and proofs. Staged immutable publication with crash safety at every stage. The class is a floor; escalate under the pack reasoning rules when source inspection exposes additional risk.

This batch is model-free — the index compiler is deterministic TypeScript, not an agent or model.

## Objective

Compile accepted sealed pack manifests into a derived SQLite index. Identical
logical rows on rebuild (the semantic root). Path/digest/FK integrity checks
across artifacts, batches, dependencies, requirements, repository-claims, and
proofs. Staged immutable publication (write to temp file, verify integrity,
atomically rename active pointer). Linear build process — no concurrent writers
during compilation. The index is reconstruction-only; raw SQLite bytes never
define semantic identity. Canonical logical rows and source checkpoints do.

## Required Work

1. **Read the normative references.** Study `v1-contracts.md §3` for the
   implementation-pack file set, path rules, seal canonicalization (RFC 8785),
   digest format (`sha256:<64 hex>`), and drift codes. Study `v1-contracts.md
   §8A` for the derived SQLite storage contract — schema, FK, WAL, semantic-root
   rules, and staged write-then-rename publication. Study `coordinator-automation.md
   §9` for the pack index structure and manifest. Study `v1.md §7.2` for the
   committed pack layout.

2. **Define the SQLite schema.** Create the index database schema with these
   tables and FK constraints:
   - `artifact` — `(id TEXT PK, logical_role TEXT NOT NULL, relative_path TEXT NOT NULL, repository_id TEXT NOT NULL REFERENCES repository(id), digest TEXT NOT NULL, byte_length INTEGER NOT NULL, owning_batch_id TEXT NOT NULL REFERENCES batch(id), headings TEXT)`
   - `batch` — `(id TEXT PK, title TEXT NOT NULL, reasoning_class TEXT NOT NULL, workload TEXT NOT NULL, primary_repository_id TEXT NOT NULL REFERENCES repository(id), phase TEXT)`
   - `batch_repository` — `(batch_id TEXT NOT NULL REFERENCES batch(id), repository_id TEXT NOT NULL REFERENCES repository(id), access_mode TEXT NOT NULL, PRIMARY KEY (batch_id, repository_id))`
   - `dependency` — `(batch_id TEXT NOT NULL REFERENCES batch(id), depends_on_batch_id TEXT NOT NULL REFERENCES batch(id), PRIMARY KEY (batch_id, depends_on_batch_id))`
   - `requirement` — `(id TEXT PK, title TEXT, repository_id TEXT REFERENCES repository(id))`
   - `batch_requirement` — `(batch_id TEXT NOT NULL REFERENCES batch(id), requirement_id TEXT NOT NULL REFERENCES requirement(id), direction TEXT NOT NULL CHECK (direction IN ('work', 'review')), PRIMARY KEY (batch_id, requirement_id, direction))`
   - `repository` — `(id TEXT PK, role TEXT NOT NULL, access TEXT NOT NULL)`
   - `proof` — `(id TEXT PK, proof_class TEXT NOT NULL, command_or_reference TEXT NOT NULL, owning_batch_id TEXT NOT NULL REFERENCES batch(id))`
   - `index_meta` — `(key TEXT PK, value TEXT NOT NULL)` for compiler version, schema version, pack seal, semantic root, and build metadata.

   All foreign keys use `ON DELETE CASCADE`. The schema is versioned in
   `index_meta.schema_version`. The compiler writes the schema inside a single
   transaction after all integrity checks pass.

3. **Implement `src/foundation/PackIndex.ts`:**
   - Define the `PackIndex` type — a deterministic local index derived from the
     sealed implementation pack, destined for SQLite publication.
   - Define `PackIndexBatch`, `PackIndexRequirement`, `PackIndexRepository`,
     `PackIndexArtifact`, `PackIndexDependency`, `PackIndexProof` types.
   - All types are plain objects; no class instance state for the index itself.

4. **Implement `src/foundation/PackIndexCompiler.ts`:**
   - `compilePackIndex(packRoot: string, lock: PackLock, dbPath: string): PackIndex` —
     reads `implementation-pack.json`, validates against the lock's `sealId`,
     extracts all logical rows, and writes them into a SQLite database at `dbPath`.
   - `verifyPackSeal(packRoot: string, lock: PackLock): SealVerification` —
     independently verifies every sealed file's bytes match the lock digest,
     verifies the lock's own `sealId` is reproducible, and checks path rules
     (no `..`, no absolute, no symlinks, exact case).
   - `computeSemanticRoot(dbPath: string): string` — exports all logical rows
     in canonical order, RFC 8785 canonicalizes the export, and produces a
     stable `sha256:...` semantic root. Raw SQLite bytes are NEVER part of
     the identity calculation.
   - `publishIndex(tempDbPath: string, targetDir: string): IndexPublication` —
     writes the compiled index to a temp file under the target directory,
     verifies FK integrity and semantic root, then atomically renames the
     active pointer. The pointer file (`current.json`) contains the index ID,
     pack seal, schema version, compiler version, manifest digest, and
     semantic root.
   - Intermediate verification at each compilation stage: file-set completion
     check, per-file digest check, cross-reference consistency (every dependency
     refers to a declared batch; every repository reference resolves; every FK
     target exists before the row is inserted).
   - Linear build: the compiler processes files once in deterministic order;
     it never retries, re-sorts, or re-processes. All SQLite writes happen in
     one transaction after all source validation passes.
   - All operations are deterministic TypeScript and entirely model-free.

5. **Seal verification contract:**
   - Verify that every file in the lock's `files` array exists at the declared
     pack-relative path with matching SHA-256 and byte count.
   - Verify the lock's own `sealId` by recomputing the RFC 8785 canonical form
     of the seal input object (manifest digest + acceptance digest + source
     baselines + sorted files array).
   - Reject if any file is a symlink, device, socket, or outside the pack root.
   - Reject if any tracked file is missing, has wrong bytes, or is untracked
     in Git (for the committed drift check — the compiler delegates this to the
     drift inspector from LC-02, but independently verifies the file bytes).

6. **Cross-reference validation:**
   - Every batch dependency must reference a declared batch ID in the same pack.
   - Every batch's `primaryRepository` must be a declared pack repository.
   - Every batch's `repositories` must each be a declared pack repository.
   - Every requirement's work-batch and review-batch references must resolve to
     declared batch IDs.
   - Missing references produce a deterministic `CROSS_REFERENCE_INVALID` error
     with exact source/detail locations. No row is inserted until all cross-
     references are validated.

7. **Staged publication contract:**
   - Write the compiled SQLite database to a temp file inside the target
     directory (never to the final name directly).
   - After write and fsync: open the temp file, verify FK integrity across
     all tables, verify every indexed artifact path is within its logical
     repository root, compute the semantic root, and check counts against the
     manifest.
   - Only after all verifications pass: atomically rename the temp database to
     `index.sqlite` and write `current.json` (via temp-file + rename).
   - If any verification fails: delete the temp file and report the exact
     failure. Never publish a partial or unverified index.
   - The compiler holds an exclusive lock during publication; no concurrent
     reader or writer can access the staging directory.

8. **Semantic-root verification:**
   - The semantic root is computed from the canonical logical-export of all
     tables, not from raw SQLite bytes.
   - Export algorithm: SELECT all rows from each table in deterministic column
     order, ordered by primary key(s). Serialize the result as a sorted JSON
     structure. RFC 8785 canonicalize for the digest.
   - Rebuild proof: compile the same sealed pack twice into two independent
     SQLite databases. Compute the semantic root of each. They must match.
   - Raw bytes of the two `.sqlite` files may differ (SQLite internal headers,
     freelist, page layout) — this is expected and acceptable. Only the
     semantic root must match.

9. **Seal-drift detection:**
   - Before compilation, read the existing `current.json` (if any). If the
     pack seal, manifest digest, or source digests differ from the new
     compilation, flag `SEAL_DRIFT_DETECTED`. The stale index blocks automated
     cycles until the new compilation is published and the pointer is switched.
   - Drift detection compares the seal identity (seal ID, manifest digest, lock
     digest), not the SQLite bytes.

10. **Error taxonomy for the compiler:**
    - `PACK_SEAL_MISMATCH` — recomputed seal differs from lock's `sealId`.
    - `PACK_FILE_BYTES_MISMATCH` — a sealed file's current bytes don't match the lock.
    - `PACK_FILE_MISSING` — a sealed file is absent from the pack root.
    - `PACK_FILE_UNTRACKED` — a file below pack root is not in the lock's sealed set.
    - `PACK_FILE_SYMLINK` — a packed path resolves to a symlink.
    - `PACK_PATH_ESCAPE` — a path resolves outside the pack root.
    - `CROSS_REFERENCE_INVALID` — a dependency or repository reference is unresolvable.
    - `PACK_JSON_INVALID` — `implementation-pack.json` fails schema validation.
    - `PACK_JSON_MISSING` — required pack JSON file is absent.
    - `INDEX_FK_VIOLATION` — a foreign-key constraint check failed during staged verification.
    - `INDEX_SEMANTIC_ROOT_MISMATCH` — the computed semantic root does not match the expected value after rebuild.
    - `INDEX_STAGED_CORRUPT` — the staged SQLite database failed integrity check before publication.
    - `SEAL_DRIFT_DETECTED` — the active pack seal differs from the current index seal.

## Expected Ownership

- `src/foundation/PackIndex.ts` — pure type definitions for the deterministic
  pack index. No file I/O, no compilation logic, no SQLite imports.
- `src/foundation/PackIndexWriter.ts` — narrow domain writer/store capsule for
  pack-index schema creation, parameterized row insertion, integrity checks,
  canonical logical export, and staged close. It consumes DB-01's focused
  SQLite ports and owns pack-index SQL without importing the selected driver.
- `src/foundation/PackIndexCompiler.ts` — thin deterministic orchestration over
  focused seal verifier, pack row extractor/cross-reference validator,
  semantic-root calculator, typed `PackIndexWriter`, and staged publisher.
- Focused collaborators own seal/path/digest verification, logical-row
  extraction/FK validation, canonical semantic export, and atomic publication;
  no compiler god object owns all algorithms.
- The writer consumes DB-01 focused SQLite ports. No CA module imports the
  selected driver package, and pack-index SQL stays inside
  `PackIndexWriter.ts`.
- `coordinator/index/pack/<index-id>/` — the published index directory, managed
  exclusively by the compiler and the atomic pointer switch.
- No other module duplicates these truths; splitting responsibility does not
  create alternate authorities.

## Tests And Evidence

- **Seal reproduction:** Given a fixture pack with known `implementation-pack.lock.json`,
  independently compute the seal and prove it matches.
- **Semantic-root proof:** Compile the same sealed pack twice in independent
  processes into two separate SQLite databases. Prove the semantic root
  (canonical logical-export digest) is identical even though raw SQLite bytes differ.
- **Rebuild produces identical logical row set:** Export all rows from two
  independent compilations. Prove every row is identical in content and order.
- **FK integrity across all index tables verified:** Prove every batch reference,
  repository reference, dependency edge, and requirement mapping resolves to an
  existing row.
- **Staged write-then-rename with simulated crash at every stage:** Kill the
  process after temp-file write, during integrity verification, and during
  rename. Prove the active index is never left in a corrupt or partial state.
- **Corrupt partial index detected and refused:** Write a manually corrupted
  SQLite database with FK violations. Prove the compiler detects and refuses it.
- **Cross-reference matrix:** Prove every dependency, primary-repository, and
  batch-repository edge is validated. Prove missing references are detected.
- **Path escape:** Fixture paths with `..`, absolute, symlink, and case-mismatch
  inputs — prove each is rejected with the correct error code.
- **Corrupt file:** Flip one byte in a sealed file. Prove `PACK_FILE_BYTES_MISMATCH`.
- **Missing file:** Remove a sealed file. Prove `PACK_FILE_MISSING`.
- **Seal-drift detection:** Change the pack seal between compilations. Prove
  `SEAL_DRIFT_DETECTED` before recompilation.
- **Invalid JSON:** Replace `implementation-pack.json` with malformed or schema-violating
  content. Prove `PACK_JSON_INVALID` or `PACK_JSON_MISSING`.
- **Linear build proof:** Compile a 300-batch synthetic pack and prove compilation
  visits each source file exactly once and produces correct cross-references.
- **Model-free proof:** Static analysis or architecture check proving no model/AI
  import exists in `PackIndex.ts` or `PackIndexCompiler.ts`.

## What Must Not Change

- Do not modify the pack consumer contract (LC-02).
- Do not import any model, LLM, or AI library.
- Do not perform any network I/O.
- Do not read files outside the declared pack root after symlink resolution.
- Do not treat raw SQLite bytes as semantic identity — only canonical logical
  rows and source checkpoints define identity.
- Do not introduce non-deterministic ordering (e.g., `Object.keys()` without sort).
- Do not bypass DB-01 focused SQLite ports or expose raw SQL/driver internals.

## Review Procedure Highlights

1. Independently compile the same sealed pack from byte-identical input and
   verify the semantic root (logical export digest) is identical across two
   independent SQLite databases with different raw bytes.
2. Export all logical rows from both compilations and prove row-level identity.
3. Verify every FK constraint across all tables (artifact→batch, batch→repository,
   dependency edges, requirement mappings, proof→batch).
4. Verify staged write-then-rename safety: simulate crash at every stage and
   prove the active pointer is never left pointing to a corrupt or partial index.
5. Verify the compiler visits every sealed file exactly once.
6. Verify that no model/AI import exists in the compiler.
7. Verify that all fixture error cases produce the correct error code and
   message with the exact source location.
8. Verify the compiler delegates persistence to `PackIndexWriter`, which uses
   DB-01's focused SQLite ports. The selected driver package and
   driver-specific primitives stay in DB-01's driver capsule; pack-index SQL
   stays in `PackIndexWriter.ts`.
9. Verify seal-drift detection: changing the pack seal between compilations
   produces SEAL_DRIFT_DETECTED before the new compilation can publish.
10. Verify that semantic root is computed from canonical logical rows, never
    from raw SQLite file bytes.
