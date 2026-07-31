# Review Batch RM-02 — JSON Envelopes And Schema Validation

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
