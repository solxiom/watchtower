# Watchtower v1 Bootstrap Implementation-Pack Acceptance

Verdict: **ACCEPT**

Status: **Implementation-ready — dispatch authorized by dependency order**

Reviewed: 2026-07-31

Reviewer role: Watchtower specification architect

Review session: `wt-spec-architecture-2026-07-31`

## Scope and bootstrap boundary

This review accepts the six implementation packs used to construct Watchtower
before the `wt init` pack consumer exists. It is the one-time bootstrap
acceptance instrument referenced by the pack READMEs. It does not relax the
structured `implementation-pack.json`, `pack-acceptance.json`, and
`implementation-pack.lock.json` contract for lanes created by the product.

The accepted product specifications, `AGENTS.md`, the mandatory engineering
and review standard, the Nirvana integration architecture, all pack-level
documents, all 59 work/review brief pairs, and all 118 launch prompts were in
scope.

## Findings closed during review

| Finding | Severity | Disposition |
|---------|----------|-------------|
| `PACK-COUNT-STALE` — root/release material still described the pre-TUI 53-batch plan | Critical | Closed: all active totals and release gates now use 59; Pack 5 uses 24; pre-release work uses 55. |
| `PACK-EXIT-STALE` — release qualification depended on CA-18 instead of the actual Pack 5 exit CA-24 | Critical | Closed: REL-01 and cross-pack gates now depend on CA-24. |
| `TUI-PICKER-CONFLICT` — v1 selection prose prohibited the bounded TUI picker authorized elsewhere | Major | Closed: one-shot/JSON commands fail closed; only TUI entry may use the model-free picker. |
| `ACCEPTANCE-COMMIT-SELF-REFERENCE` — acceptance JSON was required to contain the hash of its own containing commit | Critical | Closed: `reviewedCommit` identifies the reviewed candidate; the later acceptance publication commit must descend from it. Schema and LC-02 briefs are synchronized. |
| `PACK-STATUS-STALE` — author-complete packs still declared themselves non-dispatchable drafts | Major | Closed: bootstrap acceptance status and the product-pack distinction are explicit. |

No open critical, major, or minor finding remains.

## V1 endpoint-adapter amendment review

Reviewed and accepted on 2026-07-31. The amendment closes a planning gap in
which the allocation spec described OpenCode/Hermes discovery and dynamic
free-capable routing while CA-06 prohibited concrete adapters.

- OpenCode is now a required concrete v1 decision-endpoint adapter and must
  pass batch, end-to-end, and global-install qualification.
- Hermes ships behind the same contract and is qualified when installed;
  absence is an explicit non-failing skip, never a false support claim.
- Hard capability, access, freshness, independence, bounds, and reserve checks
  precede economics. Free-capable preference cannot lower quality.
- Executable/catalog/model/capability fingerprints invalidate stale evidence,
  and aliases sharing an entitlement use one capacity pool.
- Knowledge installation remains the Codex/Cursor/Claude surface; decision
  endpoint support is a separate contract.

The amendment changes Pack 5 and Pack 6 only. Their briefs, independent review
gates, roadmaps, trackers, implementation map, release criteria, and normative
contracts were rechecked together. No implementation source was reviewed or
accepted by this amendment, and RM-01 remains governed by its own active review.

## RM-02 closed-envelope clarification

Reviewed and accepted on 2026-07-31. The RM-02 work/review briefs incorrectly
requested an extra optional top-level command-envelope field even though the
normative schema deliberately sets `additionalProperties: false` on
`commandResult`, `commandError`, and the nested `error` object.

The correction preserves the schema and narrows the compatibility proof to
locations the schema explicitly permits: extensible objects carried by `data`,
`error.details`, and referenced payload definitions with
`additionalProperties: true`. Unknown properties on closed envelope/error
objects must fail with the stable typed contract error; malformed external
input must not panic the process. No product implementation is accepted by this
clarification.

Pack 1 was re-reviewed from the staged Git candidate, not the dirty DB-01
working tree. The new Pack 1 seal includes the already reviewer-accepted RM-01
pack updates and this four-file RM-02 clarification; uncommitted DB-01 work and
local correction artifacts are excluded.

## Specification-resolution lifecycle amendment

Reviewed and accepted on 2026-07-31. The prior contracts could detect and hold
on normative contradictions, but did not close the operational path from a
blocked worker through architect advice, authoritative amendment, independent
pack acceptance, atomic activation, worktree synchronization, and resumption.

The v1 amendment now requires:

- an impact-scoped `NORMATIVE_CONTRADICTION` D3/C5 hold while unrelated work
  continues;
- bounded C5 architect advice with proposal authority only;
- separate spec-authority confirmation, pack authorship, and independent pack
  review;
- seal- and commit-bound amendment admission plus atomic active-revision
  replacement through the sole effect executor;
- explicit, validated worktree synchronization with no automatic rebase or
  merge; and
- replay-safe resumption of the same durable worker and operator session.

Pack 2 policy seeding, Pack 5 implementation ownership, Pack 6 release proof,
the implementation map, schemas, and normative product contracts were checked
together. The exact cross-batch responsibilities and acceptance fixture are in
`wt-coordinator-automation/specification-resolution-batch-amendment.md`. This
amendment accepts specification and planning changes only; it does not accept
any product implementation.

## Acceptance matrix

| Gate | Verdict | Evidence |
|------|---------|----------|
| Specification and batch scope | PASS | Accepted v1 documents; 59 mapped work batches and 59 matching review batches. |
| Layering and responsibilities | PASS | Pack rules consistently require thin commands, capability-owned foundation modules, named adapters, and one effect authority. |
| Nirvana-first API use | PASS | Global engineering policy and pack launch contracts require a per-batch Nirvana API audit and explicit `NIRVANA_API_GAP`. |
| NVB task-runtime and facade boundaries | PASS | `LaneTaskRunner` is the sole internal NVB boundary; project-root tasks, arbitrary task selection, and workflow shell are hard rejects. |
| Size and complexity limits | PASS | Exact category limits and structural rejection rules are forwarded through pack quality/launch contracts. |
| Contracts and failure behavior | PASS | Versioned schemas, negative proof, recovery, boundedness, and fail-closed amendment rules are assigned to owning batches. |
| State/effect/security boundaries | PASS | Canonical journals/files remain authority; SQLite is derived; proposals cannot mutate; effects use one validator/executor. |
| Tests and build/dist proof | PASS | Each brief has paired independent review; pack exits assign build, test, distribution, global-install, PTY, recovery, and release proof. |
| Help/schema/spec synchronization | PASS | Command-owning batches and REL-04 explicitly own help, schema, status, and normative-document synchronization. |

## Structural proof

- Batch pairing: **59 work briefs, 59 review briefs**.
- Launch coverage: **59 work prompts, 59 review prompts**.
- Local Markdown-link audit: **301 active implementation documents, zero
  missing local targets**.
- Schema syntax: `docs/spec/schemas/v1.schema.json` parses as JSON.
- Stale active gates: no active reference to a 53-batch completion gate,
  18-batch Pack 5 exit, or CA-18 release dependency remains.
- Historical monolithic CA-18 material remains isolated under `historical/`
  and is non-dispatchable.

## Bootstrap pack seals

Each seal is SHA-256 over the UTF-8 sequence of sorted records:

```text
<pack-relative-path> NUL <byte-count> NUL sha256:<raw-file-digest> LF
```

Every regular file under the named pack directory is included, including
historical material; directories and this external acceptance record are not.
Any byte, path, or file-set change invalidates that pack's bootstrap seal and
requires a new review.

| Pack | Files | Bytes | Seal |
|------|------:|------:|------|
| `wt-read-model` | 57 | 595157 | `sha256:4697db5f28d44170ab43015f1e9cf2233bc08f54a84983e4f978b80683671c64` |
| `wt-runtime-distribution` | 38 | 384487 | `sha256:4d5fb75baea0b67511022452a5be648f9b567b7d09c5711f7e5a7cda660e2b66` |
| `wt-lane-lifecycle` | 42 | 564755 | `sha256:1dce0c77a3d0ca5c5526bc7f76c22cbf65c50df0c35927363467daf0fc4e19cd` |
| `wt-upgrade-knowledge` | 30 | 448690 | `sha256:d98b7cbec26fcc6ef5dba41d7cbc9a40367afdd33c7de697c046b2dd622ea37c` |
| `wt-coordinator-automation` | 114 | 1255621 | `sha256:075345239cb9a9759a64d7bdcfc7cc94c64ef424de121e2be91a808ac1f046d8` |
| `wt-v1-release` | 26 | 400537 | `sha256:3601b4d68846b770cc05f2f287f65b66f4ba2218ee2522f73a49c8121471b45f` |

## Dispatch decision

The specification and bootstrap implementation packs are accepted and ready
for implementation. Dispatch starts with `RM-01`. No later batch may bypass
the dependencies and independent implementation-review gates in
`docs/spec/v1-implementation-map.md`.
