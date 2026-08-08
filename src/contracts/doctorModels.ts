import type {ErrorCode} from './errors.js';
import type {JsonObject} from './types.js';

/** Closed doctor check identity for the lane-local checks LC-07 owns. */
export type DoctorCheckId =
    | 'lane-marker'
    | 'lane-config'
    | 'repository-bindings'
    | 'repository-permissions'
    | 'git-ignore-coverage';

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
