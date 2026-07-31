# SRC-EXP-01 — Source Retrieval Quality and Cost Evaluation

Status: **Ready for disposable execution; not product or batch acceptance**

Governing design: [source-intelligence-draft.md](../../source-intelligence-draft.md)

## 1. Question

Can one audited S1/S2 provider, behind the proposed Watchtower-style bounded
query discipline, reduce total retrieval/context cost for representative
Nirvana implementation and review tasks without reducing localization quality,
missing expected evidence, leaking between worktrees, or duplicating a host's
native retrieval at greater total cost?

The experiment does not choose the complete production architecture. It tests
the riskiest assumptions before an implementation pack exists.

## 2. Isolation and authority

- Fixture root: `/home/kavan/Projects/watchtower-source-intelligence-spike`.
- Watchtower repository: read-only except `.local/` experiment/review reports.
- Candidate repositories: read-only clones or dedicated disposable worktrees;
  never an active implementation/review worktree.
- Provider dependencies/config/caches: isolated inside the fixture or a
  declared disposable user-local prefix.
- No global agent, MCP, editor, Git, Node, Python, shell, or provider
  configuration changes.
- No product source, command, runtime, dependency, schema, build, test, or dist
  modification.
- No provider network/source upload without explicit operator authorization
  recorded before execution.
- Repository source and human-reviewed expected evidence remain authority.

The agent declares every path, repository, commit, worktree, provider, version,
process, port, network behavior, and cleanup target before mutation.

## 3. Compared modes

| Mode | Contract |
|------|----------|
| `NATIVE` | `rg`, Git, and bounded line/file reads using current agent defaults |
| `SYMBOL` | One declared S1/S2 provider using only outline/symbol/definition/reference/implementation/bounded-read operations |
| `GRAPH` | Optional structural graph provider, evaluated separately rather than added to `SYMBOL` results |
| `HOST_NATIVE` | Optional Cursor/other host retrieval when reproducibly measurable and exportable |

One candidate may not be added merely to improve a weak result after seeing the
answer. Provider/tool descriptions and instructions are recorded so schema and
prompt overhead can be estimated.

## 4. Repository and worktree matrix

Use at least:

1. one substantial TypeScript/JavaScript Nirvana repository;
2. one second repository participating in a real cross-repository path; and
3. two disposable worktrees of the same repository at the same base commit,
   each containing a different uncommitted symbol/path change.

Record full commit/tree OIDs, canonical worktree paths, Git status, relevant
language configuration, ignore policy, generated boundaries, and provider
configuration digests. Untracked/ignored/credential-like files are excluded.

The worktree-isolation fixture inserts unique harmless canary symbols into each
disposable worktree. A query pinned to one worktree must return its own canary
and never the other's.

## 5. Predeclared task set

Before running any mode, an independent preparer records a private expected
evidence set for each task:

1. trace one CLI command through its application/foundation capability to an
   adapter or runtime boundary;
2. identify every expected implementation/reference needed for a declared
   interface change;
3. trace one event or contract across the two repositories;
4. produce bounded impact candidates for a public symbol;
5. independently review a prepared multi-file change for missed consumers;
6. localize one small single-file task where indexing should offer little
   benefit; and
7. inspect at least two difficult static-analysis boundaries from decorators,
   metadata, dependency injection, dynamic imports, generated code, path
   aliases, or unresolved project configuration.

Tasks use identical question text, source baseline, tool budget, and acceptance
rubric across modes. Separate fresh agent contexts prevent one mode leaking the
answer to another. Mode order is randomized or counterbalanced.

## 6. Bounded retrieval profile

To approximate the proposed broker, each provider query is capped at:

- 25 results/page and 100 candidate results total;
- 32 KiB default/128 KiB hard returned bytes;
- 8 KiB default/32 KiB hard source slice;
- graph depth two and 100 nodes for the task runs;
- exact repository/worktree/source-view declaration; and
- explicit truncation, coverage, unsupported, ambiguity, and stale labels.

The experiment must not compensate for a failed indexed mode with an unmetered
native scan and then attribute the combined answer to the provider. A declared
verification read is allowed and counted separately.

## 7. Measurements

Per task/mode record:

- agent/model/version/effort and provider/tool configuration;
- reported input/output/cache tokens when available;
- estimated tool-schema and returned-context tokens under one declared method;
- tool-call count by kind;
- complete files and source bytes read;
- time to first correct localization and total elapsed time;
- expected evidence found, incorrect candidates, and missed evidence;
- confidence/coverage claims made by the agent;
- build/test/proof outcome where the task safely permits it;
- independent semantic-review verdict and human corrections;
- provider build/refresh/query CPU, memory, disk, process count, and latency;
- cache cold/warm state; and
- failure, retry, truncation, or fallback details.

Aggregate primary metric:

```text
total retrieval + model + operator correction cost
--------------------------------------------------
               accepted task outcomes
```

Tokens/tool calls are secondary. An unaccepted or incompletely localized task
cannot be reported as a saving.

## 8. Required adversarial checks

- Cross-worktree canary isolation.
- Committed view versus staged/unstaged/renamed/deleted overlay freshness.
- Provider restart and stale cache/config handling.
- Symlink outside root, ignored file, `.watchtower/`, `.git/`, build/dist,
  dependency, and credential-like path exclusion.
- Malformed/ambiguous symbol and unsupported language operation.
- Query/page/byte/time limit refusal or explicit partial result.
- No provider mutation of candidate repositories.
- No hidden project build, package install, plugin execution, network upload,
  or source transfer.
- No source content in logs beyond declared bounded evidence artifacts.

## 9. Minimum decision thresholds

The report computes results before applying these gates:

### `ADOPT_BASELINE`

- no expected-evidence or accepted-outcome regression against `NATIVE` across
  the required structural implementation/review tasks;
- no security, cross-worktree, stale-view, or hidden-execution failure;
- median combined returned source bytes plus tool-schema overhead improves by
  at least 25% on structural tasks;
- median tool calls or time-to-correct-localization improves by at least 20%;
- index build/refresh/resource costs are finite and amortizable over the
  observed reuse point; and
- the single-file control is not materially worse after provider startup cost
  is included.

### `ADOPT_LIMITED`

All safety/quality gates pass, but benefit is limited to explicitly named
languages, task classes, repository sizes, or warm-cache conditions. The report
defines the allowed scope and honest unavailable/fallback behavior.

### `RESEARCH_BLOCKED`

The environment cannot measure token/cost/quality comparably, expected evidence
is disputed, required providers cannot run safely, or a specification decision
must be made before the experiment can continue.

### `REJECT`

Any quality regression, missed required evidence, cross-worktree/source leak,
hidden source transfer/execution, unbounded behavior, false completeness claim,
or failure to improve end-to-end accepted-task cost rejects the candidate.

The numeric thresholds are experiment gates, not permanent product promises.
An accepted product amendment may revise them only with the complete evidence.

## 10. Deliverables

Under the disposable fixture:

- exact environment/provider manifest;
- sanitized task/rubric manifest and private expected-evidence handling note;
- raw machine-readable measurements;
- per-task result/evidence references;
- resource and isolation logs;
- cleanup manifest; and
- one implementer experiment report.

Under Watchtower `.local/source-intelligence-experiment/`:

- `SRC-EXP-01-report.md` with `ADOPT_BASELINE`, `ADOPT_LIMITED`,
  `RESEARCH_BLOCKED`, or `REJECT`;
- no raw source corpus or index artifacts; and
- later, an independent `SRC-EXP-01-review.md`.

## 11. Completion rule

The experiment agent does not amend product specifications, select a production
dependency, create an implementation pack, or transfer spike code. It stops
after the report. Only an independent reviewer may accept the evidence, and
even accepted evidence requires a separate operator-approved specification
amendment before source-intelligence implementation planning.
