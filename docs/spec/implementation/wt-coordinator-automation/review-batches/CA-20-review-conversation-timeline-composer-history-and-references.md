# Review Batch CA-20 — Conversation Timeline, Composer, History, and References

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
