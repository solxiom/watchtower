# Batch RM-09 — Tmux, watcher, heartbeat, and worker observations

## Synchronized batch execution matrix

- **Accepted-map title:** Tmux, watcher, heartbeat, and worker observations
- **Dependencies:** `RM-04`, `RM-05`
- **Exclusive ownership/interface:** observation foundation
- **Implementer/reviewer floor:** R3 / R3
- **Mandatory batch proof:** Qualified names; stale heartbeat; presence never treated as lifecycle authority
- **Implementation report:** `.local/agent-reports/wt-read-model/RM-09-tmux-watcher-heartbeat-and-worker-observations.md`
- **Review report:** `.local/agent-reports/wt-read-model/reviews/RM-09-tmux-watcher-heartbeat-and-worker-observations-review.md`
- **Correction report:** `.local/agent-reports/wt-read-model/reviews/corrections/RM-09-tmux-watcher-heartbeat-and-worker-observations-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ❌ Pending
Phase: Observations
Depends on: RM-04, RM-05 accepted

**Required implementor reasoning class:** `R3`
**Class rationale:** observation mechanics with no lifecycle authority. Presence reading is straightforward; the primary risk is scope-creep into lifecycle decisions.

## Objective

Provide qualified name reading. Detect stale heartbeats. Presence observation
only; never treat as lifecycle authority.

## Required Work

1. Create `src/foundation/runtimeObservations.ts`: pure parsing and
   qualified-name matching for tmux sessions, watcher presence, and worker
   sessions. Match validated, fully constructed session names exactly; a
   prefix match is not sufficient evidence of lane identity.
2. Create `src/foundation/NirvanaTmuxObserver.ts`: focused read-only adapter
   using the pinned Nirvana command facade with fixed argv
   (`tmux list-sessions -F '#{session_name}'`), bounded output, timeout,
   sanitized environment, and injected execution for tests. No shell string,
   direct `node:child_process`, arbitrary tmux operation, or mutation method.
3. Create `src/foundation/heartbeatObservation.ts`: heartbeat detection. Read heartbeat
   files, compare timestamps against a configurable threshold, classify as
   fresh, stale, or absent.
4. Worker-event reading: surface the latest valid worker event per role from
   the parsed JSONL stream (consume RM-05 parser).
5. Write focused specs: tmux session reading (with an injected Nirvana command
   port and a fixture executable), exact qualified-name matching, heartbeat
   staleness classification, worker-event reading from parsed events, no-mutation
   proof (zero filesystem writes).

## Expected Ownership

- `src/foundation/runtimeObservations.ts`,
  `src/foundation/NirvanaTmuxObserver.ts`,
  `src/foundation/heartbeatObservation.ts`
- Respective focused specs.

## Tests And Evidence

- Tmux session reading through the bounded Nirvana command adapter; exact
  qualified-name matching and zero prefix-collision acceptance.
- Heartbeat: fresh, stale (exceeds threshold), absent (no file).
- Worker events: latest event per role from parsed stream.
- No-mutation proof: after observation, no state files written, no cursors
  advanced, no heartbeat files touched.
- `nvb build` and `nvb test` pass.

## Review Procedure Highlights

1. Verify heartbeat staleness threshold is configurable.
2. Confirm observations never write state or advance cursors.
3. Trace worker-event reading through the RM-05 parser.
4. Verify tmux reading is mockable for tests.

## Completion And Handoff

Observations are accepted. RM-10 consumes observations for status display.
No observer implies lifecycle authority.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **observation foundation**. Before editing, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-read-model/RM-09-tmux-watcher-heartbeat-and-worker-observations.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`RM-04`, `RM-05`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Qualified names; stale heartbeat; presence never treated as lifecycle authority**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **observation foundation** and **Qualified names; stale heartbeat; presence never treated as lifecycle authority**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- replay, stale-current-state, concurrent writer, interrupted effect, and before/after-commit failure points prove idempotency or deterministic refusal;
- a before/after byte inventory proves read-only, preview, audit, query, and diagnostic paths perform no repair or authoritative mutation;
- isolated and relocated execution proves argv, cwd, environment, signal, exit, and unavailable-tool behavior without source-tree or ambient-config fallback;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Do not commit or issue a verdict. Only after every gate passes, write `.local/agent-reports/wt-read-model/RM-09-tmux-watcher-heartbeat-and-worker-observations.md`, truthfully record this batch's handoff readiness without changing unrelated tracker rows, and emit exactly one replay-safe handoff. A correction retains lineage and reruns both impacted and original acceptance proof.
