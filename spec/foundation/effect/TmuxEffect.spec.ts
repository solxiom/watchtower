import {TmuxAdapter, TMUX_COMMANDS, validateTmuxCommand, type AttemptResult, type TmuxEffectCommand} from '../../../src/foundation/runtime/leaf/TmuxAdapter.js';
import {TmuxEffectExecutor, type TmuxBoundedEffect, type TmuxEffectJournal} from '../../../src/foundation/effect/TmuxEffect.js';
import type {EffectJournalRecord, EffectPlan} from '../../../src/contracts/effects.js';
import type {LaneRuntimeContext} from '../../../src/contracts/taskRuntime.js';

describe('CA-11 tmux effect boundary', () => {
    it('rejects every forbidden command before the runtime leaf', async () => {
        const calls: TmuxEffectCommand[] = [];
        const adapter = adapterFor((command) => {
            calls.push(command);
            return result(command, 0);
        });
        for (const command of ['shell', 'run-shell', 'kill-session', 'kill-window', 'kill-pane',
            'pipe-pane', 'source-file', 'if-shell', 'eval']) {
            const outcome = await adapter.attempt({command, argv: []});
            expect(outcome.reason).toBe('TMUX_COMMAND_FORBIDDEN');
        }
        expect(calls).toEqual([]);
    });

    it('covers the complete closed command registry', async () => {
        const seen: string[] = [];
        const adapter = adapterFor((command) => {
            seen.push(command.command);
            return result(command, 0);
        });
        const commands: Record<string, TmuxEffectCommand> = {
            'new-session': {command: 'new-session', argv: ['-d', '-s', 'safe'], session: 'safe'},
            'new-window': {command: 'new-window', argv: ['-t', 'safe', '-n', 'window'], session: 'safe', window: 'window'},
            'send-keys': {command: 'send-keys', argv: ['-t', 'safe:window.0', 'payload'], session: 'safe', window: 'window', pane: '0'},
            'capture-pane': {command: 'capture-pane', argv: ['-p', '-t', 'safe:window.0'], session: 'safe', window: 'window', pane: '0'},
            'list-panes': {command: 'list-panes', argv: ['-t', 'safe:window.0'], session: 'safe', window: 'window', pane: '0'},
            'list-windows': {command: 'list-windows', argv: ['-t', 'safe'], session: 'safe'},
            'list-sessions': {command: 'list-sessions', argv: []},
            'has-session': {command: 'has-session', argv: ['-t', 'safe'], session: 'safe'}
        };
        for (const command of TMUX_COMMANDS) {
            const outcome = await adapter.attempt(commands[command]);
            expect(outcome.reason).toBeUndefined();
            expect(outcome.exitCode).toBe(0);
        }
        expect(seen).toEqual(TMUX_COMMANDS);
    });

    it('rejects every required target sanitizer character without invocation', async () => {
        const calls: TmuxEffectCommand[] = [];
        const adapter = adapterFor((command) => {
            calls.push(command);
            return result(command, 0);
        });
        for (const character of [';', '|', '$', '`', '\\', '(', ')', '{', '}', '<', '>', '&', '*', '?', '~', '!', '\n', '/', '..', '\u0000']) {
            const prepare = await adapter.prepare(`bad${character}`, 'window', '0');
            expect(prepare.rejectReason).toBe('TMUX_INVALID_TARGET');
        }
        expect(calls).toEqual([]);
    });

    it('rejects mismatched argv targets and path/options before the leaf', async () => {
        const calls: TmuxEffectCommand[] = [];
        const adapter = adapterFor((command) => {
            calls.push(command);
            return result(command, 0);
        });
        const outcome = await adapter.attempt({command: 'send-keys',
            argv: ['-t', 'other:window.9', '-c', '/etc/passwd', 'payload'],
            session: 'safe', window: 'window', pane: '0'});
        expect(outcome.reason).toBe('TMUX_COMMAND_FORBIDDEN');
        expect(calls).toEqual([]);
    });

    it('rejects unknown or control-bearing environment values before the leaf', async () => {
        const calls: TmuxEffectCommand[] = [];
        const adapter = adapterFor((command) => {
            calls.push(command);
            return result(command, 0);
        });
        const unknown = await adapter.attempt({command: 'list-sessions', argv: []}, {PATH: '/tmp'} as never);
        const control = await adapter.attempt({command: 'list-sessions', argv: []}, {WT_LANE_ID: 'lane\n'});
        expect(unknown.reason).toBe('TMUX_COMMAND_FORBIDDEN');
        expect(control.reason).toBe('TMUX_COMMAND_FORBIDDEN');
        expect(calls).toEqual([]);
    });

    it('requires observed liveness instead of descriptor fields', async () => {
        const calls: TmuxEffectCommand[] = [];
        const adapter = adapterFor((command) => {
            calls.push(command);
            return result(command, 1);
        });
        const verify = await adapter.verify(result({command: 'send-keys', argv: ['-t', 'safe:window.0', 'payload'],
            session: 'safe', window: 'window', pane: '0'}, 0),
        {sessionExists: true, windowExists: true, paneExists: true});
        expect(verify.verified).toBeFalse();
        expect(calls.map((command) => command.command)).toEqual(['has-session', 'list-windows', 'list-panes']);
    });

    it('admits bounded window-scoped pane probes and captures the complete pane target', async () => {
        expect(validateTmuxCommand({command: 'list-panes', argv: ['-t', 'safe:window'], session: 'safe', window: 'window'})).toBeNull();
        const calls: TmuxEffectCommand[] = [];
        const adapter = adapterFor((command) => {
            calls.push(command);
            return result(command, 0, command.command === 'capture-pane' ? 'ready' : '');
        });
        const verify = await adapter.verify(result({command: 'send-keys', argv: ['-t', 'safe:window.0', 'payload'],
            session: 'safe', window: 'window', pane: '0'}, 0), {paneContentIncludes: 'ready'});
        expect(verify.verified).toBeTrue();
        expect(calls[0].argv).toEqual(['-p', '-t', 'safe:window.0']);
    });

    it('recovers an unknown launch by probing and never re-executing it', async () => {
        const plan = effectPlan('recovery-key');
        const journal = new FakeJournal([record('uncertain', plan.idempotencyKey)]);
        const commands: string[] = [];
        const adapter = adapterFor((command) => {
            commands.push(command.command);
            return observed(command, 'session:window.0');
        });
        const outcome = await new TmuxEffectExecutor(adapter, journal).executeTmuxEffect(effect(plan), plan);
        expect(outcome.recoveryAttempted).toBeTrue();
        expect(outcome.reason).toBe('TMUX_RECOVERY_UNCERTAIN');
        expect(commands).toEqual(['list-panes', 'capture-pane']);
        expect(commands).not.toContain('send-keys');
    });

    it('retries after a crash before attempt, but suppresses a settled duplicate', async () => {
        const plan = effectPlan('duplicate-key');
        const journal = new FakeJournal([record('prepared', plan.idempotencyKey)]);
        const commands: string[] = [];
        const adapter = adapterFor((command) => {
            commands.push(command.command);
            if (command.command === 'capture-pane') return result(command, 0, 'ready');
            if (command.command === 'has-session') return result(command, 0);
            if (command.command === 'list-windows') return result(command, 0, 'window\n');
            if (command.command === 'list-panes') return result(command, 0, 'session:window.0\n');
            return result(command, 0);
        });
        const executor = new TmuxEffectExecutor(adapter, journal);
        const first = await executor.executeTmuxEffect(effect(plan), plan);
        expect(first.success).toBeTrue();
        const second = await executor.executeTmuxEffect(effect(plan), plan);
        expect(second.reason).toBe('TMUX_DUPLICATE_SUPPRESSED');
        expect(commands.filter((command) => command === 'send-keys').length).toBe(1);
    });
});

function result(command: TmuxEffectCommand, exitCode: number, stdout = ''): AttemptResult {
    return {ok: exitCode === 0, command, exitCode, stdout, stderr: '', wallTimeMs: 1};
}

function adapterFor(handler: (command: TmuxEffectCommand) => AttemptResult): TmuxAdapter {
    return new TmuxAdapter({context: context(), runner: {run: async (invocation) => {
        const input = invocation.input as Record<string, unknown>;
        const command: TmuxEffectCommand = {
            command: input.command as string, argv: input.argv as readonly string[],
            session: input.session as string | undefined, window: input.window as string | undefined,
            pane: input.pane as string | undefined
        };
        const outcome = handler(command);
        return {
            outcome: 'completed', actionId: invocation.actionId, taskId: 'wt:tmux:effect', runId: 'test-run',
            startedAt: null, finishedAt: null, result: {schemaVersion: 1, ok: outcome.ok,
                exitCode: outcome.exitCode, stdout: outcome.stdout, stderr: outcome.stderr, wallTimeMs: outcome.wallTimeMs}, events: []
        };
    }}});
}

function context(): LaneRuntimeContext {
    return {workspace: '/workspace', laneId: 'lane', initiativeId: 'initiative', laneSlug: 'lane', laneDir: '/workspace/.watchtower/lanes/lane',
        homeRepositoryId: 'home', repositoriesFile: '/workspace/repositories.local.json', runtimeRoot: '/runtime', runtimeVersion: 'v1',
        knowledgeRoot: '/knowledge', baseEnvironment: {path: '/usr/bin', home: '/home/operator'}};
}

function observed(command: TmuxEffectCommand, identity: string): AttemptResult {
    if (command.command === 'list-panes') return result(command, 0, `${identity}\n`);
    if (command.command === 'list-windows') return result(command, 0, 'window\n');
    if (command.command === 'has-session') return result(command, 0);
    if (command.command === 'capture-pane') return result(command, 0, 'existing output');
    return result(command, 0);
}

function effectPlan(idempotencyKey: string): EffectPlan {
    return {
        schemaVersion: 1, laneId: 'lane', cycleId: 'cycle', proposalId: 'proposal', effect: 'dispatch-batch',
        actionId: 'effect.dispatchBatch', taskId: 'tmux', scope: 'external', targetIds: ['session'], parameters: {},
        preconditionDigest: `sha256:${'a'.repeat(64)}`, idempotencyKey, snapshotDigest: 'snapshot', policyVersion: 'v1'
    };
}

function effect(plan: EffectPlan): TmuxBoundedEffect {
    return {...plan, tmuxCommand: {command: 'send-keys', argv: ['-t', 'session:window.0', 'start'], session: 'session', window: 'window', pane: '0'},
        postcondition: {exitCode: 0, paneContentIncludes: 'ready'}};
}

function record(phase: 'prepared' | 'attempted' | 'verified' | 'failed' | 'uncertain', key: string): EffectJournalRecord {
    return {schemaVersion: 1, eventId: `${phase}-${key}`, type: 'effect', sequence: 0, at: new Date(0).toISOString(),
        laneId: 'lane', producer: 'test', correlationId: 'cycle', causationId: null, policyVersion: 'v1',
        payload: {phase, effect: 'dispatch-batch', actionId: 'effect.dispatchBatch', idempotencyKey: key,
            preconditionDigest: `sha256:${'a'.repeat(64)}`, targetIds: ['session'], outcome: phase}};
}

class FakeJournal implements TmuxEffectJournal {
    constructor(private records: EffectJournalRecord[]) {}

    read(idempotencyKey: string) {
        return {records: this.records.filter((entry) => entry.payload.idempotencyKey === idempotencyKey), nextSequence: this.records.length};
    }

    append(phase: 'prepared' | 'attempted' | 'verified' | 'failed' | 'uncertain', key: string, detail: string): EffectJournalRecord {
        const next = record(phase, key);
        this.records.push({...next, sequence: this.records.length, payload: {...next.payload, outcome: detail}});
        return next;
    }
}
