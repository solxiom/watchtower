# Batch CA-26 — Session proposals, confirmation, revalidation, and apply

## Synchronized batch execution matrix

- **Accepted-map title:** Session proposals, confirmation, revalidation, and apply
- **Dependencies:** `CA-09`, `CA-10`, `CA-15`–`CA-17`
- **Exclusive ownership/interface:** proposal lifecycle/effect bridge
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory batch proof:** Explicit confirmation; current-state validation; stale/illegal refusal; sole executor handoff
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-26-session-proposals-confirmation-revalidation-and-apply.md`
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-26-session-proposals-confirmation-revalidation-and-apply-review.md`
- **Correction report:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-26-session-proposals-confirmation-revalidation-and-apply-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ❌ Pending
Depends on: CA-09, CA-10, CA-15–CA-17

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

Implement only **Session proposals, confirmation, revalidation, and apply**. This batch exclusively owns proposal lifecycle/effect bridge. It
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

## Concrete interface and negative-case plan

**Implementation:** Files/interfaces: SessionProposalService and explicit confirmation/revalidation/apply bridge to CA-09/CA-10. Cover proposed, confirmed, stale, illegal, expired, duplicate and concurrently invalidated states; bind confirmation to exact proposal/current-state digest and prove only one executor invocation.

## Mandatory proof

- Explicit confirmation; current-state validation; stale/illegal refusal; sole executor handoff.
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

The exclusive owned interface set is **proposal lifecycle/effect bridge**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/CA-26-session-proposals-confirmation-revalidation-and-apply.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`CA-09`, `CA-10`, `CA-15`–`CA-17`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Explicit confirmation; current-state validation; stale/illegal refusal; sole executor handoff**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **proposal lifecycle/effect bridge** and **Explicit confirmation; current-state validation; stale/illegal refusal; sole executor handoff**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-coordinator-automation/CA-26-session-proposals-confirmation-revalidation-and-apply.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
