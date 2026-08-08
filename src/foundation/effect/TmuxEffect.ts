import type {EffectJournalRecord, EffectPlan} from '../../contracts/effects.js';
import {findSettledOutcome, findLatestPhase, type JournalRead} from './effectJournal.js';
import {TmuxAdapter, type AttemptResult, type PrepareResult, type TmuxEffectCommand, type TmuxEnv, type TmuxPostcondition, type VerifyResult} from '../runtime/leaf/TmuxAdapter.js';

export interface TmuxEffectJournal {
    read(idempotencyKey: string): JournalRead;
    append(phase: 'prepared' | 'attempted' | 'verified' | 'failed' | 'uncertain', idempotencyKey: string, detail: string): EffectJournalRecord;
}

export interface TmuxBoundedEffect extends EffectPlan {
    readonly tmuxCommand: TmuxEffectCommand;
    readonly tmuxEnvironment?: TmuxEnv;
    readonly postcondition: TmuxPostcondition;
}

export interface TmuxEffectOutcome {
    readonly success: boolean;
    readonly outcomeId: string;
    readonly phases: {readonly prepare: PrepareResult; readonly attempt: AttemptResult; readonly verify: VerifyResult};
    readonly idempotencyKey: string;
    readonly recoveryAttempted?: boolean;
    readonly escalated?: boolean;
    readonly reason?: string;
}

export class TmuxEffectExecutor {
    constructor(private readonly adapter: TmuxAdapter, private readonly journal: TmuxEffectJournal) {}

    async executeTmuxEffect(boundedEffect: TmuxBoundedEffect, plan: EffectPlan): Promise<TmuxEffectOutcome> {
        const key = requireKey(boundedEffect, plan);
        const history = this.journal.read(key);
        const previous = findLatestPhase(history, key);
        if (previous?.payload.phase === 'uncertain') return this.recover(boundedEffect, key);
        const settled = findSettledOutcome(history, key);
        if (settled !== null) return replayed(settled, key);
        // A durable `prepared` record proves that no external operation was
        // started. It is the one interrupted phase that is safe to retry.
        if (previous !== null && previous.payload.phase !== 'prepared') return this.recover(boundedEffect, key);
        const env = boundedEffect.tmuxEnvironment ?? {};
        const target = boundedEffect.tmuxCommand;
        const prepare = await this.adapter.prepare(target.session ?? '', target.window ?? '', target.pane ?? '', env);
        if (!prepare.ok) return refused(key, prepare, prepare.rejectReason ?? 'TMUX_TARGET_NOT_FOUND');
        this.journal.append('prepared', key, 'tmux target prepared');
        this.journal.append('attempted', key, 'tmux operation started');
        const attempt = await this.adapter.attempt(target, env);
        if (attempt.reason !== undefined || attempt.exitCode !== 0) {
            this.journal.append(attempt.reason === 'TMUX_VERIFY_UNCERTAIN' ? 'uncertain' : 'failed',
                key, attempt.reason ?? 'TMUX_COMMAND_FAILED');
            return refused(key, prepare, attempt.reason ?? 'TMUX_COMMAND_FAILED', attempt);
        }
        const verify = await this.adapter.verify(attempt, boundedEffect.postcondition, env);
        const phase = verify.verified ? 'verified' : verify.reason === 'TMUX_VERIFY_UNCERTAIN' ? 'uncertain' : 'failed';
        this.journal.append(phase, key, verify.reason ?? 'tmux postcondition verified');
        return {success: verify.verified, outcomeId: key, phases: {prepare, attempt, verify}, idempotencyKey: key,
            ...(verify.verified ? {} : {recoveryAttempted: false, escalated: true, reason: verify.reason})};
    }

    private async recover(effect: TmuxBoundedEffect, key: string): Promise<TmuxEffectOutcome> {
        const target = effect.tmuxCommand;
        const env = effect.tmuxEnvironment ?? {};
        const prepare = await this.adapter.prepare(target.session ?? '', target.window ?? '', target.pane ?? '', env);
        const identity = `${target.session ?? ''}:${target.window ?? ''}.${target.pane ?? ''}`;
        const probe = await this.adapter.attempt({...target, command: 'capture-pane', argv: ['-p', '-t', identity]}, env);
        const verify = await this.adapter.verify(probe, effect.postcondition, env);
        const determined = prepare.ok && probe.exitCode === 0 && verify.verified;
        const reason = determined ? 'recovered from durable probe' : 'TMUX_RECOVERY_UNCERTAIN';
        this.journal.append(determined ? 'verified' : 'uncertain', key, reason);
        return {success: determined, outcomeId: key, phases: {prepare, attempt: probe, verify}, idempotencyKey: key,
            recoveryAttempted: true, escalated: !determined, ...(determined ? {} : {reason})};
    }
}

function requireKey(effect: TmuxBoundedEffect, plan: EffectPlan): string {
    if (effect.idempotencyKey !== plan.idempotencyKey) throw new Error('TMUX effect plan idempotency key mismatch.');
    return plan.idempotencyKey;
}

function replayed(record: EffectJournalRecord, key: string): TmuxEffectOutcome {
    const empty = {ok: false, sessionExists: false, windowExists: false, paneExists: false, rejectReason: 'TMUX_DUPLICATE_SUPPRESSED' as const};
    const attempt = {ok: true, command: {command: 'has-session', argv: []}, exitCode: 0, stdout: '', stderr: '', wallTimeMs: 0};
    const verify = {ok: true, verified: true, actualExitCode: 0, actualPaneContent: null, postconditionResults: []};
    return {success: record.payload.phase === 'verified', outcomeId: record.eventId, phases: {prepare: empty, attempt, verify},
        idempotencyKey: key, reason: 'TMUX_DUPLICATE_SUPPRESSED'};
}

function refused(key: string, prepare: PrepareResult, reason: string, attempt?: AttemptResult): TmuxEffectOutcome {
    const failed = attempt ?? {ok: false, command: {command: 'has-session', argv: []}, exitCode: null, stdout: '', stderr: reason, wallTimeMs: 0};
    const verify = {ok: false, verified: false, actualExitCode: failed.exitCode, actualPaneContent: null, postconditionResults: [], reason: 'TMUX_VERIFY_FAILED' as const};
    return {success: false, outcomeId: key, phases: {prepare, attempt: failed, verify}, idempotencyKey: key, reason};
}
