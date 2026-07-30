# Review Batch LC-01 — Init Argument Resolution and Preflight Plan

Status: ⏳ Awaiting review
Reasoning: `R5`
Paired work brief: `work-batches/LC-01-init-argument-resolution-and-preflight-plan.md`
Implementation report: `.local/agent-reports/wt-lane-lifecycle/LC-01-init-argument-resolution-and-preflight-plan.md`

## Scope Verification

- [ ] `src/foundation/init-planner.ts` created with preflight plan construction, argument validation, prefix/scope/routing checks
- [ ] `src/commands/InitCommand.ts` created with CLI orchestration, rendering, and dry-run mode
- [ ] Init command parses slug, prefix, scope, and routing arguments correctly
- [ ] No destination creation occurs during preview/dry-run
- [ ] No product logic in `src/cli.ts`
- [ ] No foundation/CLI leakage between layers

## Required Independent Proof

1. Verify all argument combinations: slug with prefix, slug without prefix, scope JSON with valid/invalid shape, routing with valid/invalid values. Every permutation must produce the correct parse result or rejection.
2. Verify slug pattern validation: `^[a-z0-9][a-z0-9-]{0,62}$`. Test boundary lengths (1, 4, 63, 64, 100 characters), uppercase rejection, leading hyphen rejection, empty string rejection.
3. Verify prefix pattern validation: `^[a-z0-9][a-z0-9-]{0,15}$`. Test boundary lengths, character constraints, empty rejection.
4. Verify scope validation: valid JSON objects pass, invalid JSON rejected, missing required fields rejected, unknown fields accepted but warned.
5. Verify routing validation: valid routing values accepted, invalid routing values rejected with clear error message.
6. Verify ambiguous binding rejection: when multiple bindings match, error produced with resolution guidance.
7. Verify missing/invalid impl-pack path: clear error message, no destination directory created.
8. Verify dry-run premise: run `wt init --dry-run` with valid arguments, confirm preflight plan is printed, confirm no `.watchtower/` directory was created, confirm no filesystem writes occurred.
9. Verify exact preflight plan shape matches the contract defined in v1-contracts.md.
10. Run `nvb build` and `nvb test` independently. Confirm focused specs pass.
11. Verify `help/commands/init.hlp.json` exists and is registered in `help/help.json`.

## Required Reasoning Posture

The reviewer must reason from the governing specifications and current source,
not from the implementation report alone. Inspect every file independently.
Trace every argument path through the parser and planner. Verify that invalid
input always produces rejection without side effects. Verify that dry-run prints
the plan but writes nothing. Check for path escape and shell injection vectors
in all string arguments.

## Structural And Module-Size Acceptance

- Verify `init-planner.ts` is within the appropriate size band (target ≤220 lines, ceiling 400).
- Verify `InitCommand.ts` is a thin command (target ≤160 lines, ceiling 300).
- Confirm no `helpers`, `utils`, `common`, or `misc` modules were created.
- Verify `InitCommand` delegates to `init-planner` and does not duplicate validation logic.

## Required Review Packet

The review report must include: independently rerun proof commands and outcomes,
structural verification results, line-count verification, tracker/roadmap sync
status, and the acceptance or rejection decision.

## Acceptance Gate

- All hard-reject checklist items are clear.
- All argument combinations parse correctly.
- Invalid slug/prefix/scope/routing rejected with clear errors.
- Dry-run produces preflight plan with zero filesystem writes.
- No destination creation during preview.
- `nvb build` and `nvb test` pass with zero failures.
- Help fragment registered in `help/help.json`.
- Tracker and roadmap updated.
- No `.local/` artifacts staged.

## Reject Conditions

- Any argument validation bypass.
- Destination creation during dry-run.
- Path escape or shell injection in argument handling.
- Duplicated validation logic in command layer.
- Missing help fragment.
- Stale tracker/roadmap.
- Committed `.local/` artifacts.
- Implementation agent committed changes.
