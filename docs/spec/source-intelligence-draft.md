# Watchtower Source Intelligence

Status: **Draft — separate product capability lane; not part of the current v1 command surface**

Proposed CLI group: `wt source`

This document defines a built-in, provider-neutral source-intelligence
capability for repositories and worktrees coordinated by Watchtower. It turns
source exploration into bounded, reusable, provenance-bearing queries without
making an index authoritative, placing source code in every model prompt, or
binding Watchtower to MCP, one language server, or one commercial service.

The capability is deliberately separate from the v1 coordinator pack index:

```text
coordinator pack index              source-intelligence index
----------------------              -------------------------
accepted pack structure             repository/worktree structure
requirements and batch graph        files, symbols, references, candidates
sealed pack identity                 exact source snapshot identity
coordination authority input        derived discovery evidence only
required by v1 coordinator          separately enabled capability
```

Nothing in this draft changes the accepted v1 implementation-lane lifecycle or
permits a coordinator, agent, index provider, or MCP process to mutate source.

## 1. Product statement

Watchtower should index once and serve many bounded source queries to pack
architects, implementers, reviewers, decision agents, and operators. A query
should return the smallest source evidence needed to localize and verify work,
instead of repeatedly forcing each agent/account/session to rediscover the
same repository through broad text searches and complete-file reads.

Watchtower owns:

- repository/worktree selection and authorization;
- provider capability and trust policy;
- exact snapshot and dirty-overlay identity;
- index lifecycle, freshness, storage, and isolation;
- provider-neutral bounded query/result contracts;
- provenance, coverage qualification, context budgets, and usage evidence;
- agent, CLI, optional MCP, pack, allocation, and UI integration; and
- evaluation of quality and cost per accepted outcome.

Watchtower does not implement a new parser, language server, embedding model,
or hosted code-search service. It integrates audited engines through narrow
adapters and ships only the minimum provider set proven by an accepted
feasibility/evaluation gate.

## 2. Why this capability belongs in Watchtower

A generic code-indexing tool sees a repository. Watchtower additionally knows:

- which lane and initiative requested the query;
- the exact logical repositories and physical worktrees bound to that lane;
- which batches claim which paths and repositories;
- accepted source baselines and current Git state;
- implementer/reviewer roles and separation requirements;
- the selected endpoint's context and tool capabilities;
- per-turn, assignment, session, and lane budgets; and
- whether returned evidence belongs in an implementation, review, planning, or
  coordinator context.

That allows Watchtower to reuse indexes without confusing lanes, produce
batch-scoped source capsules, avoid duplicating functionality already supplied
by an agent host, and measure whether retrieval improves accepted work rather
than merely reducing one tool response.

## 3. Goals and non-goals

### 3.1 Goals

1. Reduce repeated broad repository exploration and complete-file loading.
2. Improve localization of definitions, implementations, references, module
   relationships, and cross-repository paths.
3. Reuse one verified snapshot index across authorized agents and sessions.
4. Keep every result bounded, paginated, provenance-bearing, and honest about
   staleness, truncation, inference, and provider coverage.
5. Isolate worktrees so concurrent lanes never receive one another's source.
6. Give reviewers independently reproducible source discovery.
7. Build compact source-context capsules from accepted batch scope.
8. Support local CLI, internal application, agent-adapter, and optional MCP
   access through one contract.
9. Preserve ordinary `rg`, direct source reading, builds, tests, and runtime
   diagnostics as necessary verification tools.
10. Measure tokens, tool calls, latency, correctness, and human corrections per
    accepted outcome.

### 3.2 Non-goals

- Treating an index as repository, Git, requirement, or review authority.
- Proving that all dynamic references or runtime behavior were found.
- Replacing source inspection, builds, tests, or independent review.
- Automatically injecting source into every coordinator or operator turn.
- Building Watchtower-specific parsing, LSP, vector, graph, or ranking engines.
- Requiring embeddings, an external server, network access, or MCP.
- Editing, renaming, or refactoring source through the retrieval capability.
- Executing project build scripts, package installation, compiler plugins, or
  arbitrary project configuration during indexing.
- Indexing credentials, ignored files, build output, dependencies, or unrelated
  repositories merely because they exist on the host.
- Claiming a universal token-reduction percentage.
- Ranking agents by token consumption or maximizing index use as a goal.

## 4. Vocabulary

| Term | Definition |
|------|------------|
| Source repository | One machine-local Git repository identity registered without writing into it |
| Source worktree | One canonical authorized worktree belonging to a source repository |
| Source snapshot | Immutable identity of committed source plus declared index configuration |
| Dirty overlay | Immutable bounded capture of eligible staged/unstaged content over one source snapshot |
| Source view | Snapshot alone or snapshot plus one exact dirty overlay |
| Provider | Engine that supplies one or more source-intelligence capabilities |
| Provider adapter | Watchtower boundary that normalizes, bounds, and qualifies provider behavior |
| Capability tier | Declared class of query semantics supported by a provider |
| Source reference | Stable result reference containing view, repository, path/range/symbol, digest, and provenance |
| Source capsule | Bounded manifest and selected source evidence prepared for one batch/turn/assignment |
| Impact candidate | Potentially affected source found structurally; never proof of complete impact |
| Coverage qualification | Statement of what a provider examined and what may be missing |

## 5. Authority and trust model

| Question | Authority |
|----------|-----------|
| What source bytes currently exist? | Authorized worktree and Git object database |
| What committed baseline applies? | Accepted spec/pack and verified repository binding |
| What work is required? | Accepted specification and implementation pack |
| Which index view was queried? | Verified source-view manifest |
| What symbols/references did a provider report? | Qualified derived provider result |
| Is a change correct and complete? | Current source, required proof, and independent semantic review |
| May an agent read a repository/worktree? | Lane binding, execution-user access, and source policy |
| May an effect change source? | Existing implementation/review workflow, never source intelligence |

The source index is disposable derived evidence. Model-generated summaries,
agent prose, provider rankings, and MCP responses never become index authority.
A source result may localize a candidate but cannot establish that a symbol is
unused, a change is safe, every implementation was found, or review is
complete.

The accepted pack index and source index have separate stores, manifests,
freshness, rebuild triggers, schemas, and query interfaces. Neither may query
the other's database directly or merge into one generic index store.

## 6. Capability architecture

```text
wt source / pack architect / agent / reviewer / operator session
                              │
                              ▼
                 SourceIntelligenceBroker
          authorization · view pinning · limits · provenance
                 │                         │
                 ▼                         ▼
         SourceIndexCatalog        SourceCapsuleBuilder
                 │
                 ▼
          provider adapters
   lexical · syntax · semantic · graph · optional similarity
                 │
                 ▼
    rg / Tree-sitter / LSP / Serena / Sourcegraph / other audited engine
```

The names above describe responsibilities, not required implementation module
names. A future implementation pack must apply the project engineering limits
and assign focused owners rather than constructing one source-index manager.

### 6.1 Capability tiers

| Tier | Required semantics | Typical engine class |
|------|--------------------|----------------------|
| `S0-file` | authorized file inventory, literal/regex search, bounded exact slices | Git plus `rg`/filesystem adapter |
| `S1-syntax` | language detection, symbol outline, declarations, imports/module edges | Tree-sitter or equivalent parser |
| `S2-semantic` | definitions, references, implementations, type-aware resolution | LSP/Serena-compatible provider |
| `S3-graph` | bounded call/dependency paths, communities, cross-repository impact candidates | structural graph or SCIP-like provider |
| `S4-similarity` | ranked semantic candidate discovery | optional embeddings/search service |

The first accepted release must provide `S0-file` and `S1-syntax`. `S2`–`S4`
are independently optional and cannot be simulated by relabeling text search.
No correctness rule depends on `S4`.

### 6.2 Provider-adapter contract

Every adapter declares and implements only supported operations:

| Operation | Contract |
|-----------|----------|
| `detect` | version, executable/library identity, target compatibility, trust requirements |
| `capabilities` | exact tiers, languages, operations, and coverage limitations |
| `prepare` | deterministic non-mutating source-view input and provider configuration |
| `build` | staged index build with progress and bounded resources |
| `refresh` | incremental build only when equivalence to a clean rebuild is provable |
| `verify` | manifest, source view, artifacts, schema, and provider identity checks |
| `query` | one typed bounded operation and normalized result |
| `dispose` | deletion of one derived staged/obsolete index only |
| `diagnose` | redacted, non-mutating compatibility and health checks |

An adapter also declares whether it:

- starts a process or server;
- uses network access;
- reads outside authorized roots;
- loads project or user plugins/configuration;
- executes compiler/build/package-manager behavior;
- uses embeddings or sends source off-host;
- maintains background state;
- is safe for unattended operation; and
- can produce secrets before normalization/redaction.

Undeclared behavior is a hard failure. Provider-specific options stay behind
the adapter; core query contracts never expose arbitrary provider commands.

### 6.3 Provider selection

Provider selection is capability- and policy-based, not brand-based. A lane may
use several non-overlapping providers, but one query has one selected provider
and records it. Watchtower avoids starting a second provider when the selected
agent host already supplies an accepted equivalent capability and a compatible
bounded result can be referenced directly.

No provider is selected for the product until a disposable evaluation proves
its language coverage, snapshot correctness, distribution/runtime behavior,
resource bounds, secret boundary, query quality, and cost per accepted task.

## 7. Repository, worktree, and source-view identity

### 7.1 Registration

Watchtower registers only repositories already authorized through a lane's
validated `repositories.local.json` binding or an explicit operator source
scope. Registration writes no marker, configuration, cache, or ignore file to
the participating repository.

A machine-local opaque `sourceRepositoryId` represents a Git common-directory
identity. A `sourceWorktreeId` represents one canonical worktree path and Git
worktree identity. Logical pack repository IDs map to these local IDs through
the existing lane binding; they are not interchangeable.

Repository relocation is an explicit registry update. A canonical path match
alone cannot silently merge histories or transfer authorization.

### 7.2 Snapshot identity

A committed source snapshot contains at least:

```json
{
  "schemaVersion": 1,
  "sourceRepositoryId": "src-repo-...",
  "baseCommitOid": "<full-git-oid>",
  "treeOid": "<full-git-tree-oid>",
  "submodules": [{"path": "...", "commitOid": "..."}],
  "scopePolicyDigest": "sha256:...",
  "sourceSnapshotId": "sha256:..."
}
```

`sourceSnapshotId` is derived from source/scope semantic fields, not provider,
timestamps, paths, SQLite bytes, cache serialization, or build host. A
`sourceViewId` identifies either that committed snapshot or the snapshot plus
one exact overlay.

Each provider index has a separate `indexId` derived from `sourceViewId`,
provider ID/version/configuration, adapter and index schema versions, and
declared language configuration. This allows the same source view to be
compared across providers without pretending their indexes are interchangeable.
Providers whose serialized output is not reproducible still use deterministic
Watchtower view/index manifests and must prove query equivalence for the
accepted fixture set.

### 7.3 Dirty overlays

Dirty source is never confused with its base commit. An overlay records:

- source worktree ID and base snapshot ID;
- Git index identity;
- eligible staged and unstaged path/content digests;
- deletions and renames;
- declared inclusion of eligible untracked files;
- scope-policy digest; and
- deterministic `overlayId`.

The source-view manifest derives `sourceViewId` from the base snapshot and
overlay. Eligible changed file bytes required to keep that view immutable are
captured as owner-only content-addressed overlay blobs; they are derived local
source data governed by the same authorization, lease, retention, and pruning
rules as the view. Committed bytes continue to resolve by exact Git object ID.

Ignored files, dependencies, credentials, runtime/build output, lane-local
state, and files outside the authorized worktree are always excluded. Untracked
files are excluded by default and require an explicit per-operation
`--include-untracked` acknowledgement plus policy eligibility. The manifest
lists included paths, never hidden file contents.

Queries pin one source view for their complete duration. If the worktree
changes, the existing view remains immutable and becomes outdated; results are
never silently mixed with a newer overlay.

Without `--include-dirty`, an index operation targets the exact HEAD commit and
reports eligible worktree changes as excluded; it cannot claim to represent the
current working tree. `--include-untracked` is invalid without
`--include-dirty`. Dirty capture compares Git/index/path/content fingerprints
before and after capture and retries within a finite limit or fails with
`SOURCE_VIEW_CHANGED_DURING_CAPTURE`; it never publishes a torn overlay.

### 7.4 Multi-lane isolation

Two lanes may share a committed snapshot only when repository identity,
commit/tree, scope policy, provider/configuration, authorization, and execution
user permit it. Dirty overlays are never shared across worktrees. A lane query
must resolve every logical repository through that lane's current binding
before accessing a cached snapshot.

No fallback may substitute the default branch, another lane's worktree, a
newer commit, or a similarly named repository when the requested view is
missing.

## 8. Scope and content policy

Source policy has three activation modes:

| Mode | Behavior |
|------|----------|
| `off` | No index build/query; status and provider diagnostics remain available |
| `on-demand` | Explicit query/capsule may request a build after preflight |
| `maintained` | Authorized foreground/watcher work may incrementally refresh views |

The global and new-lane default is `off`. Enabling is explicit because some
providers execute processes, consume substantial resources, load language
configuration, or transmit data. Provider approval and lane activation are
separate decisions.

The effective scope is the intersection of:

1. validated lane repository bindings;
2. operator source policy;
3. pack repository/path claims when a batch scope is requested;
4. provider/language exclusions;
5. Git ignore and Watchtower mandatory exclusions; and
6. execution-user filesystem authorization.

Mandatory exclusions include `.git/`, `.watchtower/`, `.nira/local/`,
`node_modules/`, `build/`, `dist/`, known credential files, provider caches,
and files outside canonical repository roots. A policy may add exclusions but
cannot remove mandatory secret/lane-state exclusions.

Symlinks are recorded as links. They are not followed outside authorized roots.
Submodules require separate authorized repository identities and exact pinned
commits; an unregistered submodule is represented as unavailable.

## 9. Storage and lifecycle

### 9.1 Local layout

```text
<watchtower-data-root>/
  source-intelligence/
    registry.json
    providers/
      approvals.json
    repositories/
      <source-repository-id>/
        views/
          <source-view-id>/
            source-view-manifest.json
            overlay-blobs/                 # present only for captured dirty bytes
        indexes/
          <source-view-id>/
            <provider-key>/
              <index-id>/
                provider-manifest.json
                index.sqlite-or-provider-artifacts
    staging/
    leases/
```

Lane-local state contains only source policy, logical binding references,
current pinned view IDs, capsule manifests, and usage/events. It does not copy
the shared index or make a lane the authority for repository identity.

All index artifacts are ignored local data, owner-controlled, and disposable.
Cross-user sharing is forbidden unless a future explicit multi-user security
contract defines permissions and cache confidentiality. Worker accounts query
through an authorized broker/adapter; world- or broad group-readable indexes
are rejected.

The first accepted release uses live CLI/MCP queries only under the index-owning
execution user. Work launched as another OS user receives a bounded capsule in
its authorized launch context or uses that user's separately built index or
native source tools. Watchtower does not grant raw cache access to make reuse
convenient. Live cross-user query reuse requires a separately accepted local
broker contract with peer identity, lane/repository/view/operation budgets,
expiry, revocation, auditing, and no general filesystem proxy.

### 9.2 Lifecycle

```text
ABSENT → BUILDING → VERIFYING → READY
            │           │        │
            └───────────┴──────→ FAILED

READY → OUTDATED → BUILDING
READY/OUTDATED → CORRUPT → BUILDING
READY/OUTDATED → RETIRED → DISPOSED
```

- `OUTDATED` means the indexed view remains internally valid but differs from
  the current requested worktree/source policy/provider configuration.
- `CORRUPT` means index or manifest integrity failed.
- A staged build becomes `READY` only after source-view and provider checks.
- Publication is an atomic pointer update; readers pin an immutable directory.
- Interrupted builds never replace a ready view.
- Cleanup respects active query/capsule leases and finite retention policy.

Agent capsules, review completeness checks, and coordinator decisions reject
outdated or corrupt views. An operator may explicitly inspect an outdated view
for diagnosis; every result remains marked outdated and cannot be submitted as
current proof.

### 9.3 Refresh

Incremental refresh must produce results equivalent to a clean build for the
accepted conformance fixtures. If a provider cannot prove this after a config,
language, rename, generated-file, or index-schema change, Watchtower performs a
staged clean rebuild. Read-only commands never repair or switch an index.

No failed query falls back to a recursive repository scan, another provider,
or an unbounded source read. The result names the missing capability/view and
the explicit build, refresh, provider, or native-tool alternative.

## 10. Query and result contract

### 10.1 Closed operations

| Query | Minimum tier | Result |
|-------|--------------|--------|
| `repository.list` | S0 | authorized logical/local repository and worktree identities |
| `view.status` | S0 | source view, freshness, provider, scope, coverage, and blockers |
| `file.search` | S0 | literal/regex matches with exact bounded ranges |
| `source.slice` | S0 | exact pinned-view bytes for authorized path/range and digest |
| `file.outline` | S1 | declared symbols/imports with ranges |
| `symbol.search` | S1 | symbol candidates by name/kind/language/scope |
| `symbol.resolve` | S1/S2 | one declaration/definition or explicit ambiguity |
| `reference.find` | S2 | qualified references with provider coverage |
| `implementation.find` | S2 | qualified implementations with provider coverage |
| `dependency.neighborhood` | S1/S3 | bounded import/call/dependency graph |
| `impact.candidates` | S1–S3 | potential affected symbols/files with reasons |
| `change.summary` | S1/S2 | changed paths/symbol candidates between exact views |

Adding an operation requires a versioned contract, provider capability mapping,
bounds, provenance, fixtures, and security review. There is no unrestricted SQL,
provider query language, filesystem glob, graph dump, or arbitrary command.

### 10.2 Request

Every request contains:

- schema version and operation;
- lane/initiative and role when lane-scoped;
- logical repository IDs;
- exact source view ID;
- structured query fields;
- path/language/symbol filters;
- record, byte, graph-depth/node, and time limits;
- continuation cursor where applicable; and
- purpose: `planning`, `implementation`, `review`, `coordinator`, `operator`,
  or `diagnostic`.

The broker rejects missing view identity, unavailable capability, unauthorized
scope, unbounded fields, unknown operations, incompatible cursor/view, and
limits above policy maxima.

### 10.3 Result

Every result contains:

- operation, query ID, selected provider/tier, and source view;
- stable source references and exact content digests;
- `fresh`, `outdated`, or diagnostic-only freshness;
- `reported`, `derived`, or `candidate` evidence quality;
- coverage scope and explicit provider limitations;
- deterministic ordering;
- returned/available-known counts where knowable;
- byte and estimated-token usage;
- truncation and continuation cursor; and
- diagnostics/reason codes without secrets.

`no matches` means no matches in the declared provider/view/scope—not proof that
no runtime/dynamic reference exists. Impact results are always candidates.

### 10.4 Default and hard bounds

| Dimension | Default | Hard maximum |
|-----------|--------:|-------------:|
| records per page | 25 | 100 |
| returned bytes per query | 32 KiB | 128 KiB |
| exact source slice | 8 KiB | 32 KiB |
| graph depth | 1 | 3 |
| graph nodes | 40 | 200 |
| repositories per query | 2 | 8 |
| provider query time | 1 s | 10 s |
| continuation pages per automatic capsule | 2 | 5 |

Policy or endpoint constraints may lower these values. A request cannot raise a
hard maximum. Time-limit expiry returns an explicitly partial result and stable
cursor only if the provider can guarantee deterministic continuation.

## 11. Source capsules

A capsule is a bounded, deterministic manifest assembled for one accepted
purpose; it is not another summary document or provider conversation.

### 11.1 Batch-scoped construction

The builder begins with:

- exact lane repository bindings and source views;
- accepted batch repository/path claims and baseline refs;
- explicit source hints recorded by pack architects;
- directly referenced requirements/findings/events; and
- the requesting role and endpoint context limit.

It may add bounded declarations, outlines, references, implementations, changed
symbols, and dependency neighbors. It never expands from relevance alone into
an entire repository, transitive graph, or all files matching a broad concept.

### 11.2 Manifest

The capsule records:

- `capsuleId`, purpose, lane, batch/turn/assignment, role, and creation time;
- every source view/provider/configuration digest;
- exact queries and limits;
- included source references/digests and selection reasons;
- coverage, unavailable capabilities, ambiguities, and truncation;
- total bytes and estimated tokens; and
- verification obligations before editing or review acceptance.

The manifest, not copied source, is durable by default. Selected source bytes
are passed only in the bounded invocation context or retained under the
existing turn/assignment retention policy.

Default capsule source content is 48 KiB with a hard maximum of 128 KiB, at
most eight source slices, 32 symbol records, 100 reference/implementation
candidates, graph depth two, and 100 graph nodes. Pack/turn/endpoint policy may
lower these limits. Crossing a limit returns a manifest with missing/truncated
areas and requires an explicit page, narrowed query, or escalation.

### 11.3 Verification rule

An implementer verifies selected references against the pinned current source
before editing. A reviewer regenerates or independently queries a current view
and may not accept solely from the implementer's capsule. If the source view
changes after capsule construction, the capsule is stale; it is never silently
rebased.

## 12. Workflow integrations

### 12.1 Pack design

Pack-design evidence architects may use source intelligence for reconnaissance,
baseline capture, dependency candidates, and source breadth. Pack artifacts may
record logical `sourceHints` and required verification, but source indexes and
machine-local IDs stay uncommitted.

An accepted pack seals repository baseline commits/tree IDs and explicit source
reference digests where required; it does not seal a provider database or claim
that an index proved semantic completeness. Consumability tests verify that a
fresh authorized machine can resolve the logical scope or report the optional
source-intelligence capability as unavailable.

### 12.2 Implementation and review

Launch envelopes may include one source-capsule manifest and bounded selected
evidence. Agents retain ordinary authorized source-reading and proof tools.
Retrieval cannot edit files or execute tests.

Work briefs declare whether source intelligence is `optional`, `recommended`,
or `required-for-capsule`. The last classification requires an accepted
provider capability and fallback planning but never lowers semantic proof when
the provider is unavailable. Review briefs name independent regeneration and
current-source checks.

### 12.3 Coordinator automation

Routine M0/D1/D2 coordinator envelopes do not include source intelligence.
Source status/freshness checks are M0. A D2/D3 cycle may request bounded source
evidence only when an accepted routing rule identifies source drift,
cross-repository reconciliation, or dependency-impact judgment as relevant.

The coordinator broker records query cost and provenance. Source results may
support a proposal but cannot authorize an effect, alter a pack, classify
review acceptance mechanically, or bypass the existing context/effect boundary.

### 12.4 Operator sessions and TUI

Operator turns access source only through explicit source references or a
source-scoped request that passes preflight and budget display. Source context
is not session memory unless the retained turn contract explicitly records the
bounded reference/capsule.

The v1 TUI's closed inspector and global-search registries do not change. A
future accepted UI amendment may add a `source` inspector and source-search
scope showing repository, view, freshness, provider, coverage, bounds, and
truncation. It must never silently mix source search into session/pack search.

### 12.5 Allocation planning

Endpoint eligibility records whether an endpoint can consume:

- native file/source references;
- the Watchtower CLI query contract;
- the optional MCP facade;
- provider-native source intelligence already supplied by its host; and
- capsule manifests versus inline source bytes.

The planner avoids duplicating large inline source when an endpoint has an
accepted compatible query route. It does not prefer an endpoint merely because
it supports an index, and absence of indexing cannot lower the pack's reasoning
or proof floor.

## 13. CLI contract

| Command | Purpose and mutation class |
|---------|----------------------------|
| `wt source providers list` | M0 list of installed/approved provider adapters |
| `wt source providers check [<id>]` | M0 compatibility/security/capability diagnostics |
| `wt source providers approve <id> [--apply]` | Preview provider trust/capability declaration; explicitly approve locally with `--apply` |
| `wt source enable --lane=<id> --mode=<on-demand\|maintained> --provider=<id>... [--apply]` | Preview lane policy; explicitly enable with `--apply` |
| `wt source disable --lane=<id> [--apply]` | Preview stopping new use; explicitly disable with `--apply`; retention remains separate |
| `wt source status [--lane=<id>] [--repository=<id>]` | M0 view/provider/freshness/lease/resource status |
| `wt source index [--lane=<id>] [--repository=<id>] [--include-dirty] [--include-untracked]` | Explicit staged build/refresh of one authorized view |
| `wt source verify [--view=<id>]` | M0 integrity/source-identity verification without repair |
| `wt source search <query> [--kind=<file\|symbol>] [filters]` | Bounded S0/S1 query |
| `wt source show <source-ref> [--context=<lines>]` | Bounded exact pinned-view slice |
| `wt source references <source-ref> [filters]` | Bounded S2 references |
| `wt source implementations <source-ref> [filters]` | Bounded S2 implementations |
| `wt source dependencies <source-ref> [--direction=<in\|out\|both>]` | Bounded structural neighborhood |
| `wt source impact <source-ref> [--against=<view>]` | Qualified impact candidates, never completeness proof |
| `wt source capsule --batch=<id> --purpose=<purpose> [--write]` | Preview one bounded capsule; persist its manifest only with `--write` |
| `wt source prune [--view=<id>] [--apply]` | Preview lease-aware disposal; delete derived data only with `--apply` |

All commands support human and stable JSON results where finite. Search/query
commands are read-only and never trigger an implicit build; in `on-demand`
mode they return the exact explicit index command required. `source index`,
provider approval, `enable`, `disable`, capsule persistence, and prune use typed plans and
transactional local writes. No command changes participating repositories.

Ambiguous multi-lane/repository selection follows normal Watchtower rules. A
query without an exact current view fails rather than selecting the latest
cache by timestamp.

## 14. Optional MCP and agent facade

MCP is a transport adapter, not the source-intelligence architecture. The
optional facade exposes a compact stable tool set:

```text
source_status
source_search
source_symbol
source_graph
source_read
```

Each tool multiplexes only closed typed operations, keeps descriptions and
schemas compact, applies the same broker authorization/bounds, and returns the
same result envelope. The MCP server receives no mutation, shell, Git write,
provider configuration, raw SQL, or unrestricted filesystem operation.

Agent adapters advertise whether tool schemas are eagerly injected, searched
on demand, or unavailable. Watchtower measures schema/prompt overhead alongside
retrieval savings. Repository instructions may recommend symbolic retrieval,
but Watchtower does not modify project instruction files automatically.

## 15. Security and privacy

1. Canonicalize and authorize every root/path before provider access.
2. Providers run as the approved execution user with least privilege.
3. No provider receives credentials or unredacted environment maps.
4. Network/off-host providers require explicit provider and lane approval plus
   data-residency disclosure.
5. Source is never sent off-host merely because an MCP client is remote.
6. Project plugins/configuration are disabled by default; enabling them is a
   separately reviewed trust decision.
7. Provider logs, manifests, errors, query excerpts, and support reports pass
   path/content/secret redaction.
8. Query results honor lane/repository role access and cannot cross users or
   worktrees through cache hits.
9. Hostile source text is untrusted data and is delimited/sanitized before TUI,
   terminal, JSON, logs, or model context.
10. Prune deletes only manifest-owned derived artifacts after lease checks and
    never touches Git objects or worktree files.
11. Cross-user launch capsules contain only the source evidence authorized for
    that assignment; they do not expose index paths, provider caches, or a
    reusable bearer credential.

## 16. Concurrency, resources, and failure semantics

- One build lease exists per `{provider, source view}`; equivalent concurrent
  requests join observation rather than duplicate work.
- Queries pin immutable ready views and do not hold lane mutation locks.
- Index builds do not hold model/account reservations.
- CPU, memory, disk, process count, file count, build time, query time, and
  background refresh have finite policy limits.
- Maintained mode coalesces source changes and applies backpressure; it does not
  start an unbounded watcher per lane/provider.
- Provider crash, timeout, malformed output, or resource excess terminates the
  provider operation, preserves prior ready views, and emits a stable reason.
- Capability loss makes affected operations unavailable; Watchtower does not
  pretend S0/S1 results provide S2/S3 semantics.
- Disk pressure pauses builds and offers explicit lease-aware pruning; it does
  not evict active/current views or authoritative lane data.
- Cancellation records whether no view was published. Partial provider output
  is never queryable as ready.

## 17. Events and usage accounting

Durable/local events include:

| Event | Meaning |
|-------|---------|
| `source-provider-approved` | Operator accepted provider capability/trust policy |
| `source-enabled` / `source-disabled` | Lane source policy changed |
| `source-build-started` | Staged view build began |
| `source-view-ready` | Verified immutable view published |
| `source-view-outdated` | Requested worktree/config no longer matches view |
| `source-view-corrupt` | Integrity verification failed |
| `source-query-completed` | Bounded query and usage/provenance recorded |
| `source-capsule-created` | Bounded capsule manifest persisted |
| `source-view-pruned` | Derived view deleted after lease/retention checks |

Query accounting records provider, operation, view, records/bytes, estimated
tokens, latency, cache hit, truncation, consumer role, endpoint when known, and
whether the value is measured, reported, estimated, or unknown. It never logs
source excerpts or query text that policy classifies as sensitive.

Watchtower reports:

- retrieval context bytes/tokens avoided or added as an estimate;
- repeated discovery avoided through view/capsule reuse;
- provider/tool-schema overhead;
- index build/refresh time and resources;
- complete-file reads and native-search calls when observable;
- localization/review misses found later; and
- total cost per accepted outcome.

Estimated savings are never presented as provider-reported billing facts.

## 18. Evaluation and adoption gate

Before implementation-pack design, run a disposable, non-product experiment
against representative Nirvana repositories and exact worktree conditions.

### 18.1 Compared modes

1. native `rg` plus bounded file reading;
2. one S1/S2 symbol provider candidate;
3. optional structural graph provider candidate; and
4. host-native retrieval where Cursor or another agent already supplies it.

### 18.2 Task set

- locate a complete CLI-to-adapter execution path;
- change an interface and enumerate implementations/references;
- trace an event across packages/repositories;
- identify impact candidates for a public contract;
- independently review a multi-file change;
- handle decorators, metadata, dependency injection, dynamic imports, generated
  boundaries, path aliases, and unresolved language configuration;
- repeat against clean and dirty views; and
- run two lanes against different worktrees of the same repository.

### 18.3 Measures

- total model input/output/cache usage when reported;
- brokered source bytes and tool/schema overhead;
- tool calls, complete files read, and time to correct localization;
- precision/recall against a human-reviewed expected evidence set;
- tests/proofs passed and independent review verdict;
- missed references and human corrections;
- index build/refresh/query latency, CPU, memory, and disk;
- stale/dirty/cross-worktree isolation correctness; and
- cost and elapsed time per accepted solution.

### 18.4 Verdict

The experiment returns:

- `ADOPT_BASELINE` — quality is non-inferior within the declared fixture and
  accepted-task cost materially improves;
- `ADOPT_LIMITED` — only named languages/tasks/providers are justified;
- `RESEARCH_BLOCKED` — environment/evidence cannot decide safely; or
- `REJECT` — quality, security, isolation, resource, or end-to-end cost fails.

Retrieval-token reduction alone cannot produce adoption. A quality regression,
cross-worktree leak, hidden network/source transfer, unbounded service, or
failure to identify dirty-state staleness is a rejection.

### 18.5 Experiment record and correction gate

SRC-EXP-01 completed with the independently reviewed verdict
`RESEARCH_BLOCKED`. It produced a useful but not fully accepted native
baseline, proved model-free fixture isolation checks, and produced no valid
S1/S2 model outcome. The model made zero provider calls, the direct TypeScript
semantic backend failed during dependency setup, the exact model-visible tool
schema was not captured, native T7 failed its evidence floor, and overlapping
runs invalidated latency comparison. The accepted record is
[SRC-EXP-01-outcome.md](experiments/source-intelligence-evaluation/SRC-EXP-01-outcome.md).

The next evaluation is
[SRC-EXP-02](experiments/source-intelligence-evaluation/SRC-EXP-02-corrected-provider-evaluation.md).
It has two irreversible stages:

1. `PROVIDER_READINESS` proves a schema-valid direct semantic canary, exact
   provider tools visible to the outbound model request, a successful
   model-mediated canary tool call, provider lifecycle/side-effect behavior,
   and clean termination.
2. `COMPARATIVE_EVALUATION` may start only from a complete readiness
   attestation. It reruns all native and indexed tasks sequentially under
   counterbalanced fresh contexts and the precommitted hidden rubric.

A failed or incomplete readiness gate cannot be converted into indexed task
results, savings, or adoption evidence. `REJECT_PROVIDER` in SRC-EXP-02 is a
provider-specific instance of this draft's `REJECT`; it does not reject the
provider-neutral capability.

## 19. Testing strategy

Required future proof includes:

- manifest/source-view identity, deterministic semantic ID, and schema tests;
- clean/staged/unstaged/untracked/rename/delete/submodule worktree matrices;
- same repository across lanes/worktrees/users and relocation collisions;
- ignore, mandatory exclusion, symlink escape, secret, permission, and hostile
  source fixtures;
- each provider capability/language/coverage and unsupported-operation case;
- clean rebuild versus incremental query-equivalence fixtures;
- query bounds, pagination, stable ordering/cursors, cancellation, timeout, and
  malformed-provider output;
- outdated/corrupt/missing view refusal with no unbounded fallback;
- capsule byte/token/record/graph bounds and current-source verification;
- independent reviewer regeneration and stale-capsule rejection;
- coordinator proof that routine cycles receive no source context;
- endpoint-native versus Watchtower/MCP retrieval deduplication;
- MCP schema overhead, authorization, and mutation-denial proof;
- interrupted build, atomic publication, leases, concurrent query/build, disk
  pressure, and prune recovery;
- human/JSON parity, redaction, diagnostics, and read-only hash proof; and
- A/B accepted-outcome evaluation with predeclared tasks and scoring.

## 20. Acceptance criteria

- [ ] Watchtower integrates proven providers through a provider-neutral broker
      and contains no home-grown parser/LSP/vector/graph engine.
- [ ] Required S0/S1 capability is proven on declared languages/platforms;
      optional tiers remain honestly unavailable where unsupported.
- [ ] Every query pins one exact source view and returns bounded provenance,
      coverage, freshness, quality, truncation, and usage fields.
- [ ] Concurrent lanes/worktrees cannot receive one another's dirty source.
- [ ] Indexes remain local, disposable, non-authoritative, and separately
      stored from coordinator pack/session/runtime indexes.
- [ ] Missing/outdated/corrupt indexes never trigger an unbounded or alternate-
      worktree fallback.
- [ ] Pack, implementation, review, coordinator, session, allocation, CLI, and
      optional MCP integrations preserve their existing authority boundaries.
- [ ] Reviewers regenerate current evidence and cannot accept from an
      implementer's capsule alone.
- [ ] Provider/network/plugin/source-transfer behavior is declared, approved,
      isolated, and redacted.
- [ ] Query, capsule, build, background, storage, and retention resources have
      enforced finite limits.
- [ ] A disposable evaluation demonstrates quality-preserving improvement in
      cost per accepted outcome for the adopted task/language scope.
- [ ] Native source reading, build/test/proof tools, and non-source Watchtower
      commands remain first-class and operational without an index.

## 21. Decisions fixed by this draft

| Decision | Outcome |
|----------|---------|
| Product ownership | Watchtower owns lifecycle/contracts/broker; audited providers own indexing engines |
| Authority | Git/source is authoritative; index and capsules are derived evidence |
| Core transport | Provider-neutral application contract; MCP is optional |
| Required baseline | S0 file plus S1 syntax after evaluation acceptance |
| Embeddings | Optional S4 candidate discovery; never required for correctness |
| Activation | Explicit per-lane `off`, `on-demand`, or `maintained`; default `off` |
| Repository writes | None |
| Worktree model | Exact immutable snapshot plus separate dirty overlay |
| Cross-lane reuse | Committed snapshot only with exact identity/policy/access match |
| Query behavior | Closed, bounded, paginated, provenance-bearing; no raw provider language |
| Failure | No full scan, provider substitution, or alternate-worktree fallback |
| Coordinator use | Absent from routine envelopes; explicit bounded D2/D3 use only |
| Review | Current-source verification and independent regeneration required |
| TUI | Future explicit source scope; no silent expansion of v1 global search |
| Success metric | Cost per accepted outcome with non-inferior quality, not tokens alone |

## 22. Open questions

These require experiment evidence or a dedicated implementation pack; an
implementer must not decide them implicitly:

1. Which S1/S2 provider and versions satisfy the first accepted language and
   distribution matrix? Serena 0.1.4 remains unproven after SRC-EXP-01 and may
   be considered only through the corrected readiness gate.
2. Is the minimum shipped provider embedded, packaged as an audited leaf, or a
   separately installed approved capability?
3. Which languages are release-required beyond the initial Nirvana
   TypeScript/JavaScript scope?
4. Can any evaluated provider prove deterministic incremental equivalence, or
   must the first release use clean staged rebuilds?
5. What measured improvement threshold constitutes “material” adoption without
   incentivizing quality loss?
6. Which off-host provider/data-residency policies, if any, are acceptable?
7. Should maintained mode arrive with the first source-intelligence release or
   follow an on-demand-only release?
8. What authenticated local transport, if any, can safely provide live bounded
   queries across Watchtower's multiple OS execution users without creating a
   general daemon, cache disclosure, or filesystem proxy?
