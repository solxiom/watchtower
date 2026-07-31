# CA-18–CA-24 TUI Traceability

Status: **Accepted and bootstrap-sealed**
Date: 2026-07-31

This table proves that the full-screen amendment has one work owner, one
independent review owner, and one final acceptance location for every normative
responsibility. It does not authorize dispatch or replace the briefs.

| Normative responsibility | Work owner | Independent proof owner | Final closure |
| --- | --- | --- | --- |
| Node `>=26.4.0`, FFI bootstrap, OpenTUI/Nirvana compatibility | CA-18 | REV-CA-18 | CA-24 consumes accepted matrix |
| Native artifacts, dist/global install, non-TUI isolation | CA-18 | REV-CA-18 | CA-24 repeats release paths |
| Exact target promotion and local/tmux/SSH invocation matrix | RT-03, CA-18 | REV-CA-18, REV-CA-23 | CA-24 evidence index |
| Zero/one/many-lane entry and first-run state | CA-19 | REV-CA-19 | CA-24 command proof |
| Canonical shell, right inspector, responsive breakpoints | CA-19 | REV-CA-19 | CA-24 end-to-end |
| Focus, P0–P5 attention, action/keymap, themes, preferences, bounded motion | CA-19 | REV-CA-19 | CA-23 accessibility; CA-24 |
| Virtualized conversation, anchor, bounded rendering memory | CA-20 | REV-CA-20 | CA-24 scale/soak |
| Composer, draft recovery, slash parsing, history, completion, references | CA-20 | REV-CA-20 | CA-24 command/end-to-end |
| Bounded timeline/global search and attention navigation | CA-20, CA-21 | REV-CA-20, REV-CA-21 | CA-24 scale/model-free proof |
| Nine bounded model-free inspector views and allocation source boundary | CA-21 | REV-CA-21 | CA-24 end-to-end |
| Palette/action parity and confirmation overlays | CA-21 | REV-CA-21 | CA-24 authority audit |
| Provisional streaming and validated replacement | CA-22 | REV-CA-22 | CA-24 replay/soak |
| Notifications, stale invalidation, cross-attachment contention/wait, observer UI | CA-22 | REV-CA-22 | CA-24 concurrency |
| Signals, suspend/resume, idempotent restoration | CA-23 | REV-CA-23 | CA-24 packaged smoke |
| Terminal injection/bidi/clipboard/title/hyperlink security | CA-23 | REV-CA-23 | CA-24 security gate |
| No-color, high contrast, reduced motion, accessible mode | CA-23 | REV-CA-23 | CA-24 end-to-end |
| Preference/cache migrations and semantic visual-state catalog | CA-19, CA-23 | REV-CA-19, REV-CA-23 | CA-24 evidence index |
| TUI doctor and explicit redacted support report | CA-21, CA-24 | REV-CA-21, REV-CA-24 | REV-CA-24 |
| Session/ask/lifecycle command and help integration | CA-24 | REV-CA-24 | REV-CA-24 |
| 30/300/3,000/10,000 context invariance | CA-24 | REV-CA-24 | REV-CA-24 |
| Long-session/session-count replay and bounded memory | CA-24 | REV-CA-24 | REV-CA-24 |
| M0 model-free, one effect executor, no generation lock | CA-24 | REV-CA-24 | Pack 5/M6 |

## Direct Normative Routing

| Spec area | Owning batches |
| --- | --- |
| `cli-session.md §5` layout/focus/entry | CA-19, CA-21, CA-24 |
| `cli-session.md §6` presentation architecture | CA-19, CA-22 |
| `cli-session.md §7–§8` turns/streaming | CA-22 |
| `cli-session.md §9` commands/actions/observer | CA-21, CA-22, CA-24 |
| `cli-session.md §10–§11` input/history/references | CA-20 |
| `cli-session.md §12` concurrency/notifications | CA-22 |
| `cli-session.md §13` terminal lifecycle | CA-23 |
| `cli-session.md §14.1–§14.3` visual/accessibility | CA-19, CA-23 |
| `cli-session.md §14.4` renderer/FFI | CA-18 |
| `cli-session.md §14.5` terminal security | CA-23 |
| `cli-session.md §14.6` performance/resources | CA-19–CA-24, closed by CA-24 |
| `cli-session.md §15` preferences | CA-19, CA-20 |
| `cli-session.md §16–§17` testing/acceptance | CA-18–CA-24 |
| `tui-operational-experience.md §2` platform/support | RT-03, CA-18, CA-23, CA-24 |
| `tui-operational-experience.md §§3–4` entry/attention | CA-19, CA-22, CA-24 |
| `tui-operational-experience.md §§5–6` drafts/conflicts | CA-20, CA-22, CA-24 |
| `tui-operational-experience.md §§7–9` inspector/doctor/search | CA-20, CA-21, CA-24 |
| `tui-operational-experience.md §§10–11` compatibility/visual catalog | CA-19, CA-23, CA-24 |

## Repack Completion Checklist

- [x] CA-18–CA-24 work briefs exist.
- [x] CA-18–CA-24 independent review briefs exist.
- [x] CA-18–CA-24 work/review launch prompts exist.
- [x] Shared launch contract preserves common safety instructions once.
- [x] Framework-neutral cross-batch interface contracts are explicit.
- [x] README, roadmap, tracker, indexes, reasoning classes, counts, and
      dependency graph describe 24 batches.
- [x] Historical monolithic CA-18 artifacts are explicitly non-dispatchable.
- [x] Independent bootstrap pack review reproduced counts, links,
      dependencies, ownership, precedence, and proof coverage.
- [x] Accepted exact bootstrap bytes are sealed by
      `../pack-acceptance-review.md`.

The bootstrap pack gate is accepted. Individual implementation batches remain
subject to their dependency and paired independent review gates.
