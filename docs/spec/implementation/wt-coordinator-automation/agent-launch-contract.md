# Coordinator automation Agent Launch Contract

Status: **Mandatory direct dependency of every work and review launch prompt**

This contract supplies the common standalone execution and review method. A
prompt is dispatchable only when it links directly here and also states its
batch-specific title, dependencies, ownership, proof, reasoning floor, report
path, correction path, tracker responsibility, and handoff/verdict authority.

## Authority and required reading

Read 'AGENTS.md', 'docs/development/engineering-and-review-standard.md',
'docs/spec/v1.md', 'docs/spec/v1-contracts.md',
'docs/spec/nirvana-integration-architecture.md',
'docs/spec/v1-implementation-map.md', the planning-remediation amendment, this
pack's quality rules, the exact batch brief, accepted predecessor source and
evidence, and the current tracker. Normative specifications and the accepted
map override illustrative implementation names.

## Foundation layout guardrails (mandatory)

Any batch that touches `src/foundation/`, `src/commands/`, `src/run.ts`, or foundation architecture specs must read and apply [Foundation agent guardrails](../../architecture/foundation-agent-guardrails.md) in full before editing or reviewing.

- **Implementers** place code in the correct capability/domain tree, import only through allowed barrels, keep the root foundation barrel within policy, update matching `*Architecture.spec.ts` gates when inventories change, and prove compliance with `nvb build && nvb test` before handoff.
- **Reviewers** independently verify guardrail compliance from source and diff. A foundation layout violation (**FLG-01** … **FLG-10**) is an immediate **reject** with a numbered correction brief — never accept with a follow-up promise.
- **Coordinators** do not dispatch review when the implementation report omits foundation layout proof required by the guardrails and [pre-handoff-self-audit.md §5](../pre-handoff-self-audit.md).

## Command layout guardrails (mandatory)

Any batch that **adds or moves** CLI modules must read and apply [Command agent guardrails](../../architecture/command-agent-guardrails.md) and [Command module architecture](../../architecture/command-module-architecture.md).

- **New** command, options, or presenter modules land under `src/commands/<group>/` — the flat root is **frozen** (ratchet).
- **Reviewers** **reject** on **CLG-01** … **CLG-10** with correction briefs.

## Mandatory implementation method

1. Confirm the exact checkout/worktree, branch/commit, accepted dependencies,
   current seal revision, resource claims, and batch scope before editing.
2. Build an ownership/dependency map from normative contracts to exact public
   types, focused foundation owners, thin command/TaskHandler fronts, tests,
   help/schema/manifests, reports, and tracker rows.
3. Inspect pinned Nirvana packages and comparable Nira usage. Record selected
   APIs and every specific 'NIRVANA_API_GAP'; do not build local infrastructure
   when a conforming pinned API exists.
4. Enumerate invariants, invalid states, failure precedence, path/trust input,
   stale/corrupt state, replay/idempotency, concurrency/re-entrancy, unsupported
   behavior, and one plausible shortcut that focused proof must reject.
5. Parse external data as 'unknown' into closed contracts. Broad 'any',
   trust-boundary casts/non-null assertions, mutable globals, hidden repair,
   command-local policy/effects, and full-pack/history fallbacks are rejected.
6. Keep 'src/cli.ts', commands, and TaskHandlers thin. Route substantial
   deterministic work through the immutable packaged NVB catalog and
   'LaneTaskRunner'; mutation uses current-state validation and the sole effect
   executor. Never edit a participating repository's 'nvb.json'.
7. Split responsibilities before warning thresholds. Report physical file,
   function, and constructor counts plus cohesion inventories required by the
   mandatory engineering matrix.
8. Run batch-specific unit/integration/adversarial proof, 'nvb build',
   'nvb test', and dist/relocation/native/PTY/replay proof whenever the owned
   boundary requires it. Record exact commands, versions, totals, outcomes,
   skips, environmental limits, and final Git status.
9. Synchronize every owned public contract, help fragment/registry, schema,
   manifest, generated aggregate, normative document, report, and tracker row.
   Never stage '.local', 'build', 'dist', dependencies, or lane runtime.
10. The implementer does not commit or issue a verdict. Emit the durable
     handoff only after every gate passes; otherwise remain in the preserved
     session and report the precise blocker.
11. Before emitting handoff, run the full self-audit at
    `docs/spec/implementation/pre-handoff-self-audit.md`. Every gate must be
    PASS. The implementation report must include the completed PASS/FAIL matrix
    and the hard-reject scan ("all false"). A handoff without this evidence is
    incomplete; the coordinator must not dispatch review.

## Mandatory independent review method

1. Verify reviewer independence, exact tested checkout/commit, handoff event,
   report path, diff scope, ownership, and accepted predecessor evidence.
2. Reconstruct behavior from source/spec/artifacts rather than trusting the
   implementation report. Re-run every acceptance-critical command and add
   independent negative/counterexample cases.
3. Audit scope, layering, Nirvana-first use, NVB/task/facade boundaries,
   size/cohesion, contracts/failure behavior, state/effect/security, tests and
   packaging, help/schema/spec/tracker synchronization, ownership, and hygiene.
4. Any failed mandatory gate requires 'reject'. Do not repair product work.
   Write the exact correction surface and keep the same implementer/reviewer
   lineage available.
5. Emit exactly one durable 'accept', 'reject', or 'skip'. Only a reviewer may
   create the acceptance commit after all gates pass; publication remains a
   separate coordinator effect.

## Reasoning and context integrity

The declared batch class is a floor for both execution and review. The selected
agent must retain this complete contract, the batch brief, governing specs,
current source, predecessor evidence, and proof output in context. Do not
compress away safety instructions or replace proof with narrative confidence.

## NPM is installed through nvm

Use the npm and node installed through nvm.

+ load /home/kavan/.nvm/nvm.sh as kavan

## RT-08 requires you run as kavan

Do correctly perform `nvb dist` make sure you are running as kavan through `sudo -u kavan -i` and using
nvm installed node and npm