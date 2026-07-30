# Work Batch LC-02 — Pack Acceptance, Seal, and Drift Validation

Status: ❌ Pending
Implementation reasoning: R5
Review reasoning: R5
Depends on: RM-01, RM-08
Workload: large

## Scope

Validate implementation packs against the JSON Schema bundle. Reproduce
signed seals using RFC 8785 canonicalization. Classify drift between the
committed pack and the working tree using the drift reason matrix.
This batch owns the pack consumer foundation: `pack-consumer.ts` and
`pack-seal.ts`.

## Specification References

| Reference | Section | Topic |
|-----------|---------|-------|
| v1-contracts.md | §3 | Implementation-pack consumer contract (required files, paths, acceptance, seal, drift) |
| schemas/v1.schema.json | `$defs.implementationPack`, `$defs.implementationPackLock`, `$defs.packAcceptance`, `$defs.sealedFile` | JSON Schema validations |
| v1-contracts.md | §3.4 | Seal and canonicalization: RFC 8785, digest format, seal structure |
| v1-contracts.md | §3.5 | Committed and drift rules: six drift codes, source-baseline behavior |
| v1-contracts.md | §3.2 | Paths and file set: UTF-8, `/` separators, no `.`/`..`, not absolute, resolve beneath declared repo |
| v1.md | §7.3 | Lane marker schema (pack path references must match) |

## Owned Files

### New foundation modules

- `src/foundation/pack-consumer.ts` — JSON Schema validation for
  `implementation-pack.json`, `implementation-pack.lock.json`,
  `pack-acceptance.json`; file-set validation; acceptance verification
- `src/foundation/pack-seal.ts` — RFC 8785 canonicalization, semantic
  digest computation, seal reproduction, drift classification matrix

## Dependencies

### From pack 1 (wt-read-model)

- **RM-01** (contracts): error taxonomy, versioned IDs/types. Pack validation
  errors must produce recognized error codes.
- **RM-08** (repository conflicts): writable claim inspection. Drift detection
  uses RM-08 to determine whether changed paths intersect writable batch claims.

## Required Interfaces

### PackConsumer

```typescript
interface PackValidationResult {
  manifest: ImplementationPack;
  valid: boolean;
  errors: PackValidationError[];
}

interface PackAcceptanceStatus {
  accepted: boolean;
  acceptance: PackAcceptance;
  errors: PackAcceptanceError[];
}

interface PackFileSet {
  files: string[];          // sorted union of regular files below pack root
  invalidPaths: string[];   // symlinks, devices, sockets, untracked, ignored
  errors: PackFileSetError[];
}

function validatePackManifest(root: string): Promise<PackValidationResult>;
function validatePackAcceptance(root: string, gitDir: string): Promise<PackAcceptanceStatus>;
function validatePackFileSet(root: string, gitDir: string): Promise<PackFileSet>;
function verifyPackLock(root: string): Promise<LockVerificationResult>;
```

### PackSeal

```typescript
interface SealInput {
  schemaVersion: 1;
  packId: string;
  manifestDigest: string;     // sha256:<64 hex>
  acceptanceDigest: string;    // sha256:<64 hex>
  sourceBaselines: Record<string, any>;
  files: SealedFile[];         // sorted by path
}

interface SealedFile {
  path: string;
  sha256: string;
  bytes: number;
}

interface DriftCheck {
  code: DriftCode;
  details: string[];
}

type DriftCode =
  | "PACK_BYTES_CHANGED"
  | "PACK_FILESET_CHANGED"
  | "ACCEPTED_INPUT_CHANGED"
  | "SOURCE_BASELINE_CRITICAL"
  | "SOURCE_BASELINE_UNRELATED"
  | "SOURCE_BASELINE_UNAVAILABLE";

function computeSeal(input: SealInput): Promise<string>;       // sha256:<64 hex>
function canonicalizeSealInput(input: SealInput): Promise<Buffer>;
function checkDrift(root: string, lock: ImplementationPackLock, conflicts: ConflictInspector): Promise<DriftCheck[]>;
function computeFileDigest(path: string): Promise<string>;
```

## Implementation Steps

1. **Create `src/foundation/pack-consumer.ts`**
   - Import JSON Schema validator (ajv or equivalent already in deps)
   - Load `docs/spec/schemas/v1.schema.json` and compile validators for:
     - `$defs.implementationPack` — validate `implementation-pack.json`
     - `$defs.implementationPackLock` — validate `implementation-pack.lock.json`
     - `$defs.packAcceptance` — validate `pack-acceptance.json`
     - `$defs.sealedFile` — validate individual file entries
   - `validatePackManifest(root)`: read `implementation-pack.json`, validate against
     schema, check required fields, check repository IDs exist, check batch IDs
     are unique, check requirement-to-batch coverage
   - `validatePackAcceptance(root, gitDir)`: read `pack-acceptance.json`, validate
     schema, verify verdict is `"accept"`, verify all critical findings are closed
     or superseded, verify acceptance commit is reachable from HEAD, verify the
     commit differs from pack-author session identity
   - `validatePackFileSet(root, gitDir)`: enumerate all regular files below pack
     root (excluding `implementation-pack.lock.json`), verify no symlinks/devices/
     sockets/untracked/ignored files, verify paths match v1-contracts.md §3.2 rules
   - `verifyPackLock(root)`: validate lock schema, verify every sealed file
     exists and has matching digest, verify lock seal matches recomputed seal

2. **Create `src/foundation/pack-seal.ts`**
   - Implement RFC 8785 JSON Canonicalization Scheme:
     - Sort object keys by code-point order
     - Serialize numbers without exponential notation
     - Normalize Unicode escape sequences
     - Strip insignificant whitespace
   - `canonicalizeSealInput(input)`: produce canonical UTF-8 bytes of
     `{schemaVersion, packId, manifestDigest, acceptanceDigest, sourceBaselines, files}`
   - `computeSeal(input)`: SHA-256 hash of canonical bytes, return as `sha256:<hex>`
   - `computeFileDigest(path)`: SHA-256 of raw file bytes
   - `checkDrift(root, lock, conflicts)`: compare current working-tree state
     against locked/committed state, classify each deviation:
     - Compare every sealed file's current bytes against lock digest
     - Verify sealed file set matches current file set (no additions, removals,
       untracked, ignored, or symlinked files)
     - Verify accepted input digests match current HEAD blob digests
     - For changed tracked paths outside pack: check via RM-08 whether they
       intersect a writable batch claim (`SOURCE_BASELINE_CRITICAL`) or not
       (`SOURCE_BASELINE_UNRELATED`)
     - For unavailable sources: fail unless repository is read-only and
       proof is optional (`SOURCE_BASELINE_UNAVAILABLE`)
   - No model for drift classification: all six codes are purely mechanical

3. **Write focused specs**
   - `spec/foundation/pack-consumer.spec.ts`: valid/invalid manifest fixtures,
     valid/invalid acceptance fixtures, valid/invalid lock fixtures,
     missing-field detection, schema violation error codes,
     file-set validation with symlink/device/socket/untracked fixtures
   - `spec/foundation/pack-seal.spec.ts`: RFC 8785 canonicalization against
     known-good fixtures, seal reproduction, seal mismatch detection,
     drift code matrix (all six codes with representative fixtures),
     file digest computation, source-baseline classification

## Exclusions

- No lane directory creation — belongs to LC-03
- No pack index construction — belongs to LC-05
- No coordinator/session policy seeding — belongs to LC-05
- No mutation of any filesystem path — read-only validation

## Required Proof

### Focused
- `implementation-pack.json` schema validation: valid passes, invalid rejects with
  specific required-field errors
- `implementation-pack.lock.json` schema validation: valid passes, invalid rejects
- `pack-acceptance.json` schema validation: valid passes, invalid rejects;
  non-accept verdict rejected; open critical findings rejected
- File-set validation: normal passes, symlink rejected, device rejected,
  socket rejected, untracked file rejected, ignored file rejected
- RFC 8785 canonicalization: matches known-good test vectors
- Seal reproduction: matches known-good seal for a given fixture
- Seal mismatch: lock with modified file entry does not match
- Drift codes: each of the six codes produced for a representative fixture
- Lock verification: missing file detected, digest mismatch detected,
  extra file detected

### Regression
- `nvb build` passes

### Architecture
- No model invocation for drift classification
- Pack validation modules import only from RM-01 (contracts) and RM-08 (conflicts)

### Adversarial
- Tampered lock file (modified digest)
- Truncated lock file
- Lock referencing files outside pack root
- Lock with duplicate file paths
- Manifest with duplicate batch IDs
- Manifest with missing requirement coverage
- Non-UTF-8 paths

## Help and Documentation

- No CLI-facing surface; foundation-only batch
- Update `docs/spec/v1-contracts.md` or `v1-implementation-map.md` if
  implementation reveals a gap in the drift matrix

## Handoff Notes

After acceptance, `pack-consumer.ts` and `pack-seal.ts` are the sole owners of
pack validation and seal logic. LC-03 calls pack consumer to verify the
referenced pack during init. LC-05 calls pack seal to verify the active
packSealId during index construction.
