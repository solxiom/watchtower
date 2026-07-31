# SRC-EXP-03 — Installed Host Route Readiness

Status: **Ready for disposable execution; not product implementation**

The first execution stopped incomplete after candidate freeze and omitted an
installed Claude structural route. It is not accepted evidence. The corrected
rerun is [SRC-EXP-03-R1](SRC-EXP-03-R1-correction.md).

Governing design: [source-intelligence-draft.md](../source-intelligence-rejected.md)

Predecessor: [SRC-EXP-02 outcome](SRC-EXP-02-outcome.md)

## 1. Question

Does an already installed agent host expose a host-native structural source
route that is observable, bounded, worktree-safe, and actually available to a
model, without installing or operating another Watchtower indexing provider?

This is a readiness bakeoff, not the native-versus-indexed quality experiment.
It spends at most one successful bounded model canary call per eligible route
and never runs T1–T7.

## 2. Fixture and mutation boundary

Fixture root:

```text
/home/kavan/Projects/watchtower-source-route-spike-03
```

Watchtower must be clean and committed. Candidate repositories are independent
owner-only no-hardlink clones or copied source views at exact commit/tree OIDs.
SRC-EXP-01 and SRC-EXP-02 fixtures are read-only audit evidence and are not
used as configuration, cache, source, answers, or mutable state.

Allowed Watchtower writes:

```text
.local/source-intelligence-experiment/SRC-EXP-03-report.md
.local/source-intelligence-experiment/SRC-EXP-03-review.md
```

Host homes, configs, sessions, caches, request captures, and copied credentials
remain owner-only beneath the fixture. Credential values are never printed,
hashed into reports, or exposed to another route. No global/project config,
dependency, plugin, package, source, or Git-ignore mutation is permitted.

## 3. Discovery and frozen candidate set

Before any model call, inventory locally installed host CLIs in this fixed
order:

1. OpenCode;
2. Codex CLI;
3. Cursor CLI/headless agent;
4. Hermes; and
5. other already installed hosts only when they advertise a distinct
   structural source route and require no new install/configuration.

Discovery is non-secret and records executable/version, configuration family,
available source-tool names and declared semantics, model/account route class,
request/tool-call observability, cache/write location, and whether a fully
fixture-local launch is possible. It does not enumerate tokens, dump complete
configuration, probe paid balances, or modify authentication.

The runner freezes `candidate-set.json` before model calls. A route is eligible
only when all are true:

- it already supplies symbol, definition, reference, implementation, outline,
  or indexed structural retrieval beyond ordinary shell/file/grep;
- it can run from fixture-local state without global/project mutation;
- one exact source view can be selected without scanning unrelated roots;
- tool/schema and tool-call evidence are observable and sanitizable;
- a covered/free route is available without purchasing capacity; and
- no rejected Serena 0.1.4/Hermes 0.18.2 integration is reused.

Ordinary terminal, `rg`, file-read, generic web search, and model-only source
guessing are controls, not eligible structural routes. Ineligible hosts receive
a reason and no model call. Candidate order cannot change after results.

## 4. Common canary fixture

Each eligible route receives a fresh exact view of the same pinned Nirvana
baseline containing one harmless uncommitted TypeScript symbol:

```text
SRC_EXP_03_HOST_ROUTE_CANARY
```

The function body returns an opaque per-route value generated before the model
call and recorded only in the route manifest. The model prompt names the symbol
but not its file, body, or return value. A second sealed view at the same commit
contains no canary and acts as an isolation negative.

After sealing, filesystem inventories and Git/source hashes are captured. Any
host/provider cache, metadata, config, lock, or log write inside either source
view fails that route even when ignored by Git.

## 5. Per-route readiness gate

### 5.1 Pre-model proof

Before the canary call, record:

- exact host/version/model/account route and fixture-local state;
- canonical tool names and JSON Schemas or the nearest exact host-native
  structural contract;
- schema bytes/digest and schema-token estimate;
- source-view selection and exclusions;
- declared process/network/cache/plugin/config behavior;
- 10-second source-operation and 120-second model-call limits; and
- a sanitized exact outbound-request/tool-schema capture method.

If exact model-visible tool evidence cannot be captured, the route is
`RESEARCH_BLOCKED`; a direct host `tools list` is insufficient.

### 5.2 Model-mediated canary

One fresh memory-disabled context is instructed to resolve the canary using
the structural route exactly once and return its repository-relative file,
symbol signature, body/opaque value, view identity, and invocation evidence.
Native shell/file/grep/edit/web tools are disabled. The captured outbound
request must contain only the approved structural tools.

Readiness requires:

1. non-empty approved tool/schema evidence in the outbound model request;
2. at least one correlated model/host structural invocation;
3. exact canary file/signature/body from the positive view;
4. an explicit no-match result against the negative view through a separate
   direct non-model route check when supported;
5. finite record/byte/time behavior with measured returned bytes;
6. no native fallback or source-bearing telemetry beyond the authorized model
   request; and
7. no write inside sealed source views, original repos, global homes, or
   Watchtower tracked files.

An unavailable tool, zero tool calls, guessed answer, unbounded request, source
leak, or undeclared write cannot be repaired with another model call.

### 5.3 Lifecycle

After each route, terminate its processes and verify no listener, language
server, watcher, or child remains. Record wall time, API/tool calls, reported
tokens, returned source/schema bytes, RSS where observable, filesystem writes,
and exit/timeout evidence. One infrastructure retry is allowed only when no
model request was accepted.

Routes run sequentially and never share host state, source views, request
captures, caches, or credentials.

## 6. Route verdicts and experiment outcome

Each discovered route receives exactly one:

- `ROUTE_READY` — every readiness and safety condition passes;
- `REJECT_ROUTE` — a reproducible route property violates capability, safety,
  mutation, boundedness, or model-availability requirements;
- `RESEARCH_BLOCKED` — observability, authentication, environment, or evidence
  cannot decide safely; or
- `INELIGIBLE` — the installed host has no qualifying structural route or
  cannot meet the pre-call contract, so no model call was made.

The experiment returns:

- `ROUTE_READY` with the exact accepted host/model/capability scope when one or
  more routes pass;
- `NO_ELIGIBLE_ROUTE` when discovery finds no installed route satisfying the
  structural capability and pre-call contract, so no model call is permitted;
- `REJECT_ROUTES` when every eligible route is conclusively rejected; or
- `RESEARCH_BLOCKED` when no route is ready and at least one material candidate
  remains undecidable.

No ranking is made from token use. A ready route only qualifies for a later
quality/cost experiment; it is not provider adoption or implementation
authorization.

## 7. Deliverables and completion

The fixture retains sanitized inventory, frozen candidate set, exact source
views, route manifests, schema/request/tool-call evidence, resource/write/
process records, and an exact cleanup manifest. The runner writes only
`SRC-EXP-03-report.md`; an independent reviewer later writes only
`SRC-EXP-03-review.md`.

The runner does not amend specs, add dependencies, create adapters, copy host
code, configure projects/globals, run T1–T7, clean fixtures, or commit. Cleanup
remains deferred until review and operator acceptance.
