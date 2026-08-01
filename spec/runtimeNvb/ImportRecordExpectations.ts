export const expectedKnowledgeImports = [
    'AGENTS.md', 'agents/coordinator/AGENTS.md', 'agents/coordinator/SKILL.md',
    'agents/coordinator/adapters/README.md', 'agents/coordinator/state-machine.md',
    'docs/bootstrap-checklist.md', 'docs/cursor-loop-setup.md', 'docs/guides/README.md',
    'docs/guides/browser-proof-coordinator-playbook.md', 'docs/guides/coordinator-decision-rules.md',
    'docs/guides/durable-worker-events.md', 'docs/guides/lane-watcher-and-closure.md',
    'docs/guides/three-runtime-lessons.md', 'docs/guides/voice-vs-wake-and-piper.md',
    'docs/playbook.md', 'template/coordinator/coordinator-policy.md'
];

export const expectedReferences = [
    'README.md', 'examples/html-tree-updater/README.md', 'examples/route-group-v2/README.md'
];

export const expectedTemplates = [
    'template/coordinator-tracker.md', 'template/coordinator/coordinator-agent-brief.md',
    'template/coordinator/hermes-local-agent-voice-prompt.md',
    'template/coordinator/implementer-agent-brief.md', 'template/coordinator/model-plan.md'
];

export const expectedTemplateState = [
    'template/coordinator/coordinator-lane-state.txt',
    'template/coordinator/lane.config.env.example',
    'template/coordinator/steps.local.conf.example'
];

export const expectedNormalizationEntries = [
    'docs/guides/three-runtime-lessons.md',
    'docs/guides/voice-vs-wake-and-piper.md',
    'docs/playbook.md'
];

export const expectedDecisions: Record<string, [string, string, string?, string?]> = {
    'bin/init-lane.sh': ['removal', 'RT-06'], 'bin/install-coordinator-skill.sh': ['removal', 'UK-04'],
    'template/coordinator/account-run-as.sh': ['TaskHandler', 'RT-05'], 'template/coordinator/codex-tmux-send.sh': ['leaf', 'CA-11'],
    'template/coordinator/codex-upgrade-model-in-session.sh': ['removal', 'CA-06'], 'template/coordinator/coordinator-alert.sh': ['temporary-wrapper', 'CA-22', 'CA-22', 'CA-22 acceptance'],
    'template/coordinator/coordinator-assistant.sh': ['removal', 'CA-28'], 'template/coordinator/coordinator-close-batch-sessions.sh': ['TaskHandler', 'CA-11'],
    'template/coordinator/coordinator-nudge-message.sh': ['TaskHandler', 'CA-13'], 'template/coordinator/coordinator-push-acceptance.sh': ['TaskHandler', 'CA-12'],
    'template/coordinator/coordinator-refresh-tracker.sh': ['removal', 'CA-03'], 'template/coordinator/coordinator-speak.sh': ['temporary-wrapper', 'CA-22', 'CA-22', 'CA-22 acceptance'],
    'template/coordinator/coordinator-step.sh': ['TaskHandler', 'CA-13'], 'template/coordinator/coordinator-summarize-pane.sh': ['removal', 'CA-07'],
    'template/coordinator/coordinator-sync-session.sh': ['TaskHandler', 'CA-15'], 'template/coordinator/coordinator-sync-tracker.sh': ['removal', 'CA-03'],
    'template/coordinator/coordinator-voice-agent-summary.sh': ['temporary-wrapper', 'CA-22', 'CA-22', 'CA-22 acceptance'], 'template/coordinator/coordinator-voice-monitor.sh': ['temporary-wrapper', 'CA-22', 'CA-22', 'CA-22 acceptance'],
    'template/coordinator/coordinator-voice-once.sh': ['temporary-wrapper', 'CA-22', 'CA-22', 'CA-22 acceptance'], 'template/coordinator/coordinator-watch.sh': ['TaskHandler', 'CA-13'],
    'template/coordinator/coordinator-worker-event.sh': ['TaskHandler', 'CA-13'], 'template/coordinator/coordinator-worker-prompt.sh': ['removal', 'CA-07'],
    'template/coordinator/launch-implementer-opus.sh': ['TaskHandler', 'CA-11'], 'template/coordinator/launch-implementer.sh': ['TaskHandler', 'CA-11'],
    'template/coordinator/launch-reviewer.sh': ['TaskHandler', 'CA-11'], 'template/coordinator/resolve-account-cli.sh': ['TaskHandler', 'RT-05'],
    'template/coordinator/restart-codex-coordinator.sh': ['removal', 'CA-28'], 'template/coordinator/start-codex-coordinator.sh': ['removal', 'CA-28'],
    'template/coordinator/start-coordinator-loop.sh': ['temporary-wrapper', 'CA-13', 'CA-13', 'CA-13 acceptance'], 'template/coordinator/start-voice-monitor.sh': ['temporary-wrapper', 'CA-22', 'CA-22', 'CA-22 acceptance']
};
