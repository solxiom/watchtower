# Agent Launch Prompt — TUI-EXP-01 Executor

You are executing a disposable architecture experiment, not implementing
Watchtower.

## Required Reading

1. `AGENTS.md`
2. `docs/spec/experiments/opentui-nirvana-smoke/TUI-EXP-01-nirvana-opentui-distribution-smoke.md`
3. `docs/development/engineering-and-review-standard.md`
4. `docs/spec/nirvana-integration-architecture.md`
5. `docs/spec/cli-session.md §14.4`
6. pinned Watchtower Nirvana manifests/packages and comparable Nira examples

Reasoning floor: `R4`.

## Mission

In `/home/kavan/Projects/watchtower-opentui-spike`, construct only the minimal
two-command Nirvana/OpenTUI control experiment, run the complete build/dist/
isolated-install/PTY matrix, and return `PASS`, `FAIL`, or `SPEC_BLOCKED`.

## Non-Negotiable Boundaries

- Use `sudo -u kavan -i` when not already `kavan`.
- Watchtower is read-only except the untracked `.local` evidence directory.
- Refuse a nonempty sandbox without explicit reuse authority.
- No Watchtower source, manifest, lock, help, or spec edit.
- No product/lane/model/provider/effect behavior.
- No React, Solid, Ink, JSX/TSX, Babel, Bun migration, or framework binding.
- No system-wide npm install; use the sandbox’s isolated prefix.
- No automatic sandbox deletion.
- Do not copy spike code into Watchtower.
- Do not claim CA-18 acceptance or implementation readiness.

## Required Method

Plan first. Audit pinned Nirvana/Nira APIs and dependencies before construction.
Declare exact files and bootstrap variants. Keep the CLI and commands thin,
OpenTUI imports in one adapter, and bootstrap in one experiment-only boundary.
Run every matrix case from the spec and record actual commands/output.

Write all required evidence under
`.local/agent-reports/experiments/TUI-EXP-01/`. Do not stage or commit
Watchtower changes. Leave the sandbox intact for an independent reviewer and
finish with its exact path, tree state, verdict, failures, and reproduction
commands.

## User / Ownership Rule

If you are not already running as `kavan`, use `sudo -u kavan -i` for commands
and ensure every edited file ends up owned by `kavan`.
