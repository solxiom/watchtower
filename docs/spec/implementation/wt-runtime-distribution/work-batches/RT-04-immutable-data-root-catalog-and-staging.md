# Batch RT-04 — Immutable data-root catalog and staging

## Synchronized batch execution matrix

- **Accepted-map title:** Immutable data-root catalog and staging
- **Dependencies:** `RT-02`, `RM-03`
- **Exclusive ownership/interface:** runtime catalog foundation
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** XDG precedence; atomic first stage; two versions coexist; immutable version roots
- **Implementation report:** `.local/agent-reports/wt-runtime-distribution/RT-04-immutable-data-root-catalog-and-staging.md`
- **Review report:** `.local/agent-reports/wt-runtime-distribution/reviews/RT-04-immutable-data-root-catalog-and-staging-review.md`
- **Correction report:** `.local/agent-reports/wt-runtime-distribution/reviews/corrections/RT-04-immutable-data-root-catalog-and-staging-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ❌ Pending
Phase: NVB distribution and immutable catalog
Depends on: RT-02 accepted (manifest types), RM-03 accepted (canonical paths and workspace resolution from Pack 1)

**Required implementor reasoning class:** `R4`
**Class rationale:** immutable catalog with atomic staging, XDG precedence, and version coexistence. Filesystem state transitions and integrity guarantees require deep cross-module reasoning. The class is a floor.

## Objective

Implement XDG precedence for the Watchtower data root. Stage immutable runtime
versions atomically. Support two coexisting versions with content-addressed
roots. Validate package and staged runtime manifests.

## Required Work

1. Implement `resolveDataRoot()` in `src/foundation/DataRoot.ts`:
   - precedence: `WATCHTOWER_DATA_HOME` env > `XDG_DATA_HOME/watchtower` >
     `~/.local/share/watchtower`
   - resolve `~` from the effective OS user's home directory (via `os.userInfo()`,
     not `$HOME` environment variable)
   - canonicalize the resolved path
   - return the canonical path; throw if the path is unresolvable
   - the function is pure resolution — it does not create directories

2. Implement `RuntimeCatalog` in `src/foundation/RuntimeCatalog.ts`:
   - `stageRuntime(runtimeVersion: string, packageManifest: RuntimeManifestV1,
     sourceRuntimeDir: string): void`
     - validate `runtimeVersion` matches `^[0-9]+\.[0-9]+\.[0-9]+(-.+)?$`
     - compute staging path: `<data-root>/runtimes/<runtimeVersion>/`
     - fail if the version directory already exists (immutability: no overwrite)
     - stage via temp-directory-plus-atomic-rename on the same filesystem
     - write the manifest into the staged directory
     - preserve executable bits from source
     - validate staged manifest against actual files using `ManifestValidator`
     - on failure before the atomic rename, remove the temp directory and leave
       the data root unchanged
   - `stageKnowledge(knowledgeVersion: string, packageManifest: KnowledgeManifestV1,
     sourceKnowledgeDir: string): void` — same pattern for knowledge
   - `isRuntimeInstalled(runtimeVersion: string): boolean`
   - `isKnowledgeInstalled(knowledgeVersion: string): boolean`
   - `getRuntimeRoot(runtimeVersion: string): string` — returns the canonical
     path to a staged runtime version, or throws if not installed
   - `getKnowledgeRoot(knowledgeVersion: string): string`
   - `listInstalledRuntimes(): string[]` — returns version directories that exist
     and pass manifest validation
   - `listInstalledKnowledge(): string[]`
   - failures are classified with error codes: `VERSION_ALREADY_INSTALLED`,
     `VERSION_NOT_INSTALLED`, `INVALID_VERSION_STRING`,
     `STAGING_VALIDATION_FAILED`, `STAGING_IO_ERROR`

3. Prove immutability: any attempt to write into a staged version directory after
   the atomic commit must fail. The catalog must not provide a mutable path.

4. Prove version coexistence: stage two different runtime versions and verify
   both are independently usable and have no overlapping files.

## Expected Ownership

- `src/foundation/DataRoot.ts` — `resolveDataRoot()`, XDG precedence logic
- `src/foundation/RuntimeCatalog.ts` — `RuntimeCatalog` class with staging,
  validation, and query methods

## Tests And Evidence

- Prove XDG precedence: `WATCHTOWER_DATA_HOME` overrides `XDG_DATA_HOME`
- Prove XDG precedence: `XDG_DATA_HOME` overrides `~/.local/share/watchtower`
- Prove `~` resolves from OS user home, not `$HOME`
- Prove atomic staging: interrupted staging (kill before rename) leaves no valid
  version directory
- Prove version directory is immutable after staging (write attempt fails)
- Prove two versions coexist under `<data-root>/runtimes/`
- Prove staging fails on invalid version string
- Prove staging fails on already-installed version
- Prove staging validation passes with correct manifest and files
- Prove staging validation fails with manifest/file mismatch
- Prove `getRuntimeRoot` throws for uninstalled version
- Prove `listInstalledRuntimes` returns correct sorted list
- Run architecture checks

## What Must Not Change

- Do not execute any runtime script during staging — pure filesystem operation
- Do not create directories outside `<data-root>/runtimes/<version>/` or
  `<data-root>/knowledge/<version>/`
- Do not use `$HOME` directly — use `os.userInfo().homedir`
- Do not introduce adapter or managed-link logic

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **runtime catalog foundation**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-runtime-distribution/RT-04-immutable-data-root-catalog-and-staging.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RT-02`, `RM-03`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **XDG precedence; atomic first stage; two versions coexist; immutable version roots**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **runtime catalog foundation** and **XDG precedence; atomic first stage; two versions coexist; immutable version roots**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-runtime-distribution/RT-04-immutable-data-root-catalog-and-staging.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
