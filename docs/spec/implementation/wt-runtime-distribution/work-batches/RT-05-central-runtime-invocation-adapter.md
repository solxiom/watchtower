# Batch RT-05 — Lane Task Runner And Leaf Invocation Adapter

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
Phase: Packaged task invocation, managed links, and smoke proof
Depends on: RT-02 accepted (task catalog/profile contracts), RT-03 accepted
(packaged NVB runtime), RT-04 accepted (immutable catalog), RM-01 accepted
(contract kernel from Pack 1)

**Required implementor reasoning class:** `R5`
**Class rationale:** this batch establishes the only internal NVB invocation
boundary and the narrower leaf-executable boundary beneath focused
TaskHandlers. Catalog pinning, action authorization, environment isolation,
structured evidence, compatibility fallback, and foreground-I/O gaps interact
at a security-sensitive boundary. The class is a floor.

## Objective

Implement `LaneTaskRunner`, its Nirvana NVB adapter, and the narrow leaf
invocation adapter used by owning TaskHandlers. Application services select a
typed catalog action; the runner resolves that action through the lane-pinned
task profile and invokes only the explicit immutable Watchtower NVB
configuration/module target. No command or application service spawns a script
or invokes `nvb` directly.

## Required Work

1. Define focused contracts in `src/contracts/laneTasks.ts`:
   - a closed `LaneTaskAction` vocabulary owned by the accepted catalog;
   - `LaneTaskRequest`, including lane identity, action, validated typed input,
     immutable catalog/profile pins, cwd policy, and execution mode;
   - `LaneTaskResult`, preserving structured NVB events, typed task result,
     exit/failure classification, and redacted diagnostic metadata;
   - no arbitrary task name, module path, command string, environment map, or
     shell path supplied by a command or caller.

2. Implement `LaneTaskRunner` as the application port and
   `NirvanaLaneTaskRunner` as its preferred adapter in PascalCase modules under
   `src/foundation/`:
   - resolve an action through the validated lane task profile;
   - verify catalog identity/version/digest and profile/runtime pins before
     invocation;
   - pass explicit NVB configuration and module targets from the immutable
     runtime root, never implicit cwd discovery;
   - invoke the pinned Nirvana `nvb` facade with explicit cwd and validated
     arguments;
   - subscribe to and normalize structured NVB events/results rather than
     parsing terminal text;
   - return a typed result without rendering, product-policy decisions, or
     authoritative journal writes;
   - reject unknown actions, undeclared tasks, target/path escapes, pin drift,
     malformed inputs/results, and attempts to select a participating
     repository's `nvb.json`.

3. Perform and record a pinned Nirvana API audit before fixing the adapter
   shape. Prove the exact facade symbols and comparable Nira/Nirvana usage for
   explicit target selection, cwd, arguments, event/result collection,
   environment isolation, cancellation/signal forwarding, stdin, and PTY
   behavior. A missing capability is a documented `NIRVANA_API_GAP`, not
   permission to silently invent semantics.

4. If the pinned facade cannot supply a required v1 non-interactive semantic,
   implement the smallest `NirvanaCmdNvbAdapter` behind `LaneTaskRunner`, using
   the Nirvana `cmd` facade to invoke the same pinned NVB target with explicit
   argv and no shell interpolation. Direct `node:child_process` use is
   forbidden. Do not claim foreground stdin/signal/PTY support without proof;
   keep foreground lifecycle paths on their accepted direct product owner
   until that proof exists.

5. Implement `LeafRuntimeInvoker` for the exceptional cataloged executable
   leaves used inside owning TaskHandlers:
   - accept only a catalog-resolved leaf descriptor and typed input;
   - validate containment, checksum, executable mode, cwd policy, and the
     task-declared environment allowlist;
   - use the audited Nirvana command API with argv arrays;
   - preserve typed exit/signal information and redact environment values;
   - forbid workflow sequencing, action selection, rendering, and authority
     decisions at this layer.

6. Build invocation context from resolved lane/install/profile data. Never
   forward `process.env` wholesale and never infer authority from an
   environment variable. Environment keys and value sources must be declared
   per task/leaf in the catalog rather than accepted merely because they begin
   with `WT_`.

## Expected Ownership

- `src/contracts/laneTasks.ts` — type-only request/result/action contracts
- `src/foundation/LaneTaskRunner.ts` — application port
- `src/foundation/NirvanaLaneTaskRunner.ts` — preferred Nirvana NVB adapter
- `src/foundation/NirvanaCmdNvbAdapter.ts` — optional, only for a proven pinned
  facade gap
- `src/foundation/LeafRuntimeInvoker.ts` — cataloged leaf boundary
- focused catalog/profile/context validators rather than a generic runtime
  helper bag

## Tests And Evidence

- Include the Nirvana API audit and explicit capability matrix.
- Prove every public action maps to exactly one allowed catalog task and an
  arbitrary task name cannot cross the port.
- Prove configuration/module targets are explicit and immutable; change cwd
  and add a malicious repository `nvb.json` to demonstrate it is ignored.
- Prove catalog/profile version and digest mismatches fail before invocation.
- Prove typed input and result schemas at the boundary.
- Prove structured NVB events/results are retained without terminal-text
  parsing or becoming authoritative lane state.
- Prove no direct `nvb` subprocess or `node:child_process` call exists outside
  the accepted adapter, and that an optional fallback uses Nirvana `cmd`.
- Prove task/leaf environment isolation, secret redaction, cwd rejection,
  executable containment/checksum/mode checks, and argv-only leaf execution.
- Prove interactive behavior is either supported by pinned API evidence or
  explicitly rejected/routed to the accepted foreground lifecycle owner.
- Run architecture, unit, adversarial, and integration checks.

## What Must Not Change

- Do not let commands or application services call NVB, Nirvana `cmd`, or a
  leaf executable directly.
- Do not use direct `node:child_process`, shell command strings, or implicit NVB
  target discovery.
- Do not pass `process.env` wholesale or log environment values.
- Do not expose arbitrary task, group, config, module, or executable selection.
- Do not make NVB events or logger output authoritative state.
- Do not introduce managed-link or smoke-proof logic

## Review Procedure Highlights

1. Reproduce the pinned Nirvana API audit against installed source/types and
   comparable ecosystem usage.
2. Trace all NVB, command, subprocess, and executable calls. Confirm
   `LaneTaskRunner` is the only application boundary and leaves are reached
   only through their owning TaskHandlers.
3. Run malicious-cwd, alternate-`nvb.json`, arbitrary-task, pin-drift,
   path-escape, environment-injection, malformed-event, and malformed-result
   counterexamples.
4. Verify exact explicit NVB targets and structured event/result mapping.
5. Verify the fallback, if present, is justified by a named API gap, invokes the
   same target via Nirvana `cmd`, and does not expand scope.
6. Verify no unproved foreground stdin/signal/PTY claim enters the public
   contract.
7. Verify module ownership, naming, and size gates independently.
