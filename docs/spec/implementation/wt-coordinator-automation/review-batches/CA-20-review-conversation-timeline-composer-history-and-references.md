# Review Batch CA-20 — Conversation timeline, composer, history, and references

## Synchronized batch execution matrix

- **Accepted-map title:** Conversation timeline, composer, history, and references
- **Dependencies:** `CA-16`, `CA-19`
- **Exclusive ownership/interface:** conversation/composer components
- **Implementer/reviewer floor:** R5 / R5
- **Mandatory batch proof:** Virtualized paging; multiline input; bounded draft recovery; paste; completion; index-bounded timeline search/reference pickers; scroll anchoring
- **Implementation report:** `.local/agent-reports/wt-coordinator-automation/CA-20-conversation-timeline-composer-history-and-references.md`
- **Review report:** `.local/agent-reports/wt-coordinator-automation/reviews/CA-20-conversation-timeline-composer-history-and-references-review.md`
- **Correction report:** `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-20-conversation-timeline-composer-history-and-references-correction-<NN>.md`
- **Shared execution/review method:** [agent launch contract](../agent-launch-contract.md)
- **Status authority:** the implementer records only handoff/correction readiness for this batch; only an independent reviewer records reject/accept, and publication remains a separate serialized effect.

Status: ❌ Not started
Paired work: CA-20
Reviewer floor: `R5`; reviewer owns acceptance commit.

Read the paired brief and all governing sources it names. Apply the mandatory
engineering review matrix, independently inspect CA-16/CA-19 contracts, and do
not accept implementor measurements or security claims without reproduction.
Verify the exact file and interface surface in the paired brief and
`tui-interface-contracts.md §CA-20`.

## Independent Proof

- Treat `tui-operational-experience.md §§5 and 9` as normative. Reproduce every
  draft bound, keep/discard/expiry/quarantine/privacy path, append race, and
  prove no implicit journal/model inclusion.
- Prove timeline search is revision-tagged, finite, index-only, model-free, and
  has no raw-journal/full-pack fallback.

- Reproduce empty/small/large/compacted timelines, bidirectional paging,
  prepend/reflow/resize anchoring, and viewport-plus-overscan memory bounds.
- Prove no full-history, raw-journal, SQLite, or transitive-reference fallback.
- Exercise multiline editing, selection, Unicode, paste capsules, submit/
  newline, history search, and privacy/prune coupling of optional cache.
- Independently verify exact slash matrix; unknown/invalid commands invoke no
  model and cannot fall through to natural language.
- Race completion revisions/cancellation and reproduce every valid/invalid
  batch/event/finding/requirement/turn/session/file reference.
- Attack traversal, symlink escape, secret/uncommitted file access, ambiguity,
  huge input, malformed Unicode, and hostile terminal content.
- Trace components to bounded interfaces only; verify optional editor launch
  uses an accepted narrow capability and no shell interpolation.
- Run build/test/architecture gates and reproduce line counts and Nirvana audit.

Reject on independent durable history, unbounded caches/pages, stale completion
overwrite, unauthorized reference access, slash-to-paid-turn fallback, direct
store/filesystem/provider imports, or any failed mandatory gate. No conditional
acceptance.

Write
`.local/agent-reports/coordinator-automation/reviews/CA-20-conversation-timeline-composer-history-and-references-review.md`;
handoff exact bounds and interfaces to CA-22.

## Batch-specific interface and negative-case contract

The exclusive owned interface set is **conversation/composer components**. Before issuing a verdict, resolve those named owners to exact existing or proposed modules, public symbols, schema/help/task identifiers, and focused specs in the assigned checkout. Record that source-backed mapping in `.local/agent-reports/wt-coordinator-automation/reviews/CA-20-conversation-timeline-composer-history-and-references-review.md`. Do not move behavior into a generic helper, a command, a TaskHandler, a mutable registry, workflow shell, or an adjacent batch owner.

Accepted predecessor input is exactly **`CA-16`, `CA-19`**. Treat predecessor artifacts, filesystem bytes, JSON, SQLite values, environment values, and process output as `unknown` until validated into a closed contract. The required observable assertion is exactly: **Virtualized paging; multiline input; bounded draft recovery; paste; completion; index-bounded timeline search/reference pickers; scroll anchoring**.

Apply this failure order and report the first stable typed reason at each boundary: syntax/schema validation; canonical identity and accepted predecessor validation; authorization/capability/current-state fences; side-effect-free planning; bounded lock acquisition only when mutation is authorized; one effect through the accepted owner; durable verification; then replay-safe event publication. Any pre-commit failure leaves authoritative bytes unchanged. Resolve any uncertain or post-commit outcome from durable state before retry.

Concrete negative proof selected for **conversation/composer components** and **Virtualized paging; multiline input; bounded draft recovery; paste; completion; index-bounded timeline search/reference pickers; scroll anchoring**:

- malformed, missing, extra, duplicate, and unsupported values produce the exact typed reason and never partially succeed;
- missing, stale, corrupt, incompatible, or unaccepted predecessor evidence fails closed before owned output or authoritative state changes;
- canonical-path, traversal, symlink, permission, checksum, relocation, and partial-artifact cases are proved at every owned filesystem or installed-byte boundary;

Run focused unit/integration/adversarial specs first, then `git diff --check`, `nvb build`, `nvb test`, and `nvb dist` plus isolated/relocated execution whenever package or runtime bytes are involved. The report includes exact commands and outcomes, changed-file responsibility and line inventory, Nirvana/Nira symbols inspected and each precise `NIRVANA_API_GAP`, ownership, Git hygiene, and the complete engineering-standard matrix.

Review source, diff, tests, artifacts, and durable evidence independently; never repair. Any failed row writes `.local/agent-reports/wt-coordinator-automation/reviews/corrections/CA-20-conversation-timeline-composer-history-and-references-correction-<NN>.md` and exactly one reject while preserving unrelated ready work. Only an all-pass result writes `.local/agent-reports/wt-coordinator-automation/reviews/CA-20-conversation-timeline-composer-history-and-references-review.md`, emits one accept, and permits the reviewer-owned acceptance commit.
