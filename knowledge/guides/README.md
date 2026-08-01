# Coordinator guides

Operational guides extracted from live lanes. Read these **after**
[playbook.md](../playbook.md) and **before** your first long-running coordinator
session.

| Guide | When to read |
|-------|----------------|
| [coordinator-decision-rules.md](coordinator-decision-rules.md) | Every coordinator wake — hard routing rules (review vs implementer, token waste, reject triage) |
| [browser-proof-coordinator-playbook.md](browser-proof-coordinator-playbook.md) | Any lane with AwrUX core-test / CDP / Puppeteer browser proof |
| [lane-watcher-and-closure.md](lane-watcher-and-closure.md) | Lane startup, heartbeat, and **mandatory shutdown** after completion |
| [voice-vs-wake-and-piper.md](voice-vs-wake-and-piper.md) | **Voice ≠ Cursor wake**, notify setup, Piper vs espeak |
| [three-runtime-lessons.md](three-runtime-lessons.md) | **Mandatory runtime lessons:** notify, voice scrollback, post-accept cleanup, and Codex CLI supervision |

## Reference lanes

| Lane | Path |
|------|------|
| HtmlTreeUpdater (first template instance) | [examples/html-tree-updater/README.md](../../examples/html-tree-updater/README.md) |
| RouteGroup extensions v2 (ten-batch DOM + FRAME) | [examples/route-group-v2/README.md](../../examples/route-group-v2/README.md) |

## How these guides relate to template files

| Normative surface | Role |
|-------------------|------|
| `docs/playbook.md` | End-to-end lifecycle and wake checklist |
| `template/coordinator/coordinator-policy.md` | Short policy copied into each lane's runtime coordinator dir |
| `template/coordinator/coordinator-agent-brief.md` | Per-lane brief pasted into Cursor |
| **`docs/guides/*`** | Lessons learned, failure modes, and recovery playbooks too long for briefs |

When a guide and a brief disagree, **update the guide and playbook first**, then
sync the template policy/brief on the next lane bootstrap.
