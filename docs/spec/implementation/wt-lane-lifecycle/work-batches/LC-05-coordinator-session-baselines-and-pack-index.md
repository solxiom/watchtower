# Work Batch LC-05 — Coordinator/Session Baselines and Initial Pack Index

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

Status: ❌ Pending
Implementation reasoning: R5
Review reasoning: R5
Depends on: LC-02, LC-03, RT-02
Workload: large

## Scope

Seed finite coordinator routing policies and operator-session policies from the
shipping-policy baseline. Bootstrap the deterministic, model-free, seal-bound
pack index from the accepted implementation pack. Seed correct provenance on
every policy default. This batch owns the coordinator baseline and pack index
bootstrap foundation.

## Specification References

| Reference | Section | Topic |
|-----------|---------|-------|
| v1-contracts.md | §7 | Shipping policy baseline: exact default values for D1/D2/D3, operator-session defaults, retention, hold expiry |
| v1-contracts.md | §4 | Routing policy and capability floors: every rule/guard, decision class routing |
| v1-contracts.md | §3.4 | Seal and canonicalization for pack index digest binding |
| v1.md | §7.2 | coordinator/ layout: routing, cycles, journals, projections, operator-sessions, amendment-requests, holds |
| v1.md | §11.1 | Init step 11-13: validate coordinator routing, resolve session policy, build pack indexes |
| schemas/v1.schema.json | `$defs.implementationPack` | Pack structure for index compilation |

## Owned Files

### New foundation modules

- `src/foundation/CoordinatorBaseline.ts` — seed finite routing policies,
  operator-session policies, and all shipping defaults with correct provenance
  references to v1-contracts.md §4 and §7
- `src/foundation/PackIndexBootstrap.ts` — deterministic compilation of
  batch metadata, dependency graph, requirement traceability, and cross-reference
  entries into a seal-bound index; no model, no full-pack fallback

## Dependencies

### From this pack

- **LC-02** (pack validation and seal): uses the sealed pack's manifest,
  lock file, and acceptance data to construct the index. Verifies the index
  digest matches the active `packSealId`.
- **LC-03** (lane layout): writes baselines and index files into the
  committed lane directory under `coordinator/` and related paths.

### From pack 2 (wt-runtime-distribution)

- **RT-02** (runtime manifests): validates that the selected runtime/knowledge
  versions are compatible with the coordinator policy defaults seeded.

## Required Interfaces

### CoordinatorBaseline

```typescript
interface RoutingPolicyBaseline {
  schemaVersion: 1;
  provenance: "v1-contracts.md §4";
  provenanceDigest: string;
  rules: RoutingRule[];
}

interface RoutingRule {
  ruleId: string;
  guard: string;
  class: DecisionClass;
  permittedResults: string[];
}

type DecisionClass = "M0" | "D1" | "D2" | "D3";

interface SessionPolicyBaseline {
  schemaVersion: 1;
  provenance: "v1-contracts.md §7";
  provenanceDigest: string;
  tokenLimits: TokenLimitDefaults;
  sessionDefaults: SessionDefaults;
  holds: HoldDefaults;
  retention: RetentionDefaults;
  escalation: EscalationReserve;
}

interface TokenLimitDefaults {
  d1: { inputSoft: number; inputHard: number; outputHard: number; brokerRequests: number; wallClockSec: number; };
  d2: { inputSoft: number; inputHard: number; outputHard: number; brokerRequests: number; wallClockSec: number; };
  d3: { inputSoft: number; inputHard: number; outputHard: number; brokerRequests: number; wallClockSec: number; };
}

function seedRoutingBaseline(laneDir: string, policyHash: string): Promise<void>;
function seedSessionBaseline(laneDir: string, policyHash: string): Promise<void>;
function computePolicyProvenanceDigest(specContent: string): Promise<string>;
```

### PackIndexBootstrap

```typescript
interface PackIndex {
  schemaVersion: 1;
  sealId: string;
  packId: string;
  compiledAt: string;
  batches: BatchIndexEntry[];
  requirements: RequirementIndexEntry[];
  dependencies: DependencyGraph;
  crossReferences: CrossReference[];
}

interface BatchIndexEntry {
  id: string;
  title: string;
  dependsOn: string[];
  primaryRepository: string;
  reasoning: string;
  workload: string;
  proofClasses: string[];
}

function buildPackIndex(packRoot: string, sealId: string): Promise<PackIndex>;
function writePackIndex(laneDir: string, index: PackIndex): Promise<void>;
function verifyPackIndex(index: PackIndex, sealId: string): boolean;
```

## Implementation Steps

1. **Create `src/foundation/CoordinatorBaseline.ts`**
   - `seedRoutingBaseline(laneDir, policyHash)`:
     - Construct `RoutingPolicyBaseline` with every rule from v1-contracts.md §4:
       - `safety-integrity-v1` → D3 plus system hold
       - `pack-semantic-drift-v1` → D3
       - `review-reject-repeated-v1` → D3
       - `review-reject-v1` → D2
       - `worker-blocked-unique-v1` → M0
       - `worker-blocked-v1` → D2
       - `review-accept-v1` → M0
       - `ready-unique-v1` → M0
       - `ready-ambiguous-critical-v1` → D2
       - `ready-ambiguous-v1` → D1
       - `projection-query-v1` → M0
       - `operator-complex-v1` → D3
       - `operator-bounded-v1` → D1
       - `operator-default-v1` → D2
       - `no-work-v1` → M0
     - Write to `{laneDir}/coordinator/routing-policy.json` (temp → fsync → rename)
     - Provenance marker: `"v1-contracts.md §4"`
   - `seedSessionBaseline(laneDir, policyHash)`:
     - Construct `SessionPolicyBaseline` with every default from v1-contracts.md §7:
       - D1: input 12,000/24,000, output 2,000, broker 4, wall 120s
       - D2: input 20,000/40,000, output 4,000, broker 8, wall 300s
       - D3: input 40,000/80,000, output 8,000, broker 16, wall 600s
       - Session per-turn: 40,000 input, 4,000 output
       - Session limits: 50 turns, 500,000 tokens, 32 MiB text, 16 open
         sessions, 2 concurrent turns
       - Lane-wide: 2,000,000 tokens, 20% escalation reserve
       - Working set: 8 recent turns, 16 pins, 4 capsules, 64 KiB/capsule,
         8 broker requests, 256 KiB/turn
       - Retention: 30 days closed, 256 MiB lane storage
       - Hold expiry: 60 minutes default, max 24 hours
     - Write to `{laneDir}/coordinator/session-policy.json` (temp → fsync → rename)
     - Provenance marker: `"v1-contracts.md §7"`
   - `computePolicyProvenanceDigest(specContent)`: compute SHA-256 of the
     specification text to bind policy to spec version
   - Also seed empty: cycle journal file, projections directory,
     operator-session journal/index roots, amendment-request store,
     hold registry

2. **Create `src/foundation/PackIndexBootstrap.ts`**
   - `buildPackIndex(packRoot, sealId)`:
     - Read `implementation-pack.json` from pack root
     - Extract every batch entry: id, title, dependsOn, primaryRepository,
       reasoning, workload, proofClasses
     - Extract every requirement entry: id, repository, source, workBatches,
       reviewBatches
     - Build dependency graph (DAG) from `dependsOn` arrays
     - Build cross-references: requirement → batch, batch → requirement
     - Compile into `PackIndex` with sealId matching
     - This is purely mechanical, deterministic, model-free
     - Do NOT read full-pack prose; only structural JSON fields
   - `writePackIndex(laneDir, index)`:
     - Write to `{laneDir}/coordinator/pack-index.json` (temp → fsync → rename)
   - `verifyPackIndex(index, sealId)`: check that index.sealId matches the
     given sealId. Returns false on mismatch. This ensures the index is
     bound to the accepted pack seal.
   - No full-pack fallback path. If the seal doesn't match, the index is
     not written and an error is returned.

3. **Write focused specs**
   - `spec/foundation/coordinator-baseline.spec.ts`: routing policy contains
     all 15 rules with correct guards/classes/results; session policy contains
     all default values exactly; provenance markers present; provenance
     digest matches spec content; files written to correct coordinator/ paths;
     empty journals/stores/registries created
   - `spec/foundation/pack-index-bootstrap.spec.ts`: index built from valid
     pack; batch entries complete; requirement entries complete; dependency
     graph correct; seal verification passes; seal mismatch detected;
     deterministic (same input → same index); no full-pack prose read; no
     model invocation

## Exclusions

- No watcher command logic — belongs to LC-06
- No doctor check definitions — belongs to LC-07
- No coordinator cycle execution — belongs to pack 5 (CA-*)

## Required Proof

### Focused
- Routing baseline contains all 15 rules from v1-contracts.md §4
- Each rule has correct guard description, decision class, and permitted results
- Session baseline contains exact defaults from v1-contracts.md §7
- All token limits, session limits, retention, and hold values match spec
- Provenance markers reference correct spec sections
- Empty journals/stores/registries exist under correct paths
- Pack index built deterministically
- Pack index contains all batch metadata
- Pack index contains requirement-to-batch traceability
- Dependency graph built correctly from `dependsOn`
- Seal verification: matches active seal → passes; mismatch → fails
- No full-pack prose read during index construction
- No model invocation anywhere

### Regression
- `nvb build` passes

### Architecture
- Coordinator baseline does not import from commands
- Pack index bootstrap only reads JSON schema fields, not prose

## Help and Documentation

- No CLI-facing surface; foundation-only batch
- Update `docs/spec/v1-contracts.md` §4 or §7 if policy values discovered
  to be inconsistent with spec

## Handoff Notes

After acceptance, `CoordinatorBaseline.ts` and `PackIndexBootstrap.ts` are
the sole owners of policy seeding and index construction. LC-06 (watch)
reads the routing policy and pack index from coordinator/ to validate
preflight. LC-07 (doctor) reads all baselines and index files for integrity
and freshness checks.
