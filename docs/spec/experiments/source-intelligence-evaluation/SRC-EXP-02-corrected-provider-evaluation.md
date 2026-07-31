# SRC-EXP-02 — Corrected Provider Readiness and Comparative Evaluation

Status: **Ready for independent preparation and disposable execution; not product implementation**

Governing design: [source-intelligence-draft.md](../../source-intelligence-draft.md)

Predecessor: [SRC-EXP-01 outcome](SRC-EXP-01-outcome.md)

## 1. Decision question

Can one audited TypeScript/JavaScript S1/S2 provider first prove that its
semantic tools are safe, operational, and visible to the selected agent host,
then improve quality-preserving cost per accepted Nirvana task against native
retrieval under comparable conditions?

SRC-EXP-02 corrects SRC-EXP-01; it is not a continuation of its incomplete
measurements. It creates a new fixture, reruns both modes, and has two hard
stages:

```text
PROVIDER_READINESS
  ├── fail conclusively ──→ REJECT_PROVIDER
  ├── cannot decide safely → RESEARCH_BLOCKED
  └── pass + attestation ──→ COMPARATIVE_EVALUATION
                                  └── independent review → verdict
```

No comparative prompt or billable comparison call may be sent before the
readiness attestation is complete.

## 2. Authority, roles, and fixture

Roles are separated:

- an independent preparer fixes repository identities, task prompts, hidden
  expected evidence, scoring, execution schedule, and its digest commitment;
- one blinded runner performs readiness and, only after it passes, evaluation;
- one independent reviewer receives the hidden evidence after execution and
  reconstructs the result from raw records; and
- the operator alone may later approve a specification adoption amendment.

Fixture root:

```text
/home/kavan/Projects/watchtower-source-intelligence-spike-02
```

SRC-EXP-01's fixture is immutable audit evidence and is not used as mutable
state, a provider cache, an answer source, or an index seed. SRC-EXP-02 uses
disposable no-hardlink clones/worktrees pinned to independently recorded full
commit and tree OIDs. Active project worktrees, project dependencies, global
agent configuration, and global provider state are outside the mutation scope.

Allowed Watchtower writes are only:

```text
.local/source-intelligence-experiment/SRC-EXP-02-report.md
.local/source-intelligence-experiment/SRC-EXP-02-review.md
```

Both reports and the complete fixture are owner-only and owned by `kavan`.
Nothing is committed by the runner or reviewer.

Execution may begin only from a clean committed Watchtower tracked tree. The
runner records its commit/tree before any fixture mutation; uncommitted
specification changes make the experiment `RESEARCH_BLOCKED` rather than an
excuse to include them as undocumented protocol.

## 3. Candidate declaration

The first candidate is Serena `0.1.4` at exact tag commit
`d5f90710676b6a7cacc450f59005b4934c49b6db`, because SRC-EXP-01 evaluated that
identity incompletely. Substitution, upgrade, patching, or adding a second
provider after seeing a failure creates another experiment ID.

Before installation the runner records:

- agent host, model, provider route, account class, version, and reasoning;
- provider source/package digest, runtime, installer, and language-server
  dependency identities;
- install, cache, home, configuration, log, process, transport, and port paths;
- network endpoints and whether traffic is dependency download, model traffic,
  telemetry, or source transfer;
- project/user configuration and plugin-loading behavior;
- filesystem roots and environment keys visible to the provider;
- exact mutation and cleanup targets; and
- methods for outbound tool-schema capture and resource accounting.

Dependency downloads require prior operator authorization and are included in
cost. Source upload, telemetry containing source, project package installation,
project build/plugin execution, or global configuration mutation is forbidden.

## 4. Stage A — provider readiness

### 4.1 Read-only schema

The provider context exposes only the minimum retrieval operations needed by
the evaluation: symbol outline/search, symbol resolution/body, references, and
implementations when genuinely supported. Tool names and JSON Schemas are read
from the live provider; parameter names are never copied from memory.

The schema must exclude edit/create/delete/rename, shell/process, arbitrary
file read/search, memory, onboarding, project activation, configuration,
restart, and unrestricted provider operations. The runner stores canonical
schema bytes and a digest before any model call.

### 4.2 Direct semantic canary

Against two independently prepared worktree views at one base commit:

- view A contains only its unstaged harmless canary;
- view B contains only its staged harmless canary;
- a schema-valid direct provider call resolves A only in A and B only in B;
- a known real TypeScript symbol resolves with its declaration/body; and
- a bounded reference query returns a structurally valid response or an
  honest declared unsupported result.

The TypeScript semantic backend and all runtime dependencies must be ready
before these calls. A provider-triggered package-manager action is recorded as
provider runtime behavior and may write only under the declared fixture-local
provider home. Candidate repository and view hashes are checked before/after.

### 4.3 Model-visible schema proof

The selected host must safely expose, before request transmission, the exact
canonical tool names and schemas attached to the outbound model request. The
evidence may come from a documented host export/debug boundary or a sanitized
fixture-local transport capture. It must not retain credentials, unrelated
messages, hidden reasoning, or source excerpts.

Required proof:

1. the captured outbound request contains the intended provider tools;
2. their canonical schema digest matches the approved readiness schema;
3. no native filesystem, shell, mutation, or undeclared provider tool is
   present in the indexed canary context;
4. one fresh model context invokes the provider at least once;
5. provider and host records correlate the same invocation ID; and
6. the answer identifies the correct view-specific canary without pseudo-shell
   instructions or native fallback.

Direct `list-tools` success is insufficient. A session database with zero tool
calls is a failure. If exact outbound schema cannot be captured safely, the
experiment is `RESEARCH_BLOCKED`; the runner may not infer host ordering.

### 4.4 Lifecycle, limits, and side effects

Readiness also proves:

- startup, first semantic readiness, query, shutdown, and restart timings;
- finite CPU, RSS, disk, process count, filesystem writes, and a 10-second
  query timeout;
- no listener unless the declared transport requires one, with exact binding;
- clean provider/language-server termination after restart and final stop;
- after the preparer seals each declared canary/patch view, no provider- or
  host-caused write to original repositories, disposable candidate worktrees,
  global homes/configuration, or Watchtower tracked files;
- no source/network transfer beyond authorized model requests; and
- declared errors for malformed symbols and an unsupported operation.

Record/page/byte enforcement may be wrapper-emulated for the experiment only
when returned bytes are independently measured and excess results are visibly
truncated. Such evidence proves the proposed broker discipline, not native
provider enforcement.

### 4.5 Readiness attestation and stop rule

The runner writes a machine-readable readiness attestation containing every
check, evidence path/digest, exact schema digest, provider/host identity,
source views, resource measurements, and `PASS`/`FAIL` result. The attestation
is immutable for the remaining run.

Comparative evaluation is permitted only when every required check is `PASS`.
Failure handling is:

- `REJECT_PROVIDER` when a reproducible candidate property is unsafe,
  incompatible, mutating, leaking, unbounded, or incapable of the declared
  TypeScript semantics; or
- `RESEARCH_BLOCKED` when environment, authorization, host observability, or
  incomplete evidence prevents a safe conclusion.

No failed canary call is counted as indexed task cost savings.

## 5. Stage B — comparative evaluation

### 5.1 Modes

| Mode | Available retrieval |
|------|---------------------|
| `NATIVE` | Git, `rg`, and bounded file/line reads through the host's normal read-only tools |
| `INDEXED` | Only the readiness-approved provider retrieval schema; no shell, native files, edit tools, or hidden fallback |

Both modes use the same agent host, model route, model version, reasoning,
account class, prompt, repository/view, acceptance rubric, and declared output
request. Any provider-native model change or account throttling is recorded and
invalidates the affected pair unless the protocol's predeclared infrastructure
retry applies.

### 5.2 Task set and T7 correction

The independent preparer pins the same seven task classes used by SRC-EXP-01:

1. CLI-to-runtime path;
2. interface-change reference completeness;
3. real cross-repository contract path;
4. bounded public-symbol impact candidates;
5. review of a deliberately incomplete multi-file patch;
6. exact single-file localization control; and
7. difficult dynamic-import and package-export/ambient-declaration boundaries.

T7 must explicitly name `docs:book:all` and
`DocsBookAllBuildPluginHandler`, avoiding SRC-EXP-01's accidental substitution
of the similarly named build handler. It tests the dynamic-import boundary and
the runtime package-export versus local ambient-declaration boundary. Neither
mode receives expected paths, relationships, or scoring answers.

Before execution, the preparer writes a public execution bundle containing
the exact prompts, scoring rules without answers, budgets, and schedule. A
separate hidden expected-evidence packet contains mandatory paths,
relationships, exclusions, and task-specific scoring. The hidden packet stays
outside the shared fixture under preparer custody; only its SHA-256 digest and
byte count enter the timestamped preparation manifest. The runner records
that commitment in its preflight record before receiving any task output.
After execution the packet is delivered directly to the reviewer, who verifies
it against the commitment. Expected evidence created or changed after results
invalidates the experiment.

### 5.3 Schedule and isolation

The preparer generates a 14-run counterbalanced schedule before execution.
Mode order alternates across tasks; task order is not changed after output is
seen. Each run uses a fresh host session with memory/profile memory disabled.

Exactly one evaluated model run executes at a time. Native and indexed runs,
provider builds/restarts, reviewer work, and other experiment model calls may
not overlap. The runner records start/end monotonic and wall timestamps,
system load, account-limit warnings, and provider cold/warm state. A task pair
with external contention or model transport failure may use only one
predeclared fresh-context retry before unblinding; quality dissatisfaction is
not retryable.

The provider uses one exact ready source view per task. T5 uses a separately
identified deliberately incomplete patch view. Query caches are disabled when
possible; otherwise cache identity/hits are reported and the same declared
warm/cold policy applies to every indexed task.

### 5.4 Bounds and fallback

Each indexed task is capped at:

- 25 records/page and 100 records total;
- 32 KiB default and 128 KiB hard returned source bytes;
- 8 KiB default and 32 KiB hard source body/slice;
- at most five automatic continuation pages;
- 10 seconds per provider operation; and
- an exact repository, worktree, and immutable view.

Truncation, ambiguity, unsupported coverage, or staleness must be explicit.
No indexed failure may trigger native retrieval. A separately declared
verification read is permitted only after the candidate answer is sealed and
is measured as additional indexed-mode cost.

## 6. Measurements

Per run, preserve machine-readable raw evidence for:

- model input, output, cache, and total reported tokens;
- exact outbound tool names/schema bytes and estimated schema tokens;
- tool calls by kind, parameters stripped of sensitive source/query content,
  result byte counts, continuation, timeout, and truncation;
- source bytes returned, complete files read, and native search/read calls;
- time to first correct localization and total elapsed time;
- expected evidence found/missed, incorrect candidates, false completeness,
  coverage qualification, and independent score;
- corrections, infrastructure retries, verification reads, and fallback;
- provider build/readiness/refresh/query CPU, RSS, disk, process count, and
  latency; and
- cold/warm state and one-time dependency/startup cost.

Use one declared tokenizer or byte-to-token estimation method for schema/tool
content and label estimates separately from provider-reported usage.

Primary metric:

```text
model + retrieval + provider amortization + operator/reviewer correction cost
-------------------------------------------------------------------------
                         accepted task outcomes
```

Also report the observed reuse count at which readiness/build/startup cost
breaks even. An unaccepted task remains in cost but never in the accepted
outcome denominator.

## 7. Quality rubric and acceptance

The hidden rubric scores each task from `0` to `4`. T1–T5 and T7 require at
least `3`; T2, T4, and T5 allow zero missed mandatory producers/callers; T6
must locate the exact single function without broad irrelevant exploration.
Any false claim of dynamic/runtime completeness fails the task.

`INDEXED` must be non-inferior to the accepted `NATIVE` result on every
structural task. If either mode misses any task's minimum floor, the experiment
cannot claim adoption. A native miss yields `RESEARCH_BLOCKED` because the
comparison baseline is not accepted; an indexed miss yields `REJECT_PROVIDER`
for the exact evaluated integration.

Adoption thresholds retain SRC-EXP-01's intended gates:

- median indexed returned source bytes plus schema overhead improves by at
  least 25% on accepted structural tasks;
- median tool calls or time to first correct localization improves by at least
  20%;
- no safety, isolation, staleness, hidden execution, or quality regression;
- provider cost is finite and amortizable at the measured reuse point; and
- the T6 control is not materially worse after allocated startup cost.

## 8. Final verdicts

The runner returns exactly one:

- `ADOPT_BASELINE` — all readiness/safety/quality gates pass and the complete
  declared baseline scope meets the benefit thresholds;
- `ADOPT_LIMITED` — all required gates pass only for precisely named task,
  language, repository-size, host, or warm/cold conditions;
- `REJECT_PROVIDER` — reproducible provider-specific readiness, safety,
  quality, boundedness, or accepted-outcome cost fails; or
- `RESEARCH_BLOCKED` — comparable execution or evidence remains impossible.

`REJECT_PROVIDER` rejects only the exact candidate/version/host integration,
not the provider-neutral Watchtower capability. Neither adoption verdict
authorizes implementation; it only permits a separate operator-approved
source-intelligence specification amendment.

## 9. Deliverables and cleanup

Fixture evidence includes:

- preparation commitment and post-run revealed expected-evidence verification;
- environment, repository, view, provider, host, schema, and config manifests;
- readiness attestation and raw direct/model canary evidence;
- exact prompts and counterbalanced schedule;
- per-run model/provider/tool/measurement records;
- source-view canary/overlay/exclusion evidence;
- raw result and independent scoring references;
- process/network/filesystem mutation inventories; and
- an exact cleanup manifest naming only the SRC-EXP-02 fixture.

The runner writes only
`.local/source-intelligence-experiment/SRC-EXP-02-report.md`. The independent
reviewer writes only `SRC-EXP-02-review.md`. Cleanup remains deferred until
review and operator acceptance; it never names SRC-EXP-01, original
repositories, global agent/provider homes, or Watchtower reports.

## 10. Completion rule

The runner stops after its report. It does not amend specifications, select a
production dependency, create an implementation pack, copy experiment code,
clean the fixture, or commit. The independent reviewer may accept evidence but
cannot authorize product implementation.
