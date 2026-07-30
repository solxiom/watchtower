# Review Batch RT-05 — Lane Task Runner And Leaf Invocation Adapter

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
Reviews work batch: RT-05
Depends on: RT-05 implementation complete, implementation report written

**Required reviewer reasoning class:** `R5`
**Class rationale:** independently audit the single application-to-NVB boundary,
its typed action allowlist, immutable target pins, structured evidence, narrow
compatibility fallback, and the leaf-executable boundary beneath TaskHandlers.

## Scope Verification

Confirm that `LaneTaskRunner` is the only application-level task invocation
boundary, that it uses an explicit immutable Watchtower NVB target and typed
action-to-task mapping, and that cataloged leaf executables are reached only
through owning TaskHandlers and the narrow `LeafRuntimeInvoker`. Confirm every
claimed Nirvana capability with installed-source evidence.

## Required Independent Proof

1. Reproduce the Nirvana API audit from pinned package source/types and at least
   one relevant Nira/Nirvana usage. Record support or a named
   `NIRVANA_API_GAP` for explicit config/module targets, cwd, args,
   events/results, environment isolation, cancellation/signals, stdin, and PTY.
2. Audit the codebase for NVB facade calls, `nvb` command calls, Nirvana command
   calls, direct `node:child_process`, and executable invocation. Verify only
   `LaneTaskRunner` is visible to application services and only the leaf adapter
   is visible to owning TaskHandlers.
3. Attempt arbitrary task/group/config/module names and a malicious
   participating-project `nvb.json`. Verify all are ignored or rejected before
   execution and the exact immutable target remains selected.
4. Tamper catalog identity, version, digest, task profile, input, structured
   event, and result payloads. Verify deterministic typed rejection.
5. Verify structured NVB results/events are returned as evidence but never
   parsed from styled terminal text or treated as authoritative state.
6. Verify environment values are task-declared and derived from validated lane
   context, `process.env` is not forwarded wholesale, and diagnostics redact
   values.
7. For the optional `NirvanaCmdNvbAdapter`, require a proven pinned-facade gap,
   the same explicit NVB target, argv-only Nirvana `cmd`, and no direct
   `node:child_process`.
8. Verify each retained executable is a manifest-declared leaf with containment,
   checksum, mode, cwd, argv, and environment enforcement and no workflow
   sequencing.
9. Challenge every foreground stdin/signal/PTY claim. Accept it only with
   pinned API and real integration proof; otherwise verify the product rejects
   or routes that operation to its accepted foreground owner.
10. Reproduce module line counts and responsibility inventories, then run the
    architecture, unit, adversarial, and integration checks.

## Acceptance Gate

Accept only if `LaneTaskRunner` is the sole application task boundary, the
immutable NVB target and typed catalog mapping cannot be caller-controlled,
structured evidence is validated, environment and leaf invocation are bounded,
all Nirvana claims are proven or explicitly gapped, no direct raw subprocess or
workflow shell survives, and unproved foreground semantics are not advertised.

## Rejection Correction Brief Rule

- `docs/spec/implementation/wt-runtime-distribution/review-batches/corrections/RT-05-correction-<N>.md`

## Required Disk Report

- `.local/agent-reports/wt-runtime-distribution/reviews/RT-05-central-runtime-invocation-adapter-review.md`

If accepted, create the acceptance commit.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.

## Always plan and make task lists
