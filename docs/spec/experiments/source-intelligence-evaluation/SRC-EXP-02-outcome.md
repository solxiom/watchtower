# SRC-EXP-02 — Accepted Outcome

Status: **Completed — `REJECT_PROVIDER`**

Date: 2026-07-31

Rejected integration scope:

```text
Serena 0.1.4 @ d5f90710676b6a7cacc450f59005b4934c49b6db
through Hermes Agent 0.18.2 @ 36f2a966
using the recorded OpenCode Zen deepseek-v4-flash-free route
```

This rejects only that exact provider/host integration. It does not reject
provider-neutral source intelligence or authorize another candidate.

## Readiness evidence

- Fixture-local Serena and its TypeScript language server became operational.
- A live constrained provider exposed only three intended read-only semantic
  tools. Schema-valid direct queries correctly separated staged and unstaged
  worktree canaries, resolved a real TypeScript symbol/body, returned bounded
  references, and reported malformed/unsupported operations honestly.
- The exact sanitized outbound model request contained `tools: []`. The fresh
  model context made zero provider calls, reported the symbolic tool
  unavailable, returned no canary, and had no invocation ID to correlate.
- Serena created `.serena/cache/...document_symbols_cache...pkl` inside both
  sealed disposable canary worktrees. Ignoring those files in Git did not make
  the provider-caused writes compliant with the declared cache boundary.
- The runner applied the hard stop. No T1–T7 comparative prompt ran, so there
  is no source-byte, quality, token-saving, latency, amortization, or adoption
  evidence.
- Original Watchtower, Nirvana, and daily-nvb-plugins tracked trees remained
  clean. Provider processes/listeners terminated, and retained evidence is
  owner-local.

The evidence proves the absent outbound tools and sealed-view cache writes. It
does not prove a tool-snapshot race, initialization/configuration ordering, a
general Hermes defect, or a general Serena semantic defect.

## Binding consequence

Watchtower must not select, package, recommend, or plan Serena 0.1.4 through
this Hermes 0.18.2 route. A future experiment needs a new ID and must change a
material candidate dimension—provider, host integration, or safely observable
tool transport—while retaining the SRC-EXP-02 readiness gate. Repeating the
same integration without new evidence is not research progress.

No source-intelligence implementation pack may begin until another candidate
passes readiness and independently earns `ADOPT_BASELINE` or `ADOPT_LIMITED`.
