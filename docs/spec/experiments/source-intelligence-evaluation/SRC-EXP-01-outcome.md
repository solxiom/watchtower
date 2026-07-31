# SRC-EXP-01 — Accepted Outcome

Status: **Completed — `RESEARCH_BLOCKED`**

Date: 2026-07-31

This record captures the independently reviewed conclusion of SRC-EXP-01. It
does not copy raw outputs into the product specification and does not accept a
provider, dependency, architecture implementation, or implementation pack.

## Proven

- Both candidate repositories and Watchtower retained their pinned clean
  tracked trees; disposable clones/worktrees were independent and owner-local.
- All seven `NATIVE` tasks ran in fresh Hermes contexts. Recalculated totals
  were 171 API calls, 364,342 input tokens, 115,959 output tokens, 8,114,048
  cache-read tokens, and 8,594,349 reported total tokens.
- Native expected-evidence scores were T1 `4`, T2 `4`, T3 `3`, T4 `3`, T5
  `4`, T6 `4`, and T7 `2`. T7 therefore failed the structural acceptance
  floor; it examined the wrong docs-book handler and made a false dependency
  claim.
- Each of the three attempted `SYMBOL` model sessions made zero Serena tool
  calls. Their answers and usage are failed-route overhead, not indexed-mode
  results.
- A direct constrained Serena context advertised six read-only tools, but the
  direct canary used a schema-invalid parameter and the TypeScript semantic
  backend failed while attempting fixture-local dependency setup.
- Lexical canary separation, staged/unstaged view preparation, rename/delete/
  untracked overlays, mandatory exclusions, symlink non-following, ownership,
  process cleanup, and exact cleanup targeting passed for the fixture-copy
  machinery.

## Not proven

- The evidence does not establish why no provider tools reached the model.
  In particular, the proposed Hermes one-shot tool-snapshot ordering cause is
  not proven by preserved outbound-request evidence.
- Provider-semantic worktree isolation, dirty/stale equivalence, restart
  behavior, hard query bounds, schema overhead, returned source bytes,
  complete-file reads, corrections, and accepted-outcome cost were not
  measured.
- Runs overlapped in time, so latency results are not comparable.
- The experiment cannot establish quality improvement, token savings,
  break-even reuse, provider rejection, or provider adoption.

## Binding consequence

Source intelligence remains a plausible but unvalidated future capability.
No Watchtower source-intelligence implementation or Serena dependency may be
planned from SRC-EXP-01. A corrected experiment must pass an independently
reviewable provider-readiness gate before it can spend tokens on comparative
tasks or calculate adoption metrics.

The correction is
[SRC-EXP-02](SRC-EXP-02-corrected-provider-evaluation.md).
