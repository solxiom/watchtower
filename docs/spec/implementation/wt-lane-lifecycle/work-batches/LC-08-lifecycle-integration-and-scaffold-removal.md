# Work Batch LC-08 — Lifecycle Integration and Scaffold Removal

Status: ❌ Pending
Implementation reasoning: R3
Review reasoning: R4
Depends on: LC-07, RM-10
Workload: medium

## Scope

Create an init→status→watch/doctor end-to-end fixture that proves the complete
lane lifecycle works. Prove rollback works (init then destroy cleanly). Remove
all hello scaffold artifacts: delete `src/commands/HelloCommand.ts`, remove
from command index, remove hello help fragment, remove hello test. Ensure
`nvb build` passes after removal. Verify no hello references remain in the
codebase.

## Specification References

| Reference | Section | Topic |
|-----------|---------|-------|
| v1.md | §7 | Lane layout and manifests — verify init creates expected structure |
| v1.md | §8 | Config strict subset — verify config is written correctly |
| v1.md | §11.1 | Init command — verify init behavior |
| v1.md | §11.3 | Status command — verify status reads created lane |
| v1.md | §11.4 | Watch command — verify watch preflight and exec |
| v1.md | §11.7 | Doctor command — verify doctor runs on created lane |
| v1.md | §15 | Rollback and recovery — verify init→destroy leaves no residual state |
| v1-contracts.md | §8 | Exit codes for init, status, watch, doctor |
| architecture.md | §6.3 | Runtime execution flow — watch integration proof |

## Owned Files

### New specification

- `spec/e2e/lifecycle.spec.ts` — end-to-end fixture: init→status→watch/doctor→rollback

### Files to modify

- `src/commands/index.ts` — remove `HelloCommand` import and registration
- `help/help.json` — remove hello entry

### Files to delete

- `src/commands/HelloCommand.ts` — scaffold command
- `help/commands/hello.hlp.json` — scaffold help fragment
- `spec/commands/HelloCommand.spec.ts` — scaffold test (if present)

## Dependencies

### From this pack

- **LC-07** (doctor): doctor must be functional for end-to-end fixture
- **LC-06** (watch): watch preflight must work for watch portion of fixture
- **LC-05** (coordinator baselines): policies and index must seed correctly
- **LC-04** (bindings/registration): bindings must be written during init
- **LC-03** (lane store): transactional layout must work end-to-end
- **LC-02** (pack validation): pack must validate during init
- **LC-01** (init planner): init preflight must work

### From pack 1 (wt-read-model)

- **RM-10** (status command): status must be functional for status portion of fixture

## Implementation Steps

1. **Create `spec/e2e/lifecycle.spec.ts`**
   - Create a temporary control home and workspace directory
   - Run `wt init` with valid arguments (slug, prefix, scope, routing, workspace)
   - Verify lane directory layout matches expected structure
   - Verify `lane.json` exists and passes schema validation
   - Verify `install.json` exists and passes schema validation
   - Verify `lane.config.env` exists with correct keys
   - Run `wt status` and verify output shows the created lane
   - Run `wt watch` in a way that allows test observation:
     - Start watch briefly, verify it execs without preflight errors
     - Terminate with SIGINT, verify clean exit
     - Verify no orphaned processes
   - Run `wt doctor` and verify:
     - Returns exit code 0 (no failures)
     - All expected check categories present
     - Lane checks pass
   - **Rollback proof:**
     - Run `wt init` with invalid arguments (e.g., invalid slug, missing pack)
     - Verify exit code indicates failure
     - Verify no lane directory was created (no residual state)
     - Verify no `.watchtower/` directory was left in an inconsistent state
   - Clean up temporary directories

2. **Delete scaffold artifacts**
   - Delete `src/commands/HelloCommand.ts`
   - Delete `help/commands/hello.hlp.json`
   - Delete `spec/commands/HelloCommand.spec.ts` (if present)
   - Delete any hello-related runtime-nvb tasks (if present)

3. **Update `src/commands/index.ts`**
   - Remove `import HelloCommand from "./HelloCommand";`
   - Remove `HelloCommand` from the command registration array or map

4. **Update `help/help.json`**
   - Remove the hello entry
   - Verify no dangling references

5. **Audit for remaining hello references**
   - Search entire codebase for `hello` (case-insensitive) in source, help, spec, and config files
   - Remove any remaining hello references:
     - `help/commands/README.md` — remove hello section if present
     - `runtime-nvb/` — remove hello runtime tasks if present
     - `docs/spec/` — update any doc references to hello
   - Verify no directory contains hello artifacts

6. **Verify build passes**
   - Run `nvb build` — must pass with zero errors
   - Run all Jasmine tests — must pass with zero failures
   - Run `git status --short` — no unexpected artifacts

## Exclusions

- No init implementation changes — init is owned by LC-01/LC-03
- No doctor implementation changes — doctor is owned by LC-07
- No watch implementation changes — watch is owned by LC-06
- No status implementation changes — status is owned by RM-10
- No removal of any real command or foundation module
- No removal of anything beyond hello scaffold artifacts

## Required Proof

### Focused
- End-to-end fixture: init creates a valid lane
- End-to-end fixture: status reads the created lane correctly
- End-to-end fixture: watch preflight passes on created lane
- End-to-end fixture: doctor returns pass/warn (no failures) on created lane
- Rollback proof: failed init leaves no residual state
- Rollback proof: init fails atomically (no partial directory)
- Rollback proof: destroy removes all lane artifacts cleanly
- `src/commands/HelloCommand.ts` deleted
- `help/commands/hello.hlp.json` deleted
- Hello entry removed from `help/help.json`
- Hello entry removed from `src/commands/index.ts`
- No `hello` string references in `src/`, `help/`, `spec/`, `runtime-nvb/` files
- (outside of intentional documentation references)

### Regression
- `nvb build` passes after scaffold removal
- All Jasmine suites pass
- No test failures caused by missing hello artifacts

### Architecture
- No product logic in `src/cli.ts`
- Command index cleanly composed
- Help registry cleanly composed

## Required Review Packet

The implementation report must include:
- End-to-end fixture execution output (init, status, watch, doctor)
- Rollback proof execution output
- List of every deleted hello artifact with file paths
- Audit results: zero hello references remaining in codebase
- `nvb build` output proving build passes
- Jasmine test output proving all tests pass
- Final `git status --short` showing only this batch's changes

## Help and Documentation

- Remove hello help fragment: `help/commands/hello.hlp.json`
- Update `help/help.json`: remove hello entry
- Update `help/commands/README.md` if it references hello

## Handoff Notes

After acceptance, the Watchtower codebase contains zero scaffold/hello artifacts.
The end-to-end lifecycle fixture proves init→status→watch/doctor works as a
complete chain. Pack 4 (wt-upgrade-knowledge) and Pack 5 (wt-coordinator-automation)
build on the proven lifecycle foundation.
