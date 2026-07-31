# Batch RT-08 — Nirvana dependency closure and isolated install harness

## Synchronized batch execution matrix

- **Accepted-map title:** Nirvana dependency closure and isolated install harness
- **Dependencies:** `RM-01`
- **Exclusive ownership/interface:** exact dependency manifest, packed-artifact fixture, install verifier
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory batch proof:** Complete transitive closure; fresh-prefix install; no wildcard, E404, local path, or source/ecosystem symlink
- **Implementation report:** `.local/agent-reports/wt-runtime-distribution/RT-08-nirvana-dependency-closure-and-isolated-install-harness.md`
- **Review report:** `.local/agent-reports/wt-runtime-distribution/reviews/RT-08-nirvana-dependency-closure-and-isolated-install-harness-review.md`
- **Correction report:** `.local/agent-reports/wt-runtime-distribution/reviews/corrections/RT-08-nirvana-dependency-closure-and-isolated-install-harness-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ❌ Pending
Depends on: RM-01

## Governing references

- `AGENTS.md`
- `docs/development/engineering-and-review-standard.md`
- `docs/spec/v1-implementation-map.md`
- `docs/spec/v1.md` and `docs/spec/v1-contracts.md`
- `docs/spec/nirvana-integration-architecture.md`
- `docs/spec/implementation/planning-remediation-amendment.md`
- this pack's `implementation-quality-and-agent-rules.md`

The accepted map and normative specifications override illustrative names in
this brief. Stop for specification resolution if they leave a decision open.

## Objective and ownership

Implement only **Nirvana dependency closure and isolated install harness**. This batch exclusively owns exact dependency manifest, packed-artifact fixture, install verifier. It
consumes accepted predecessors without absorbing adjacent capabilities.

## Required work

1. Inspect predecessor artifacts and pinned Nirvana/Nira APIs; report the
   Nirvana audit and every proven `NIRVANA_API_GAP`.
2. Define closed typed inputs, outputs, reason codes, and failure ordering.
   External values enter as `unknown`; unchecked casts, non-null assertions,
   broad `any`, mutable globals, and service locators are forbidden.
3. Use focused foundation owners and thin command/TaskHandler fronts. Route
   substantial deterministic workflows through the immutable NVB catalog and
   `LaneTaskRunner`; retain the single validated effect boundary.
4. Add unit, integration, adversarial, stale/corrupt, read-only, replay, and
   relocation proof applicable to this capability.
5. Synchronize owned contracts, help, schemas, manifests, aggregates, and docs.

### Required interfaces and files

- Add an exact Nirvana dependency-closure manifest and validator owned by the
  distribution tooling. Each entry records package name, exact package
  version, packed-artifact SHA-256, source-component SHA-256, dependencies, and
  the selected ecosystem version/root provenance.
- Resolve development inputs from the exact ecosystem selected by `nira.json`.
  On this machine the reference fixture is installed `1.0.0-alpha`; the
  mechanism must remain portable to another valid versions root.
- Derive the complete transitive `@nirvana/*` closure. Reject wildcard ranges,
  missing components, name/version mismatches, duplicate identities, local or
  workspace paths, source links, ecosystem links in the installed fixture,
  undeclared registry fallback, and digest drift.
- Pack every selected component, install only those artifacts plus Watchtower
  into a fresh prefix with source/worktree resolution disabled, and execute a
  relocated CLI/schema smoke. An npm public-registry E404 is evidence of a
  wrong undeclared channel, not evidence that the pinned installed ecosystem
  is absent.
- Expose the accepted fixture and manifest to RM-02 and RT-03. RT-08 does not
  publish Nirvana packages, invent registry availability, or own final release
  qualification.

## Concrete interface and negative-case plan

**Implementation:** Files/interfaces: exact Nirvana closure manifest, artifact/source digest validator, component pack fixture and fresh-prefix verifier. Derive the transitive closure selected by nira.json; reject wildcard, missing/mismatched component, duplicate identity, local/workspace path, source/ecosystem symlink, digest drift and undeclared registry fallback. Pack every component, install only artifacts plus Watchtower in a fresh prefix and run relocated CLI/schema smoke.

## Mandatory proof

- Complete transitive closure; fresh-prefix install; no wildcard, E404, local path, or source/ecosystem symlink.
- Reproduce size/responsibility evidence and the complete engineering matrix.
- Run focused tests plus `nvb build`, `nvb test`, and dist/relocation proof
  when runtime or package bytes change.
- Report exact commands, outcomes, changed-file ownership, and Git hygiene.

## Exclusions and handoff

No product logic in `src/cli.ts`; no participating-repository `nvb.json`
change; no arbitrary task, workflow shell, hidden repair, policy duplication,
or command-local mutation. The implementer does not commit or issue a verdict.
Emit a durable handoff only after every proof passes.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **exact dependency manifest, packed-artifact fixture, install verifier**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-runtime-distribution/RT-08-nirvana-dependency-closure-and-isolated-install-harness.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-01`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Complete transitive closure; fresh-prefix install; no wildcard, E404, local path, or source/ecosystem symlink**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **exact dependency manifest, packed-artifact fixture, install verifier** and **Complete transitive closure; fresh-prefix install; no wildcard, E404, local path, or source/ecosystem symlink**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-runtime-distribution/RT-08-nirvana-dependency-closure-and-isolated-install-harness.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
