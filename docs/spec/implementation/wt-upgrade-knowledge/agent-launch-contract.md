# Upgrade-knowledge Pack Agent Launch Contract

Status: **Mandatory direct dependency for every work and review launch**
Date: 2026-08-01

This contract and one batch-specific launch prompt form one self-contained launch envelope. The prompt must directly name this file and carry the batch ID/title, accepted dependencies, exact ownership, proof claim, reasoning floors, report target, and handoff/verdict rules. A launcher must deliver both artifacts. Missing either artifact fails closed. This contract reduces repeated boilerplate; it does not reduce any safety, proof, or independent-review obligation and never overrides product authority.

## Authority and required reading

Use this precedence: accepted product specs/schemas; engineering and review standard; AGENTS.md; accepted implementation map and amendment; pack quality rules; paired brief; launch prompt. Read `docs/spec/v1.md`, `docs/spec/v1-contracts.md`, `docs/spec/nirvana-integration-architecture.md`, `docs/spec/v1-implementation-map.md`, `docs/spec/implementation/planning-remediation-amendment.md`, the complete paired brief, and actual accepted predecessor source/evidence. Stop for specification resolution rather than inventing policy or ownership.

## Required execution method

1. Verify the assigned checkout, branch, clean/expected dirty state, accepted dependency commits, claim/resource fences, and `kavan:kavan` ownership.
2. Map each governing requirement and required proof to exact modules, public interfaces, schemas/help/tasks, focused tests, and the single owner before editing or judging.
3. Inspect pinned Nirvana package exports and comparable Nira source/tests. Record selected public APIs or a precise `NIRVANA_API_GAP`; convenience is not a gap.
4. Enumerate applicable malformed, missing, extra, stale, corrupt, traversal/symlink, permission, replay, concurrency, interrupted-effect, read-only, packaging, relocation, signal, and unavailable-tool cases.
5. Preserve dependency direction, thin commands/TaskHandlers, injected nondeterminism, closed public contracts, the immutable NVB catalog, `LaneTaskRunner`, and the sole validated effect boundary.
6. Run focused proof first, then `git diff --check`, `nvb build`, `nvb test`, and applicable dist/global-install/isolated/PTY/scale proof. Inventory module/function/constructor sizes and responsibilities.
7. Record exact commands/results, changed-file ownership, Git hygiene, engineering PASS/FAIL matrix, and durable report/event identity. Never stage forbidden generated/local paths.
8. Before emitting handoff, run the full self-audit at `docs/spec/implementation/pre-handoff-self-audit.md`. Every gate must be PASS. The implementation report must include the completed PASS/FAIL matrix and the hard-reject scan ("all false"). A handoff without this evidence is incomplete; the coordinator must not dispatch review.

## Work-agent boundary

The implementer changes only the paired brief's exclusive owner, adds required tests/docs, does not commit, and never issues accept/reject. Failure before commit leaves authoritative bytes unchanged; uncertain outcomes are verified from durable state before retry. Emit exactly one replay-safe handoff after all gates pass. A correction uses the preserved lineage, the numbered correction brief, and fresh impacted plus original proof.

## Independent-review boundary

The reviewer treats the implementation report as claims, inspects actual source/diff/artifacts, and reproduces critical proof in the engineering standard's mandatory order. Do not repair. Any failed row yields exactly one reject and a numbered correction brief; unrelated ready work remains unaffected. Only all-pass evidence permits one accept and a reviewer-created acceptance commit. Publication/integration is a separate serialized effect.

## Host controls

When the process user is not `kavan`, every command uses `sudo -u kavan -i`. Every edited file ends owned by `kavan:kavan`. Never commit `.local/`, `build/`, `dist/`, `node_modules/`, `.watchtower/`, or `.nira/local/`.

## NPM is installed through nvm

Use the npm and node installed through nvm.

+ load /home/kavan/.nvm/nvm.sh as kavan

## RT-08 requires you run as kavan

Do correctly perform `nvb dist` make sure you are running as kavan through `sudo -u kavan -i` and using
nvm installed node and npm