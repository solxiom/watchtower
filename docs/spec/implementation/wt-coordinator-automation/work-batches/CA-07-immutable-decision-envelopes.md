# Batch CA-07 — Immutable decision envelopes

## Synchronized batch execution matrix

- **Accepted-map title:** Immutable decision envelopes
- **Dependencies:** `CA-02`–`CA-06`
- **Exclusive ownership/interface:** envelope foundation
- **Implementer/reviewer floor:** R4 / R4
- **Mandatory batch proof:** Stable semantic digest; bounded default context; contradiction/advisor evidence references and impact scope; untrusted-content delimiting
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-07-immutable-decision-envelopes.md`
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-07-immutable-decision-envelopes-review.md`
- **Correction report:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-07-immutable-decision-envelopes-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ❌ Not started
Pack: wt-coordinator-automation (Pack 5)
Phase: Routing and decision foundation
Depends on: CA-02 through CA-06 accepted
Owned files: `src/foundation/DecisionEnvelope.ts`, `src/contracts/decision.ts`

**Required implementor reasoning class:** `R4`
**Class rationale:** immutable decision envelope construction with stable semantic digests, bounded default context, and untrusted-content delimiting. The class is a floor; escalate when source inspection exposes additional risk.

## Objective

Build the immutable decision envelope — the narrow, reproducible context
assembled for one coordinator cycle. Envelopes carry a stable semantic digest,
bounded default context from verified pack indexes, and clear delimiting
between trusted (index-derived) and untrusted (agent/operator) content.

## Required Work

1. **Read the normative envelope contract.** Study `coordinator-automation.md`
   §10 for the decision-envelope specification. Study `v1-contracts.md §5`
   for the `decisionProposal` schema. Study `v1-contracts.md §3.4` for RFC
   8785 digest canonicalization.

2. **Implement `src/contracts/decision.ts`:**
   - `DecisionEnvelope` type — the immutable bounded input for one cycle:
     ```typescript
     {
       schemaVersion: 1;
       cycleId: string;
       laneId: string;
       decisionClass: DecisionClass;
       triggerType: string;
       triggerCausationId: string | null;
       snapshotDigest: string; // sha256:...
       packSealId: string;
       policyVersion: string;
       policyDigest: string;
       routeRuleId: string;
       boundedContext: BoundedContext;
       createdAt: string; // ISO 8601
       expiresAt: string; // ISO 8601
     }
     ```
   - `BoundedContext` type — the bounded, provenance-tracked context section:
     ```typescript
     {
       indexContext: IndexContextSection; // trusted, index-derived
       journalContext: JournalContextSection; // trusted, journal-derived
       routingContext: RoutingContextSection; // trusted, routing-derived
       untrustedContent: UntrustedSection; // agent/operator content, delimited
     }
     ```
   - `IndexContextSection` — bounded pack-index context: relevant batch
     identities, dependencies, primary repository, reasoning class, workload,
     and requirement IDs. Never includes full batch briefs or pack content.
   - `JournalContextSection` — bounded journal context: relevant recent events
     (bounded by policy), current batch/lane projection, and cycle-specific
     event references.
   - `RoutingContextSection` — routing context: the matched rule, decision class,
     permitted results, and endpoint availability.
   - `UntrustedSection` — operator message or existing cycle proposals, clearly
     delimited as untrusted.

3. **Implement `src/foundation/DecisionEnvelope.ts`:**
   - `DecisionEnvelopeBuilder` class that constructs immutable envelopes.
   - `buildEnvelope(params: EnvelopeParams): DecisionEnvelope` — assembles a
     complete envelope from bounded index queries, journal projections, and
     routing decisions.
   - `computeEnvelopeDigest(envelope: DecisionEnvelope): string` — RFC 8785
     canonicalization of the envelope's semantic core, producing a stable
     `sha256:...` digest. The digest is computed once at construction and
     frozen.
   - `verifyEnvelopeDigest(envelope: DecisionEnvelope): boolean` — independently
     recomputes and verifies the digest.
   - `EnvelopeParams` type: `{cycleId, laneId, trigger, routeDecision, indexQuery,
     journalProjection, operatorMessage?}`.
   - The builder enforces boundedness:
     - Index context is assembled through CA-02 bounded queries — never loads
       the full pack index.
     - Journal context is bounded to `maxJournalEntries` (policy-configured,
       default 50 most recent relevant events).
     - The builder never reads pack files, lane config, or full journal content.
   - The builder delimits untrusted content with clear section markers in the
     `untrustedContent` section.
   - Envelopes are immutable after construction. The digest is frozen. Any
     modification requires a new envelope with a new `cycleId` and digest.

4. **Content delimiting rules:**
   - Trusted sections (index, journal, routing) are populated only from
     verified sources (pack index, journal index, routing policy).
   - Untrusted section contains: operator natural-language message, provisional
     coordinator response text, or referenced external content.
   - The untrusted section is clearly marked and structurally separated from
     trusted sections so a decision agent cannot craft content that the
     validator would interpret as authoritative.

5. **Error taxonomy:**
   - `ENVELOPE_BUILD_FAILED` — envelope construction failed (missing required context).
   - `ENVELOPE_DIGEST_MISMATCH` — stored digest does not match recomputed digest.
   - `ENVELOPE_EXPIRED` — envelope's `expiresAt` has passed.
   - `ENVELOPE_STALE_SNAPSHOT` — the snapshot digest no longer matches current state.
   - `ENVELOPE_INDEX_UNAVAILABLE` — required index query returned no result or stale index.

## Expected Ownership

- `src/contracts/decision.ts` — owns the `DecisionEnvelope`, `BoundedContext`,
  and sub-section type definitions. Pure types, no logic.
- `src/foundation/DecisionEnvelope.ts` — owns envelope construction, digest
  computation/verification, boundedness enforcement, and content delimiting.
- No other module duplicates envelope construction or digest computation.

## Tests And Evidence

- **Stable digest:** Build two envelopes with identical params. Prove digest is
  identical.
- **Different digest:** Change one field (e.g., operator message). Prove digest
  differs.
- **Bounded index context:** Prove that envelope construction triggers at most
  the bounded queries needed for the trigger. Never loads the full pack index.
- **Bounded journal context:** Prove journal context is limited to
  `maxJournalEntries` items. Additional events are not included.
- **Content delimiting:** Prove untrusted content is structurally separated
  from trusted sections. Prove an agent-crafted string in the untrusted section
  cannot affect the `indexContext` or `routingContext` sections.
- **Expired envelope:** Envelope with `expiresAt` in the past. Prove
  `ENVELOPE_EXPIRED` on verification.
- **Stale snapshot:** Change a journal entry that the envelope's snapshot digest
  was built from. Prove `ENVELOPE_STALE_SNAPSHOT`.
- **Index unavailable:** Attempt to build an envelope when the pack index is
  stale or missing. Prove `ENVELOPE_INDEX_UNAVAILABLE`.
- **RFC 8785 canonicalization:** Verify the digest format matches the v1
  contract definition (`sha256:<64 hex>`).
- **Model-free proof:** Architecture check proving no model/AI imports.

## What Must Not Change

- Do not modify the CA-02 index-query contract.
- Do not modify the CA-03 journal-projection contract.
- Do not modify the CA-05 routing-policy types.
- Do not load full pack files or full journal content.
- Do not invoke models.

## Review Procedure Highlights

1. Independently build envelopes from identical params and verify digest stability.
2. Verify boundedness — no full-pack or full-journal loads.
3. Verify content delimiting between trusted and untrusted sections.
4. Verify digest recomputation and verification.
5. Verify expiry and staleness detection.

---

# CA-07 Agent Launch Prompt

## Recommended agent/model class for forwarding:

**Reasoning level:** `R4` — deep code reasoning required.
**Suitability:** immutable envelope construction with RFC 8785 digest canonicalization, boundedness enforcement across index/journal/routing contexts, and untrusted-content delimiting. The agent must reason about content-trust boundaries and digest stability.
**Primary agents:** GPT-5.4, Claude Opus 4.1, Claude Sonnet 4.6.
**Good alternatives:** GPT-5.2.
**Acceptable-only-with-steering:** Composer 2.5, Cursor Auto — may handle envelope assembly and digest computation but must be steered away from loading full index/journal content or blurring trusted/untrusted boundaries.
**Unsuitable options:** Claude Haiku — insufficient for content-trust-boundary reasoning and RFC 8785 canonicalization correctness.

### Complete forwarding profile — mandatory

Reasoning level `R4`. Primary: GPT-5.4, Claude Opus 4.1, Claude Sonnet 4.6. Good alternatives: GPT-5.2. Steering-only: Composer 2.5, Cursor Auto. Unsuitable: Claude Haiku.

## Capability-Based Agent Selection Rule

- R3: reliable bounded repository reasoning.
- R4: deep code reasoning, compatibility, negative-path design, ownership boundaries.
- R5: strongest reasoning — state machines, concurrency, graph/planner logic.

CA-07 is R4 because the envelope is the immutable boundary between deterministic watchtower services and every coordinator decision agent. A digest instability or untrusted-content leak undermines proposal validation and effect safety.

## Read In This Order

1. `AGENTS.md` prerequisite
2. Pack README, roadmap, tracker, quality rules
3. `docs/spec/v1-contracts.md` §3.4 — seal and canonicalization (RFC 8785)
4. `docs/spec/v1-contracts.md` §5 — proposal schema (decision envelope context)
5. `docs/spec/coordinator-automation.md` §10 — decision envelope specification
6. `docs/spec/v1.md` §11.9 — coordinator command group
7. Accepted CA-02 index query types
8. Accepted CA-03 journal projection types
9. Accepted CA-05 routing policy types
10. Accepted CA-06 adapter eligibility types

## Reasoning / Agent Class

- Reasoning level: `R4`.
- Primary: GPT-5.4, Claude Opus 4.1, Claude Sonnet 4.6.
- Good alternatives: GPT-5.2.
- Steering-only: Composer 2.5, Cursor Auto.
- Unsuitable: Claude Haiku.

## Mandatory Reasoning Protocol

1. Map the complete envelope structure — every section, its source, and its trust classification.
2. Design the digest computation — which fields form the semantic core, how untrusted content is included.
3. Enumerate every boundedness constraint — index, journal, routing.
4. Design negative tests for digest instability, bound violation, and content pollution.
5. Verify immutability — no post-construction modification.
6. Inspect CA-02, CA-03, CA-05, CA-06 output for type compatibility.

## Structural Design And Module-Size Gate

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

## Your Mission

1. Read all reference documents and inspect CA-02/CA-03/CA-05/CA-06 output.
2. Implement `src/contracts/decision.ts` with complete `DecisionEnvelope`, `BoundedContext`, and sub-section types.
3. Implement `src/foundation/DecisionEnvelope.ts` with `DecisionEnvelopeBuilder`, digest computation/verification, and boundedness enforcement.
4. Create focused specs for: stable digest, boundedness, content delimiting, expiry, staleness, index unavailability, RFC 8785 format, and model-free proof.
5. Produce implementation report, update tracker, leave handoff.

## What You Must Not Do

1. Do not load full pack or journal content.
2. Do not blur trusted/untrusted content boundaries.
3. Do not allow post-construction modification.
4. Do not invoke models.
5. Do not write lane state.
6. Do not commit.

## Required Proof

- [ ] `nvb build` and `nvb test` pass.
- [ ] Stable digest across identical params.
- [ ] Boundedness proven — no full-pack or full-journal loads.
- [ ] Content delimiting structurally enforced.
- [ ] Expiry and staleness correctly detected.
- [ ] Implementation report written.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Trackers and Status Docs

- `implementation-tracker.md`, `implementation-roadmap.md`

## Local Artifact Git Rule

`.local/` never staged, never committed.

## Non-Negotiable Rules

- Envelopes are immutable after construction.
- Trusted sections sourced only from verified pack/journal/routing.
- Untrusted content is clearly delimited.
- Boundedness enforced — no full-pack or full-journal content.
- Model-free.

## Required Disk Report

`.local/agent-reports/coordinator-automation/CA-07-immutable-decision-envelopes.md`

## Always plan and make task lists

## Leave a helpful handoff message for the next agent

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **envelope foundation**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/CA-07-immutable-decision-envelopes.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`CA-02`–`CA-06`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Stable semantic digest; bounded default context; contradiction/advisor evidence references and impact scope; untrusted-content delimiting**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **envelope foundation** and **Stable semantic digest; bounded default context; contradiction/advisor evidence references and impact scope; untrusted-content delimiting**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-coordinator-automation/CA-07-immutable-decision-envelopes.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
