import type {ErrorCode} from './errors.js';
import type {JsonObject} from './types.js';

/**
 * Closed doctor check identity. The first five are the lane-local checks
 * LC-07 owns; the next five are the injected required-tools, runtime,
 * account, watcher, and pack-index diagnostic providers LC-10 owns; the last
 * five are the coordinator queue/cursor, session index/turn, and TUI terminal
 * diagnostic providers CA-31 owns. Every one of them is composed through the
 * unmodified LC-07 kernel — there is no mutable registry and no provider that
 * discovers itself.
 */
export type DoctorCheckId =
    | 'lane-marker'
    | 'lane-config'
    | 'repository-bindings'
    | 'repository-permissions'
    | 'git-ignore-coverage'
    | 'required-tools'
    | 'runtime-catalog'
    | 'account-access'
    | 'watcher-heartbeat'
    | 'pack-index'
    | 'coordinator-queue'
    | 'coordinator-cursor'
    | 'session-index'
    | 'session-turns'
    | 'tui-terminal';

/** Closed doctor check outcome vocabulary (`docs/spec/v1.md` §11.7). */
export type DoctorCheckStatus = 'pass' | 'warn' | 'fail' | 'skip';

export interface DoctorCheck extends JsonObject {
    readonly id: DoctorCheckId;
    readonly status: DoctorCheckStatus;
    readonly message: string;
    readonly reason: ErrorCode | null;
}

export interface DoctorSummary extends JsonObject {
    readonly pass: number;
    readonly warn: number;
    readonly fail: number;
    readonly skip: number;
}

export interface DoctorLaneView extends JsonObject {
    readonly id: string;
    readonly slug: string;
}

export interface DoctorReport extends JsonObject {
    readonly schemaVersion: 1;
    readonly lane: DoctorLaneView;
    readonly checks: readonly DoctorCheck[];
    readonly summary: DoctorSummary;
}
