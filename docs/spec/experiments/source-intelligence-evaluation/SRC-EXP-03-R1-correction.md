# SRC-EXP-03-R1 — Corrected Installed-Host Readiness Rerun

Status: **Ready for disposable execution; not product implementation**

This correction inherits every safety, eligibility, canary, measurement,
verdict, and completion rule from
[SRC-EXP-03](SRC-EXP-03-host-route-readiness.md), except where this document is
more specific.

## 1. Why a correction is required

Independent review found that the first run:

- froze `candidate-set.json` before its later `host-inventory.json`, so the
  chronology did not prove a complete pre-call inventory;
- incorrectly recorded pre-existing Claude Code 2.1.219 as absent despite its
  embedded read-only structural LSP contract; and
- stopped after marking OpenCode eligible without attempting or proving the
  required structural-only outbound schema/capture boundary.

No model call or source view existed, so the first run is preserved as
incomplete evidence rather than a route result.

## 2. Separate evidence boundary

Correction fixture:

```text
/home/kavan/Projects/watchtower-source-route-spike-03-r1
```

Correction reports:

```text
.local/source-intelligence-experiment/SRC-EXP-03-R1-report.md
.local/source-intelligence-experiment/SRC-EXP-03-R1-review.md
```

The original SRC-EXP-03 fixture/reports are read-only audit evidence. The
correction does not overwrite, copy configuration from, or clean them.

## 3. Mandatory inventory order and chronology

Rebuild the complete installed-host inventory. OpenCode 1.18.10 and Claude Code
2.1.219 are mandatory material candidates and cannot be classified absent.
Codex, Cursor, Hermes, and other installed hosts retain normal discovery rules.

Write and seal `host-inventory.json` first. Only afterward derive and seal
`candidate-set.json`; both record hashes, monotonic/wall timestamps, executable
identity, version, capability evidence, eligibility reasons, and zero model
calls. Retain a sanitized pre-freeze discovery transcript and request/network
ledger. Candidate-set time must be later than inventory time.

## 4. Required route order

Evaluate sequentially:

1. OpenCode host-native experimental structural LSP route;
2. Claude Code embedded read-only structural LSP route; and
3. any other frozen eligible route in original discovery order.

Embedded package contracts and local `tools list` output establish candidate
semantics only. They do not establish model-visible tools.

For each eligible route, the runner must attempt the pre-model proof. It may
classify `RESEARCH_BLOCKED` only with retained evidence that exact sanitized
outbound structural-only schema capture, fixture-local isolation, or covered
route authentication cannot be established safely. A planned proxy or empty
evidence directory is incomplete execution, not a blocker.

When pre-model proof passes, run the single bounded canary. When it fails,
record the route verdict and continue to the next frozen candidate unless a
shared safety boundary makes further execution unsafe.

## 5. Model and mutation limits

Use only an already covered/free account route. Never purchase capacity or
print/copy credential values into reports. One accepted model request maximum
per eligible route; an infrastructure retry is allowed only when independent
evidence proves no request was accepted.

No route may expose shell, generic file/read/grep, edit/write, web, or unrelated
tools in the canary request. No host/provider cache or metadata may enter a
sealed source view. All processes/listeners terminate between candidates.

## 6. Review

The independent reviewer applies the original SRC-EXP-03 review contract plus
these correction findings. It must verify inventory chronology/completeness,
explicit Claude eligibility, actual OpenCode pre-model attempt, exact outbound
tools, per-route call ledger, and preservation of the original experiment.
