# Shared Command Review Reject Conditions

Status: **Mandatory insert for every review batch that adds or moves CLI command modules**
Authority: [command-agent-guardrails.md](../architecture/command-agent-guardrails.md)
Date: 2026-08-04

Apply via the pack's `agent-launch-contract.md` **Command layout guardrails** section.

## Standard reject conditions (commands)

Reject with a numbered correction brief when **any** of the following hold:

- **CLG-01** — new `.ts` at `src/commands/` root (other than `index.ts`)
- **CLG-02** — command module in wrong group or flat root when a group applies
- **CLG-03** — options/presenter not colocated with its command group
- **CLG-04** — cross-group import between command directories
- **CLG-05** — generic helper bag under `commands/`
- **CLG-06** — directory-shadow layout (`FooCommand.ts` beside `foo/`)
- **CLG-07** — foundation import bypass from command code
- **CLG-08** — group barrel double-registers commands
- **CLG-09** — `commandLayoutArchitecture` or `commandImportArchitecture` gate fails
- **CLG-10** — implementation report omits command layout proof

## Review matrix row

| Gate | Verdict |
|------|---------|
| Command layout and colocation guardrails | PASS / FAIL / N/A |

`FAIL` → correction brief with **CLG-** codes. No accept-with-follow-up.
