# RT-06 Specification-Resolution Amendment

Status: **Normative for RT-06 and downstream `wt-lane-lifecycle` LC-03**

This amendment records two scope decisions confirmed by the operator holding
spec authority for this lane, in response to RT-06 Correction 02's finding
that an implementer-authored proposal alone cannot close a cross-batch
ownership or acceptance-scope question (`reviews/corrections/RT-06-managed-lane-links-and-compatibility-names-correction-02.md`,
findings 1–2). It amends the batch scope recorded in
`docs/spec/v1-implementation-map.md` and the RT-06 work brief
(`work-batches/RT-06-managed-lane-links-and-compatibility-names.md`) without
compressing or removing either document; both remain authoritative except
where this amendment narrows or assigns scope explicitly below.

The full `propose-specification-resolution` → `admit-pack-amendment`
coordinator lifecycle (`docs/spec/specification-resolution.md`,
`wt-coordinator-automation/specification-resolution-batch-amendment.md`) is
not yet implemented in this checkout (Pack 5/CA batches are not built), and
even once built that lifecycle requires a C5 architect advisor role distinct
from the implementer. In its absence, this amendment is the operator's direct
authorization, recorded durably in the committed spec tree rather than only
in an implementation or correction report, exactly as Correction 02 required.

## 1. `install.json.taskRuntime` writer boundary (Correction 02, finding 1)

**Decision:** RT-06 owns atomic, single-field persistence of the
`taskRuntime` member on an **already-materialized** `install.json`. It never
creates `lane.json` or `install.json` from nothing. `wt-lane-lifecycle` LC-03
(`❌ Pending` at the time of this amendment) remains the sole owner of
whole-document generation at `init`; when LC-03 is implemented, it calls
`LaneTaskProfileInstaller.install` to obtain the verified pin and embeds it
directly in the document it constructs — LC-03 does not need to call RT-06's
rebind path during `init`, only during a later `upgrade`/rebind of an
existing lane, where RT-06's `installAndRebind` is the accepted writer.

**Boundary:** RT-06's writer (`managedAssets/installManifestTaskRuntimeWriter.ts`,
invoked through `LaneTaskProfileInstaller.installAndRebind`) must:

- refuse to run against a document whose `runtimeVersion` disagrees with the
  runtime version the pin was computed against (never leave `install.json`
  internally contradictory between `runtimeVersion` and `taskRuntime`'s
  targets);
- canonicalize and authorize the `install.json` path against the lane
  directory before any access;
- hold the lane's managed-asset lock for the full read-check-write, so a
  concurrent `ManagedAssets` link mutation or a second rebind cannot
  interleave;
- complete the durable replacement sequence required by
  `docs/development/engineering-and-review-standard.md` §9: temp-write,
  flush, atomic rename, **and directory-flush**;
- durably re-read and verify the complete written document, not only the
  `taskRuntime` member, before returning.

This boundary is exclusive: no later batch may add a second `install.json`
writer for the `taskRuntime` member without superseding this amendment.

## 2. Compatibility-name production scope (Correction 02, finding 2)

**Decision:** RT-06's compatibility-name acceptance criterion is narrowed to
the **resolution mechanism**: `resolveCompatibilityName` must resolve a
historical name only to a canonical action that both the packaged catalog
declares and the lane's pinned profile allows (via `LaneTaskCatalog.resolveAction`),
proven against known, unknown, catalog-absent/dangling, and out-of-profile
cases with a real staged catalog. The production `COMPATIBILITY_NAMES` table
remains `Object.freeze({})`.

**Rationale:** RT-01's accepted import record classifies the one concrete
historical name in the checkout (`coordinator-watch.sh`) as a `TaskHandler`,
not a leaf-compatibility script, so RT-06 has no accepted evidence to invent
an entry from. No batch has yet been assigned to audit and classify the full
historical coordinator-script inventory into canonical actions.

**Scope going forward:** a future named classification batch (not yet
assigned a batch ID at the time of this amendment) owns producing the
audited historical-name inventory and populating `COMPATIBILITY_NAMES`. That
batch changes only data in `compatibilityNameResolver.ts`'s production
table; it must not change the resolution mechanism this amendment already
accepts as closed.

## Authorization record

- Confirmed by: the operator directing this RT-06 correction lane (session
  authority for `wt-batch-RT-06-kavan2`), in direct response to Correction 02.
- Scope: RT-06 Correction 02, findings 1 and 2 (writer boundary and
  compatibility scope) only. No other RT-06 finding, and no other batch's
  scope, is amended by this document.
- This amendment does not retroactively validate any implementation; RT-06
  Correction 02 must still independently satisfy every other required proof
  (coherence, durability, lock, path authorization, full test suite) before
  a handoff is emitted.
