# Review Batch RM-01 — Contract kernel, error taxonomy, and source architecture gates

## Synchronized batch execution matrix

- **Accepted-map title:** Contract kernel, error taxonomy, and source architecture gates
- **Dependencies:** —
- **Exclusive ownership/interface:** `src/contracts/`, contract and architecture test helpers
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** Versioned IDs/types; exit-code mapping; exhaustive error fixtures; automated engineering-standard hard rejects
- **Implementation report:** `.local/agent-reports/wt-read-model/RM-01-contract-kernel-and-error-taxonomy.md`
- **Review report:** `.local/agent-reports/wt-read-model/reviews/RM-01-contract-kernel-and-error-taxonomy-review.md`
- **Correction report:** `.local/agent-reports/wt-read-model/reviews/corrections/RM-01-contract-kernel-and-error-taxonomy-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ✅ Accepted
Review outcome: correction 03 independently verified and accepted
Reasoning: `R4`
Paired work brief: `work-batches/RM-01-contract-kernel-and-error-taxonomy.md`
Implementation report: `.local/agent-reports/wt-read-model/RM-01-contract-kernel-and-error-taxonomy.md`

## Scope Verification

- [ ] `src/contracts/types.ts` created with all domain types from v1.md and v1.schema.json
- [ ] `src/contracts/errors.ts` created with complete error taxonomy
- [ ] `src/contracts/exitCodes.ts` created with ExitCode union and mapping
- [ ] `src/contracts/index.ts` updated to export all public symbols
- [ ] No foundation or CLI logic in `src/contracts/`
- [ ] No Nirvana rendering dependencies in `src/contracts/`

## Required Independent Proof

1. Enumerate every exported error code. Verify each maps to exactly one exit code in the 1-5 range. Prove no code is unmapped or maps to multiple exit codes.
2. Compare every domain type against `v1.schema.json` definitions. Every `$defs` entry must have a corresponding TypeScript type.
3. Verify every error code fixture: valid construction, boundary values, malformed input rejection.
4. Run `nvb build` and `nvb test`. Confirm focused specs pass.
5. Verify `src/contracts/index.ts` exports all symbols required by downstream batches.
6. Confirm no `any`-typed public interfaces exist.

## Required Reasoning Posture

The reviewer must reason from the governing specifications and current source,
not from the implementation report alone. Inspect every file independently.
Compare error codes against the spec-mandated exit-code mapping table. Verify
every domain type has correct field names, types, and required/optional markers.

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

# Agent Launch Prompt — Work Batch RT-05

## Required Review Packet

The review report must include: independently rerun proof commands and outcomes,
structural verification results, line-count verification, tracker/roadmap sync
status, and the acceptance or rejection decision.

## Acceptance Gate

- All hard-reject checklist items are clear.
- Every error code maps to exactly one exit code.
- All domain types match v1.schema.json.
- `nvb build` and `nvb test` pass with zero failures.
- No product logic in `src/cli.ts`.
- Tracker and roadmap updated.

## Reject Conditions

- Unmapped or multiply-mapped error codes.
- Missing required field in domain types.
- `any`-typed public interfaces.
- Foundation or CLI dependencies in contracts.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **`src/contracts/`, contract and architecture test helpers**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-read-model/reviews/RM-01-contract-kernel-and-error-taxonomy-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **—**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Versioned IDs/types; exit-code mapping; exhaustive error fixtures; automated engineering-standard hard rejects**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **`src/contracts/`, contract and architecture test helpers** and **Versioned IDs/types; exit-code mapping; exhaustive error fixtures; automated engineering-standard hard rejects**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-read-model/reviews/corrections/RM-01-contract-kernel-and-error-taxonomy-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-read-model/reviews/RM-01-contract-kernel-and-error-taxonomy-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
