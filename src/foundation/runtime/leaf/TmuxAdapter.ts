import {
    TMUX_COMMANDS, validateTmuxCommand, validateTmuxEnvironment, validTmuxTarget,
    type AttemptResult, type PrepareResult, type PostconditionCheck,
    type TmuxEffectCommand, type TmuxEnv, type TmuxPostcondition,
    type TmuxReason, type VerifyResult, type TmuxCommandName
} from './tmuxCommandContract.js';

export {
    TMUX_COMMANDS, validateTmuxCommand, validateTmuxEnvironment, validTmuxTarget,
    type AttemptResult, type PrepareResult, type PostconditionCheck,
    type TmuxEffectCommand, type TmuxEnv, type TmuxPostcondition,
    type TmuxReason, type VerifyResult, type TmuxCommandName
} from './tmuxCommandContract.js';

export interface TmuxLivenessObservation {
    readonly kind: 'available' | 'unavailable' | 'ambiguous';
    readonly exists?: boolean;
    readonly evidence?: string;
}

export interface TmuxAdapterOptions {
    readonly runner: LaneTaskRunner;
    readonly context: LaneRuntimeContext;
    readonly actionId?: string;
    readonly invocationEnvelope?: string;
    readonly cancellation?: AbortSignal;
}

export class TmuxAdapter {
    constructor(private readonly options: TmuxAdapterOptions) {}

    async prepare(session: string, window: string, pane: string, env: TmuxEnv = {}): Promise<PrepareResult> {
        const invalid = [session, window, pane].find((value) => !validTmuxTarget(value));
        if (invalid !== undefined) return rejectedPrepare('TMUX_INVALID_TARGET');
        if (validateTmuxEnvironment(env) !== null) return rejectedPrepare('TMUX_COMMAND_FORBIDDEN');
        const result = await this.invoke({command: 'list-panes', argv: ['-t', `${session}:${window}.${pane}`], session, window, pane}, env);
        if (result.exitCode !== 0) return rejectedPrepare('TMUX_TARGET_NOT_FOUND');
        const paneExists = result.exitCode === 0;
        return {ok: paneExists, sessionExists: paneExists, windowExists: paneExists, paneExists,
            ...(paneExists ? {} : {rejectReason: 'TMUX_TARGET_NOT_FOUND' as const})};
    }

    async attempt(command: TmuxEffectCommand, env: TmuxEnv = {}): Promise<AttemptResult> {
        const invalid = validateTmuxCommand(command);
        if (invalid !== null) return failedAttempt(command, invalid);
        const invalidEnvironment = validateTmuxEnvironment(env);
        if (invalidEnvironment !== null) return failedAttempt(command, invalidEnvironment);
        const result = await this.invoke({...command, command: command.command as TmuxCommandName}, env);
        if (result.exitCode !== 0 && result.reason === undefined) return {...result, reason: 'TMUX_COMMAND_FAILED'};
        return result;
    }

    async verify(result: AttemptResult, expected: TmuxPostcondition, env: TmuxEnv = {}): Promise<VerifyResult> {
        if (result.exitCode === null) return uncertainVerify(result, 'TMUX_VERIFY_UNCERTAIN');
        if (validateTmuxEnvironment(env) !== null) return uncertainVerify(result, 'TMUX_VERIFY_UNCERTAIN');
        const checks: PostconditionCheck[] = [];
        check(checks, 'exitCode', expected.exitCode, result.exitCode);
        const target = result.command;
        let content: string | null = null;
        if (expected.paneContentIncludes !== undefined) {
            const captured = target.command === 'capture-pane' ? result : (await this.invoke({
                command: 'capture-pane', argv: ['-p', '-t', paneTarget(target)],
                session: target.session, window: target.window, pane: target.pane
            }, env));
            if (captured.exitCode === null) return uncertainVerify(result, 'TMUX_VERIFY_UNCERTAIN');
            const paneContent = captured.stdout;
            content = paneContent;
            checks.push({name: 'paneContentIncludes', ok: paneContent.includes(expected.paneContentIncludes),
                expected: expected.paneContentIncludes, actual: paneContent});
        }
        const liveness = await observeLiveness(target, expected, (command) => this.invoke(command, env));
        checks.push(...liveness.checks);
        const failed = checks.some((item) => !item.ok);
        return {ok: !failed, verified: !failed, actualExitCode: result.exitCode, actualPaneContent: content,
            postconditionResults: checks,
            ...((failed || liveness.uncertain) ? {reason: liveness.uncertain ? 'TMUX_VERIFY_UNCERTAIN' as const : 'TMUX_VERIFY_FAILED' as const} : {})};
    }

    private async invoke(command: TmuxEffectCommand, environment: TmuxEnv): Promise<AttemptResult> {
        let run: LaneTaskRunResult;
        try {
            run = await this.options.runner.run({
                actionId: this.options.actionId ?? 'effect.dispatchBatch',
                context: this.options.context,
                input: tmuxInput(command, environment),
                invocationEnvelope: this.options.invocationEnvelope,
                cancellation: this.options.cancellation
            });
        } catch {
            return {ok: false, command, exitCode: null, stdout: '', stderr: '', wallTimeMs: 0,
                reason: 'TMUX_VERIFY_UNCERTAIN'};
        }
        return taskResult(command, run);
    }
}

interface LivenessObservation {
    readonly checks: readonly PostconditionCheck[];
    readonly uncertain: boolean;
}

async function observeLiveness(target: TmuxEffectCommand, expected: TmuxPostcondition,
    invoke: (command: TmuxEffectCommand) => Promise<AttemptResult>): Promise<LivenessObservation> {
    const checks: PostconditionCheck[] = [];
    let uncertain = false;
    if (expected.sessionExists !== undefined) {
        const observed = await invoke({command: 'has-session', argv: ['-t', target.session ?? ''], session: target.session});
        const state = observeHasSession(observed);
        uncertain ||= state.kind !== 'available';
        check(checks, 'sessionExists', expected.sessionExists, state.exists === true);
    }
    if (expected.windowExists !== undefined) {
        const observed = await invoke({command: 'list-windows', argv: ['-t', target.session ?? ''], session: target.session});
        const state = observeListing(observed, target.window, 'window');
        uncertain ||= state.kind !== 'available';
        check(checks, 'windowExists', expected.windowExists, state.exists === true);
    }
    if (expected.paneExists !== undefined) {
        const observed = await invoke({command: 'list-panes', argv: ['-t', `${target.session ?? ''}:${target.window ?? ''}`], session: target.session, window: target.window});
        const identity = target.session !== undefined && target.window !== undefined && target.pane !== undefined
            ? `${target.session}:${target.window}.${target.pane}` : '';
        const state = observeListing(observed, identity, 'pane');
        uncertain ||= state.kind !== 'available';
        check(checks, 'paneExists', expected.paneExists, state.exists === true);
    }
    return {checks, uncertain};
}

function paneTarget(command: TmuxEffectCommand): string {
    return `${command.session ?? ''}:${command.window ?? ''}.${command.pane ?? ''}`;
}

const MAX_OBSERVATION_BYTES = 64 * 1024;

function observeHasSession(result: AttemptResult): TmuxLivenessObservation {
    if (result.exitCode === 0) return {kind: 'available', exists: true, evidence: result.stdout};
    if (result.exitCode === 1) return {kind: 'available', exists: false, evidence: result.stderr};
    return {kind: 'unavailable', evidence: result.stderr};
}

function observeListing(result: AttemptResult, identity: string | undefined, label: string): TmuxLivenessObservation {
    if (result.exitCode === null || result.exitCode !== 0) return {kind: 'unavailable', evidence: result.stderr};
    if (identity === undefined || identity.length === 0 || result.stdout.length > MAX_OBSERVATION_BYTES) {
        return {kind: 'ambiguous', evidence: `${label}:bounded-or-missing`};
    }
    const rows = result.stdout.split('\n').filter((row) => row.length > 0);
    if (rows.length === 0) return {kind: 'ambiguous', evidence: `${label}:empty`};
    const exists = rows.some((row) => row === identity || row.includes(`\t${identity}`) ||
        (label === 'window' && row.includes(`:${identity}`)));
    return {kind: 'available', exists, evidence: result.stdout};
}

function tmuxInput(command: TmuxEffectCommand, environment: TmuxEnv): JsonObject {
    return {
        schemaVersion: 1, operation: 'tmux-effect', command: command.command, argv: [...command.argv],
        ...(command.session === undefined ? {} : {session: command.session}),
        ...(command.window === undefined ? {} : {window: command.window}),
        ...(command.pane === undefined ? {} : {pane: command.pane}),
        environment: {...environment}
    };
}

function taskResult(command: TmuxEffectCommand, run: LaneTaskRunResult): AttemptResult {
    if (run.outcome !== 'completed') {
        return {ok: false, command, exitCode: run.outcome === 'failed' ? run.exitCode : null,
            stdout: '', stderr: run.outcome === 'failed' ? run.diagnostic : run.signal, wallTimeMs: 0,
            reason: run.outcome === 'failed' ? 'TMUX_COMMAND_FAILED' : 'TMUX_VERIFY_UNCERTAIN'};
    }
    const value = run.result;
    if (!isTaskResult(value)) return {ok: false, command, exitCode: null, stdout: '', stderr: '', wallTimeMs: 0,
        reason: 'TMUX_VERIFY_UNCERTAIN'};
    return {...value, command, reason: value.exitCode === 0 ? undefined : 'TMUX_COMMAND_FAILED'};
}

function isTaskResult(value: unknown): value is Omit<AttemptResult, 'command' | 'reason'> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        && (value as Record<string, unknown>).schemaVersion === 1
        && typeof (value as Record<string, unknown>).ok === 'boolean'
        && ((value as Record<string, unknown>).exitCode === null || typeof (value as Record<string, unknown>).exitCode === 'number')
        && typeof (value as Record<string, unknown>).stdout === 'string'
        && typeof (value as Record<string, unknown>).stderr === 'string'
        && typeof (value as Record<string, unknown>).wallTimeMs === 'number';
}

function rejectedPrepare(reason: TmuxReason): PrepareResult {
    return {ok: false, sessionExists: false, windowExists: false, paneExists: false, rejectReason: reason};
}

function failedAttempt(command: TmuxEffectCommand, reason: TmuxReason): AttemptResult {
    return {ok: false, command, exitCode: null, stdout: '', stderr: reason, wallTimeMs: 0, reason};
}

function uncertainVerify(result: AttemptResult, reason: TmuxReason): VerifyResult {
    return {ok: false, verified: false, actualExitCode: result.exitCode, actualPaneContent: null,
        postconditionResults: [], reason};
}

function check(checks: PostconditionCheck[], name: string, expected: string | number | boolean | undefined,
    actual: string | number | boolean): void {
    if (expected !== undefined) checks.push({name, ok: actual === expected, expected, actual});
}
import type {LaneRuntimeContext, LaneTaskRunResult} from '../../../contracts/taskRuntime.js';
import type {JsonObject} from '../../../contracts/types.js';
import type {LaneTaskRunner} from '../../task/runtime/LaneTaskRunner.js';
