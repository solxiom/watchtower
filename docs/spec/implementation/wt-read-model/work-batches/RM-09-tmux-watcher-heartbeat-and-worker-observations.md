# Batch RM-09 — Tmux, Watcher, Heartbeat, And Worker Observations

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
