# Batch CA-24 — Session Command Integration, Scale/Replay, and M6 Acceptance

> Mandatory v1 scope: [`../specification-resolution-batch-amendment.md`](../specification-resolution-batch-amendment.md), CA-24 ownership and full acceptance fixture.

## Authority And Status

Governing sources: all Watchtower v1 normative specs and schemas, `AGENTS.md`,
the mandatory engineering standard, the implementation map, accepted CA-01
through CA-23 evidence, and pack quality rules. No pack-local text may relax a
governing contract.
Required interfaces are normative in this pack's
`tui-interface-contracts.md §CA-24 Composition And Command Contract`.

Status: ❌ Not started
Depends on: CA-14 through CA-23 accepted
Unblocks: Pack 5/M6 acceptance and REL-01
Reasoning floor: implementor `R5`; reviewer `R5`

## Objective

Integrate the accepted session/TUI capabilities into thin public commands and
help, then independently prove the complete Pack 5 exit contract at realistic
pack/session scale. This batch adds no new coordinator, session, or TUI policy.
The entry, diagnostics, and operational acceptance contract is
`docs/spec/tui-operational-experience.md`.

## Owned Capabilities

- thin `wt coordinator ask` and `session` command/front-door integration
- create/attach/observe entry wiring and lifecycle-command parity
- command help fragments, registry, examples, JSON/human compatibility updates
- end-to-end Pack 5 fixtures, scale/replay harnesses, and M6 evidence
- v1 command-status and pack completion documentation after acceptance
- thin `wt doctor --tui` and explicit redacted support-report integration

Exact owned integration modules:

- `src/foundation/OperatorTuiFactory.ts`
- `src/foundation/TuiProcessBootstrap.ts`
- `src/commands/CoordinatorAskCommand.ts`
- `src/commands/CoordinatorSessionCommand.ts`
- `src/commands/CoordinatorSessionAttachCommand.ts`
- `src/commands/CoordinatorSessionListCommand.ts`
- `src/commands/CoordinatorSessionShowCommand.ts`
- `src/commands/CoordinatorSessionHistoryCommand.ts`
- `src/commands/CoordinatorSessionSuspendCommand.ts`
- `src/commands/CoordinatorSessionResumeCommand.ts`
- `src/commands/CoordinatorSessionCloseCommand.ts`
- `src/commands/CoordinatorSessionForkCommand.ts`
- `src/commands/CoordinatorSessionPinCommand.ts`
- `src/commands/CoordinatorSessionUnpinCommand.ts`
- `src/commands/CoordinatorSessionCompactCommand.ts`
- `src/commands/CoordinatorSessionExportCommand.ts`
- `src/commands/CoordinatorSessionPruneCommand.ts`
- `src/commands/CoordinatorSessionAmendmentCommand.ts`
- `src/commands/CoordinatorSessionBudgetCommand.ts`
- `src/commands/CoordinatorSessionApplyCommand.ts`
- `src/commands/CoordinatorHoldPlaceCommand.ts`
- `src/commands/CoordinatorHoldReleaseCommand.ts`
- `src/commands/CoordinatorHoldListCommand.ts`

Each command owns one corresponding lower-kebab help fragment under
`help/commands/` and one matching command spec under `spec/basic/commands/`.
CA-24 may update `help/help.json`, public command/schema registries, and v1
status docs only for these accepted surfaces. Scale/PTY integration fixtures
are owned under `spec/integration/coordinatorSession/`.

## Required Interfaces And Work

1. Commands validate/normalize, call one focused application capability, and
   map typed results through shared presentation. Keep `src/cli.ts` thin.
2. Wire bare session create+attach, attach without lifecycle mutation, resume
   as lifecycle-only, observe as M0-only, detach without close, and every
   operator-session lifecycle/history/proposal/hold/budget command already
   specified.
3. Preserve `ask`, human/JSON output, redirected-output behavior, ordinary
   commands, and explicit noninteractive authorization. TUI commands require a
   suitable TTY and fail with actionable fallback guidance.
4. Reconcile help, schemas, examples, completion/action registries, error/exit
   mappings, and `v1.md` status only for actually accepted behavior.
5. Exercise fresh and existing lanes, many sessions per lane, concurrent
   attachments, restart/replay, partial/interrupted turns, holds/proposals, and
   renderer failure through real packaged/global-install entry paths.
6. Prove 30/300/3,000/10,000-batch packs with a fixed affected dependency
   neighborhood; unrelated pack growth must not increase ordinary model
   context. Prove long-session/session-count growth with bounded query,
   viewport, working-set, and replay costs.
7. Run the `cli-session.md §14.6` responsiveness and two-hour soak obligations
   on a declared reference profile. Record rather than hide variance.
8. Prove routine M0 coordination invokes no model, capability floors never
   downgrade, every effect uses CA-10, advisory generation holds no lane lock,
   no full-pack/full-history fallback exists, and one repo/many lanes plus one
   lane/many repos remain isolated.
9. Wire explicit `--lane`, deterministic zero/one/many-lane entry, in-TUI
   session/lane switching, `doctor --tui`, and explicit support-report output.
   No session is created before lane selection and report generation is the
   only new diagnostic write.
10. Exercise real decision routing through the required `opencode-cli` adapter
    and, when installed, `hermes-cli`. Prove capability-first/economics-second
    selection, shared-pool accounting, stale-catalog invalidation, bounded
    result handling, cancellation, and fallback only to another already
    qualified endpoint. Hermes absence is recorded as an explicit skip.

## Exclusions

- No feature redesign, renderer substitution, new effect path, new public
  protocol, daemon, remote UI, or acceptance based only on implementor claims.
- No weakening a failed lower-batch gate to make end-to-end tests pass.

## Required Proof

- Every public command: success/error/empty, human/JSON where applicable,
  redirected input/output, TTY refusal, help, and completion parity.
- Create/attach/resume/observe/detach semantics and many-session cardinality.
- Explicit/zero/one/many-lane entry, switching guards, no unintended creation,
  and non-interactive ambiguity refusal.
- Pack scale, long-session replay, model-context byte/token envelopes, SQLite
  query plans/bounds, viewport memory, startup/input/view latency, idle CPU,
  steady memory, and two-hour soak.
- Crash/restart, duplicate/interrupted event replay, simultaneous attachments,
  explicit waits, renderer loss, stale proposals, and hold interleaving.
- Global-install tests for every RT-03 target and accepted CA-18 native matrix.
- Read-only TUI doctor checks and owner-only redacted report content/overwrite
  behavior, including proof that drafts, conversations, credentials,
  environment values, and journals are absent.
- Trace every operational matrix tuple and visual-catalog state to independent
  reproducible acceptance evidence.
- Complete authority audit: model-free M0, no direct mutations, one executor,
  no lane lock during model generation, no project `nvb.json`, no unbounded
  fallback.
- Concrete endpoint matrix: OpenCode qualified end to end; Hermes qualified
  when installed; no secret output; no stale profile reuse; no shared-quota
  overcount; no cost-based capability downgrade.
- `nvb build`, `nvb test`, `nvb dist`, architecture gates, line counts,
  documentation consistency, and clean artifact/ownership checks.

## Documentation And Report

Write
`.local/agent-reports/coordinator-automation/CA-24-session-command-integration-scale-replay-and-m6-acceptance.md`
with exact commands, environments, fixtures, measurements, context envelopes,
authority audit, docs changed, line counts, and unresolved failures. Do not
commit. Only the independent CA-24 reviewer may accept the batch and authorize
Pack 5/M6 completion.

## Independent Review

Use
`../review-batches/CA-24-review-session-command-integration-scale-replay-and-m6-acceptance.md`.
The reviewer reruns every command, scale, replay, performance, platform,
authority, structure, documentation, and package proof from independent
fixtures. Lower-batch reports are claims, not closure evidence.
