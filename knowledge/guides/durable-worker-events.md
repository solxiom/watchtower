# Durable worker events

Coordinator lane advancement is provider-neutral. It does **not** infer a
handoff, ACCEPT, or REJECT from tmux scrollback, UI labels, or prose.

## Protocol

Every launcher composes a runtime prompt containing one final event command.
Workers append exactly one JSON record through:

```bash
./coordinator-worker-event.sh handoff|blocked|accept|reject "report=<path>"
```

The command records an event ID, UTC timestamp, batch, role, and tmux session
in `coordinator/worker-events.jsonl` under a file lock.

| Role | Valid final events |
|---|---|
| Implementer | `handoff`, `blocked` |
| Reviewer | `accept`, `reject` |

The watcher consumes each append once, and wakes only when its batch, role, and
session match the active lane state. It does not advance the lane itself; the
coordinator still verifies that the worker is settled and applies the normal
accept/reject rules.

## Provider boundary

This works equally for Codex, Claude, or another interactive provider because
the event is a normal shell command. Decorative UI phrases such as `Worked for`
or `Cooked for` are not a contract and must never be used for lifecycle
decisions.

Tmux observation remains a recovery aid for safety-choice prompts, API
overload, attention requests, and missing sessions. Those observations must
never be treated as a handoff or verdict.

## Existing sessions

Sessions launched before this protocol do not gain an event automatically.
The coordinator must finish their already-active turn manually and use the new
protocol on every subsequently launched worker session.
