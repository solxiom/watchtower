# Agent Launch Prompt — Work Batch CA-22

Include and obey `../agent-launch-contract.md`.

Reasoning floor: `R5`
Paired brief: `CA-22-turn-streaming-notifications-concurrency-and-observer-ui.md`
Required predecessors: accepted CA-17, CA-20, and CA-21

Mission: implement typed turn reduction, bounded provisional streaming,
validated replacement, notifications, live-edge anchoring, same-session
contention/wait, and M0-only observers. No daemon, provisional IPC, duplicate
turn, unbounded queue, or lock across model work.

Report:
`.local/agent-reports/coordinator-automation/CA-22-turn-streaming-notifications-concurrency-and-observer-ui.md`.
Hand off lifecycle states and every queue/cache bound to CA-23/CA-24.
