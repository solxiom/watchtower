# Review Batch RM-02 — Public JSON envelopes and schema validation

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

Status: ⏳ Awaiting review
Reasoning: `R4`
Paired work brief: `work-batches/RM-02-json-envelopes-and-schema-validation.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-02-json-envelopes-and-schema-validation.md`

## Scope Verification

- [ ] `src/foundation/commandEnvelopeSerializer.ts` created with `buildCommandResult`, `buildCommandError`, `validateEnvelope`
- [ ] `src/foundation/ResultRenderer.ts` created with `renderResult`, `renderError`
- [ ] No domain types defined in serializer; type-checked against contracts
- [ ] `--json` output contains exactly one JSON value with no decorative text

## Required Independent Proof

1. Round-trip test every envelope variant through schema validation.
2. Verify `--json` produces exactly one JSON value on stdout, no ANSI, no decorations, no emojis, no progress indicators.
3. Prove the exact additive-compatibility boundary: optional nested fields in
   an explicitly extensible `data` payload and `error.details` validate;
   unknown top-level `commandResult`/`commandError` or `error` properties fail.
4. Verify serializer does not define domain types or error codes.
5. Trace every output path; confirm no raw JSON emissions bypass the serializer.
6. Run `nvb build` and `nvb test` independently.
7. Prove the staged schema crosses a validated `unknown` boundary: wrong
   identity, missing definitions, malformed JSON, and unreadable bytes fail
   closed without casts or non-null assertions.
8. Reproduce RT-08's fresh-prefix packed-artifact fixture. Do not treat an
   undeclared npm-registry E404 as absence of the pinned ecosystem and do not
   require RM-02 to publish or vendor Nirvana packages.
9. Confirm RM-02 does not modify root `nvb.json` or hand-edit RM-13's generated
   aggregate, and independently audit every direct filesystem use against the
   documented `NIRVANA_API_GAP`.

## Required Reasoning Posture

Inspect the serializer and renderer source independently. Compare against
`v1.schema.json` `$defs.commandResult` and `$defs.commandError`. Test both
human and JSON rendering modes. Verify the renderer accepts the `--json` and
`--no-color` flags and produces correct output.

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

## Acceptance Gate

- All hard-reject checklist items clear.
- Envelope validation passes for all variants.
- `--json` purity confirmed.
- Schema-permitted nested compatibility and closed-envelope rejection proved.
- Build and tests pass independently.

## Reject Conditions

- Invalid JSON shapes accepted.
- Decorative text in JSON output.
- Domain types defined in serializer.
- Raw JSON emissions bypassing serializer.
- Stale tracker/roadmap.
- Implementation agent committed.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **contracts, render/serialization foundation**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-read-model/reviews/RM-02-json-envelopes-and-schema-validation-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-01`, `RM-13`, `RT-08`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Success/error envelopes; additive compatibility; no decorative JSON output; staged-schema and isolated-install proof**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **contracts, render/serialization foundation** and **Success/error envelopes; additive compatibility; no decorative JSON output; staged-schema and isolated-install proof**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-read-model/reviews/corrections/RM-02-json-envelopes-and-schema-validation-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-read-model/reviews/RM-02-json-envelopes-and-schema-validation-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
