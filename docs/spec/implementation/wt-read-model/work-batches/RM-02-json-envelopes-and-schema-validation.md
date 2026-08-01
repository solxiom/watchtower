# Batch RM-02 — Public JSON envelopes and schema validation

## Synchronized batch execution matrix

- **Accepted-map title:** Public JSON envelopes and schema validation
- **Dependencies:** `RM-01`, `RM-13`, `RT-08`
- **Exclusive ownership/interface:** contracts, render/serialization foundation
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** Success/error envelopes; additive compatibility; no decorative JSON output; staged-schema and isolated-install proof
- **Implementation report:** `.local/agent-reports/wt-read-model/RM-02-json-envelopes-and-schema-validation.md`
- **Review report:** `.local/agent-reports/wt-read-model/reviews/RM-02-json-envelopes-and-schema-validation-review.md`
- **Correction report:** `.local/agent-reports/wt-read-model/reviews/corrections/RM-02-json-envelopes-and-schema-validation-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ⏳ Correction 04 complete — awaiting independent re-review
Phase: Contract foundation
Depends on: RM-01, RM-13, and RT-08 accepted

**Required implementor reasoning class:** `R4`
**Class rationale:** JSON contract and schema validation with additive compatibility; wrong envelope shape silently breaks every downstream command's JSON output.

## Objective

Define success/error JSON envelopes, implement schema validation, ensure additive
compatibility and no decorative JSON output. This serializer is used by every
later command.

## Required Work

1. Create `src/foundation/commandEnvelopeSerializer.ts` with functions to construct
   `commandResult` (success) and `commandError` (failure) JSON envelopes
   that conform to `v1.schema.json` definitions.
2. Implement schema validation against the bundled v1.schema.json. Validate
   envelope shapes before emitting them and return the stable typed contract
   error on invalid shapes; malformed external input must not panic the process.
   Load only the RM-13 generated aggregate through an explicitly validated
   runtime-asset boundary. Parse bytes as `unknown`, validate schema identity
   and required definitions, and return a typed failure; unchecked casts and
   non-null assertions at this boundary are forbidden.
3. Create `src/foundation/ResultRenderer.ts` with functions for human and
   JSON rendering modes. `--json` must produce exactly one JSON value on stdout
   with no decorative text, ANSI, emojis, or progress indicators.
4. Ensure schema-governed additive compatibility. The top-level
   `commandResult`, `commandError`, and nested `error` objects are closed and
   reject unknown properties. New optional fields validate only inside
   locations whose active schema explicitly permits them, including an object
   carried by `data`, `error.details`, or a referenced payload definition with
   `additionalProperties: true`. Removed, retyped, or forbidden fields are
   rejected at validation time.
5. Write focused specs proving round-trip serialization of every envelope
   variant, `--json` output purity, and additive-field compatibility.
6. Consume RT-08's exact packed-artifact fixture for isolated relocation proof.
   Do not query an undeclared public registry, vendor Nirvana, or make RM-02
   responsible for the later global release-channel contract.
7. Stage schema assets through RM-13's accepted composition/task boundary. Do
   not add tasks to the oversized root `nvb.json` or recreate its registry.
8. Document any direct filesystem boundary as a precise `NIRVANA_API_GAP`,
   including inspected pinned APIs, the CLI-safe bootstrap limitation, typed
   failures, containment, and focused tests.

## Expected Ownership

- `src/foundation/commandEnvelopeSerializer.ts` and its focused specs.
- `src/foundation/ResultRenderer.ts` and its focused specs.
- Contracts in `src/contracts/` for the public envelope types (if not already
  defined by RM-01).

## Tests And Evidence

- Round-trip tests for `commandResult` and `commandError` envelopes.
- Schema validation tests: valid envelopes pass; invalid shapes return the
  stable typed contract failure without process panic.
- Trust-boundary tests: malformed JSON, wrong schema identity, missing `$defs`,
  missing envelope definitions, and unreadable staged assets fail with stable
  reasons and without unchecked assertions.
- Purity tests: `--json` output contains exactly one JSON value, no decorations.
- Additive-field compatibility: a new optional nested field in an explicitly
  extensible `data` payload and in `error.details` validates; an unknown
  top-level envelope/error property is rejected.
- `nvb build` and `nvb test` pass.
- RT-08 fresh-prefix packed-artifact installation and relocated schema smoke
  pass without source, workspace, ecosystem-link, or public-registry fallback.

## What Must Not Change

- Do not define domain types in the serializer; type-check against contracts.
- Do not add decorative text, ANSI, or emojis to any output path.
- Do not hand-edit the RM-13 generated schema aggregate or introduce new
  required fields.
- Do not touch the root `nvb.json`; RM-13 owns schema composition and RM-11 owns
  repository-development task decomposition.

## Review Procedure Highlights

1. Verify every serialized envelope validates against `v1.schema.json`.
2. Confirm `--json` output has exactly one JSON value and no decorative text.
3. Trace every output path to confirm no bypass of the serializer.
4. Test optional nested fields in schema-permitted extension locations and
   unknown fields in closed envelope/error objects to prove both sides of the
   compatibility boundary.

## Required Reasoning Posture

The assigned agent must reason from the governing specifications and current
source, not from the batch title or predecessor report alone.

- Map every requested behavior to one contract owner, one lower-layer
  implementation owner, its front-door delegation point, and focused proof.
- Enumerate invalid states, failure ordering, compatibility risks, concurrency or
  re-entrancy concerns, unsupported behavior, and likely shortcut failures.
- Use negative cases and counterexamples to prove that happy-path success does
  not hide invalid JSON shapes, decorative text leakage, or schema violations.
- Escalate unresolved spec/source contradictions through a correction brief.

## Structural And Module-Size Acceptance

Line count is a design alarm, never permission to accumulate unrelated work.
Count physical lines, including comments and blanks, in new and materially
rewritten hand-maintained files. Generated artifacts are excluded only when
their generator ownership is explicit and they contain no hand-maintained
behavior.

Use the exact project-wide matrix:

| Category | Preferred maximum | Warning band | Hard reject |
| --- | ---: | ---: | ---: |
| CLI command, NVB TaskHandler/front door, registry, renderer, public barrel | 120 | 121–160 | over 180 |
| Orchestrator, controller, coordinator, presenter | 140 | 141–180 | over 200 |
| Foundation service, planner, validator, adapter, store | 200 | 201–260 | over 300 |
| Contract/type-only module | 240 | 241–320 | over 400 |
| Test/spec module | 300 | 301–420 | over 500 |

Functions target 40 lines, warn at 41–60, and reject above 80. Constructors
target 25 lines, warn at 26–40, and reject above 50. Warning-band owners require
a responsibility inventory and explicit reviewer judgment.

Every module has one primary responsibility and one cohesive reason to change.
Commands and TaskHandlers validate, normalize, delegate, and map results.
Orchestrators sequence collaborators without absorbing their algorithms.
Storage, validation, rendering, subprocess/leaf I/O, and state-machine policy do
not accumulate in one owner. Three independently nameable responsibilities
require a split even below a preferred maximum.

Class-owning TypeScript modules use PascalCase filenames; function/value modules
use lowerCamelCase. New source filenames do not use dashes or underscores.
Generic `helpers`, `utils`, `common`, and `misc` overflow bags are rejected.

Any size exception must be approved before implementation and name the exact
file, proposed maximum, cohesion reason, reviewer, and expiry/follow-up batch.
Existing oversized files are not precedent: when touched they become smaller,
split, or remain line-count neutral under an approved extraction plan.

The implementation report records categorized line counts for every new or
materially rewritten file plus warning-band functions/constructors. The
reviewer reproduces those counts and independently judges cohesion. Passing a
line-count check never overrides the responsibility gate.

## Required Review Packet

## Required Review Packet

The implementation report must include: exact changed files and ownership roles,
physical line counts, responsibility inventories for warning-band files, exact
proof commands and outcomes, final git status, and proof that `.local/` is not
staged.

## Completion And Handoff

The serializer is accepted and every later command emits valid JSON envelopes
through it. RM-10 consumes it for `list` and `config show`; RM-12 consumes it
for `status`. No command may emit raw JSON outside this serializer.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **contracts, render/serialization foundation**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-read-model/RM-02-json-envelopes-and-schema-validation.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-01`, `RM-13`, `RT-08`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Success/error envelopes; additive compatibility; no decorative JSON output; staged-schema and isolated-install proof**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **contracts, render/serialization foundation** and **Success/error envelopes; additive compatibility; no decorative JSON output; staged-schema and isolated-install proof**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-read-model/RM-02-json-envelopes-and-schema-validation.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
