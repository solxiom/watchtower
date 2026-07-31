# Batch CA-20 — Conversation Timeline, Composer, History, and References

## Authority And Status

Governing sources: `AGENTS.md`, the mandatory engineering standard,
`v1-contracts.md`, `v1.md`, `nirvana-integration-architecture.md`,
`architecture.md`, `v1-implementation-map.md`, `operator-session.md`,
`cli-session.md`, `tui-operational-experience.md`, and pack quality rules.
Required interfaces are normative in this pack's
`tui-interface-contracts.md §CA-20 Conversation Contract`.

Status: ❌ Not started
Depends on: CA-16 and CA-19 accepted
Unblocks: CA-22
Reasoning floor: implementor `R5`; reviewer `R5`

## Objective

Implement the bounded conversation viewport and secure multiline composer:
virtualized retained turns, structured turn/proposal blocks, history,
completion, paste capsules, and authorized references without loading full
session history or creating another durable memory.

## Owned Capabilities

- `ConversationViewport` and virtualized page/overscan controller
- typed `TurnBlock` and `ProposalBlock` presentation
- `Composer` editor state and submit/newline action handling
- bounded history and optional retention-coupled local cache adapter
- cancellable completion and reference-picker controllers
- authorized reference insertion and paste-capsule presentation
- bounded owner-only composer draft recovery and index-bounded timeline search

Exact owned production modules:

- `src/contracts/tuiConversation.ts`
- `src/presentation/tui/ConversationViewport.ts`
- `src/presentation/tui/TimelineWindow.ts`
- `src/presentation/tui/TurnBlock.ts`
- `src/presentation/tui/ProposalBlock.ts`
- `src/presentation/tui/Composer.ts`
- `src/presentation/tui/CompletionController.ts`
- `src/presentation/tui/ReferencePicker.ts`
- `src/foundation/OperatorHistoryCache.ts` only if the optional cache ships

Exact focused specs use matching names under `spec/basic/tui/`; path/security
integration belongs in `spec/integration/tui/ConversationReferenceSpec.ts`.
No unnamed helper or alternative owner may be added without amending the brief.

## Required Interfaces And Work

1. Consume CA-16 bounded session queries/cursors and CA-19 shell/focus/action
   contracts. Components never read journals, SQLite, stores, or files directly.
2. Render retained validated turns, failures, interruptions, proposals, stable
   IDs, routing/budget/staleness metadata, and a provisional slot for CA-22.
3. Page around the viewport with finite overscan. Preserve anchor across
   prepend, resize, reflow, compaction tombstones, and later live-edge updates.
   Memory is proportional to viewport plus declared caches.
4. Implement multiline cursor/selection editing, word/line deletion, bounded
   paste capsules, `/msg`, safe optional `$EDITOR` delegation through an
   accepted capability, and deterministic submit/newline bindings.
5. Implement exact slash tokenization: known command, invalid known command,
   unknown `/word` error, `//` natural-language escape, and embedded slash text.
   Unknown commands never become paid turns.
6. Implement bounded cancellable completion for commands/options/session IDs
   and authorized references. Revision-tagged stale results cannot replace
   newer input.
7. Resolve explicit batch/event/finding/requirement/turn/session/file
   references through accepted resolvers. Reject ambiguity, traversal, symlink
   escape, unauthorized/uncommitted content, credentials, and over-limit input
   before journaling or model use.
8. Couple any optional editor cache to owner-only permissions and the exact
   retention/prune/privacy rules. It is finite and never authoritative.
9. Implement the exact draft identity, 32 KiB/20-draft/seven-day bounds,
   restore choice, durable-append deletion point, quarantine, and privacy
   coupling in `tui-operational-experience.md §5`.
10. Search only validated paged indexes with visible scope, revision,
    staleness, truncation, and finite query/result/time/excerpt limits.

## Exclusions

- No provider invocation, streaming reducer, notification watcher, concurrency
  policy, observer behavior, effect application, or public command ownership.
- No full-history/full-pack fallback, transitive cross-session reference, raw
  filesystem access from components, or terminal escape trust.
- No new general editor, Markdown, width, ANSI, or collection framework.

## Required Proof

- 0/1/large retained timelines; paging both directions; compaction tombstones;
  resize/reflow; stable anchor; viewport-proportional memory.
- Multiline editing, selection, Unicode/combining text, paste boundaries,
  submit/newline, history search, and cache prune/privacy coupling.
- Crash/restart/durable-append races, recovery keep/discard, expiry, identity
  mismatch, limit pressure, and proof drafts never enter journal/model context.
- Timeline search proves index-only access, cancellation, bounds, and no model
  or raw-journal/full-pack fallback.
- Slash classification matrix proving zero model use for commands/errors.
- Completion cancellation/revision races and every authorized/denied reference
  type, including path traversal, symlink, secret, ambiguity, and size attacks.
- Structured block accessibility and hostile terminal-content handoff to the
  shared sanitizer boundary.
- `nvb build`, `nvb test`, architecture gates, line counts, and Nirvana audit.

## Documentation And Report

No public command change is expected. Write
`.local/agent-reports/coordinator-automation/CA-20-conversation-timeline-composer-history-and-references.md`
with query/page bounds, memory measurements, reference matrix, cache policy,
files, line counts, and the CA-22 handoff. Do not commit.

## Independent Review

Use `../review-batches/CA-20-review-conversation-timeline-composer-history-and-references.md`.
The reviewer independently regenerates memory, anchor, slash, race, reference,
path-security, retention, structure, and test evidence.
