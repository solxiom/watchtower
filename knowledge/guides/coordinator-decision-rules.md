# Coordinator decision rules

Hard routing rules for coordinators. These exist because **mis-routing costs
tokens and calendar time** — especially when a reviewer rejects for an
environment problem the coordinator could fix with one nudge.

Source: RouteGroup extensions v2 lane (DOM-A through FRAME-E, 2026-07-18).

---

## Rule 1 — Triage reviewer rejects before routing correction

When a reviewer **REJECT**s, ask:

> Is the defect in **implementation** (code, docs, proof claims), or only in
> **reviewer execution** (browser launch, wrong account, wrong path, Snap/cgroup)?

| Situation | Coordinator action | Do **not** |
|-----------|-------------------|------------|
| Reviewer could not launch browser; implementer already recorded terminal bridge reports on an approved account | **Nudge reviewer** with approved `CHROMIUM_PATH` and rerun commands ([browser-proof playbook](browser-proof-coordinator-playbook.md)) | Send correction 01 to implementer |
| Reviewer ran proof independently and matrix failed | Route correction to **implementer** (same tmux; upgrade model per plan) | Nudge reviewer to ACCEPT |
| Docs/spec audit failed | Route correction to **implementer** | Ask reviewer to rerun browser proof only |
| Reviewer never tried approved browser paths listed in handoff | **Nudge reviewer** first with those paths | Accept reject as final |

**FRAME-E example (mistake):** Implementer ran **167/167** under the primary
account. Reviewer on a secondary account rejected because puppeteer-cache Chrome
was missing **on that account** and Snap Chromium failed cgroup checks. The
coordinator routed **correction 01 to the implementer** — wasted implementer
tokens. Recovery: nudge reviewer with Flatpak Chrome path → independent re-review
→ **ACCEPT in minutes**.

**Correction briefs are for implementer work gaps**, not reviewer environment
misses the coordinator can fix immediately.

---

## Rule 2 — Stop the implementer when reviewer recovery supersedes correction

If you already nudged the **reviewer** to rerun proof (Rule 1), and the
implementer is still doing redundant correction work (rerunning the same matrix,
regenerating raw JSON, rewriting closure tables):

1. **Interrupt** the implementer session (`Escape` / `/stop` — not `tmux kill-session`)
2. Send an explicit **Coordinator STOP** message: idle until reviewer verdict
3. Resume implementer **only** if reviewer REJECTs with a **substantive** defect
   (failed tests, wrong docs, missing proof — not env)

Duplicate proof generation is pure token waste.

---

## Rule 3 — A blocker is not a review handoff

When the implementer reports `blocked`, `blocker`, `cannot continue`, `stalled`,
`stuck`, `needs help`, or `waiting on operator`, the coordinator must inspect
the blocker and recover the **implementer** first. If operator input is needed,
ask the operator a focused question. Do not dispatch the reviewer, create a
review batch, or treat the turn as acceptance-ready.

This rule has priority even when the same turn also contains `acceptance-ready`
or `not acceptance-ready`; those phrases may be part of the blocker explanation.
Review is allowed only after a later implementer turn is complete and explicitly
acceptance-ready.

---

## Rule 3 — Never nudge the implementer during active review

When `lane_phase=review` and the reviewer tmux is **Working**:

- Implementer idle is **expected**
- Do **not** nudge implementer for progress checks
- Do **not** start correction work until a formal REJECT names implementer-owned gaps

Exception: operator explicitly asks implementer to continue something parallel.

---

## Rule 4 — Nudge the reviewer when idle at verdict time

When handoff is **acceptance-ready** and reviewer tmux is **idle** at prompt
without ACCEPT/REJECT:

- Nudge with `coordinator-nudge-message.sh reviewer <BATCH>` plus handoff paths
- Do **not** relaunch reviewer tmux if session still exists — same session until ACCEPT

When reviewer rejected for env and you applied Rule 1:

- Nudge reviewer to **resume** in the **same** session with browser path — do not
  spawn a second reviewer unless the first session is dead.

## Rule 4a — Review is an implementation-tree lock

When review starts, immediately send the implementer a Coordinator STOP. Keep
the implementer stopped until the reviewer gives a **final** verdict. Never
resume implementation because the reviewer says an intermediate correction is
accepted while continuing proof or editing.

Before accepting, verify the reviewer current-turn slice is settled, contains
the final ACCEPT, and has a reviewer-owned acceptance commit. A phrase such as
“Correction 01 accepted” is not sufficient while the reviewer is still Working,
running proof, editing, or reporting another defect.

---

## Rule 5 — Whole-lane ownership until explicit closure

On batch N **ACCEPT**:

1. `coordinator-step.sh <BATCH>-accepted` (push + voice + close batch sessions)
2. Update lane state + trackers
3. **Immediately** launch batch N+1 implementer unless operator paused

Do **not** end the coordinator session because "one batch is done."

On batch 10 / final batch **ACCEPT**:

1. Run `coordinator-step.sh lane-complete`
2. **Stop the watcher** ([lane-watcher-and-closure.md](lane-watcher-and-closure.md))
3. Clear `implementer_tmux` / `reviewer_tmux` in lane state (`active_batch=none`)

---

## Rule 6 — Always keep all trackers updated

Coordinator **must** sync every tracker in the lane manifest on **every wake** and after launch/accept/reject/cleanup — before nudges or pipelines.

Agents forget tracker rows. The coordinator:

- **Patches** factual fields from handoff reports, commits, and proof
- **Does not** invent ACCEPT/REJECT without reviewer verdict
- **Does not** skip tracker sync because the lane is "just monitoring"

Run `coordinator-refresh-tracker.sh` every wake; patch stale files in the same cycle.

---

## Rule 7 — Post-accept session cleanup

After reviewer ACCEPT and push:

- Run `coordinator-close-batch-sessions.sh <BATCH>` (wired in `coordinator-step.sh`)
- Prevents stale tmux panes and accidental re-nudges to finished agents

---

## Rule 8 — Reject model upgrade (same tmux)

| Implementer type | On REJECT |
|------------------|-----------|
| Codex (terra/medium) | `./codex-upgrade-model-in-session.sh <tmux> gpt-5.6-sol medium` — stay in same session |
| Claude Opus | **Stay on Opus** — do not downgrade |

Reviewers: follow `model-plan.md`; env recovery nudges do not require model change.

---

## Rule 9 — Acceptance commit ownership

| Role | Commits |
|------|---------|
| Implementer | **No** acceptance commit |
| Reviewer | **Owns** acceptance commit on ACCEPT |
| Coordinator | **Never** commits; pushes after accept |

## Rule 10 — Durable events, never scrollback

The watcher dispatch signal is the provider-neutral `worker-events.jsonl`
record. A worker writes it through `coordinator-worker-event.sh`; the watcher
validates the active batch, role, and session before waking the coordinator.

Do not use tmux completion labels or handoff/verdict prose as lifecycle
evidence. Tmux remains for recovery observations only. Existing sessions
launched before this protocol need manual closure; every new session receives
the event command in its composed runtime prompt.

### Legacy scrollback safety

Use scrollback only to recover safety prompts, overload, attention, or a missing
session. It is not an alternative completion detector.

---

## Rule 11 — Recover API overload before changing lane state

Treat `API Error: 529`, `Overloaded`, and concrete retry output as an urgent
worker stall. Claude's persistent `manual mode on` UI is not a stall signal.
The watcher emits this once for the current turn even if the CLI did not
produce a new completion marker.

1. Let the displayed retry finish.
2. If the worker remains at a prompt, inject one continuation for the same
   task and assigned model.
3. Keep the batch in its current phase; an overload is not a handoff, verdict,
   blocker requiring operator authority, or authorization to relaunch a worker.

Before any ACCEPT action, require an explicit final reviewer verdict. A phrase
such as `No acceptance commit` must never satisfy the acceptance detector.

## Quick decision flowchart

```text
Reviewer REJECT received
        │
        ▼
  Env / browser launch only?
    │              │
   yes             no
    │              │
    ▼              ▼
Nudge reviewer   Nudge implementer
with CHROMIUM    with correction brief
+ rerun cmds     + model upgrade if Codex
    │              │
    ▼              ▼
Stop implementer  Wait for acceptance-ready
if already          re-handoff → same reviewer
rerunning same      session re-review
matrix
```
