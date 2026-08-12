/**
 * Public capsule for the single `wt init` effect (LC-11). The orchestrator and
 * its production composition are the only surface a command front door needs;
 * every collaborator behind them keeps its own accepted owner.
 */
export {InitEffect} from './InitEffect.js';
export {createInitEffect, createInitEffectPorts} from './initEffectComposition.js';
export type {InitEffectCompositionOptions} from './initEffectComposition.js';
export {completeInitCommit} from './initCommitCompletion.js';
export type {CommittedLane} from './initCommitCompletion.js';
export {INIT_EFFECT_PHASES} from './initEffectContracts.js';
export type {
    InitEffectPhase, InitEffectRequest, InitEffectResult, InitEffectWarning, InitLaneLifecycle
} from './initEffectContracts.js';
export type {InitEffectPorts, InitGitignoreMutation, InitInstallResolution} from './initEffectPorts.js';
export {createInitPackEvidenceInspector} from './initPackEvidenceHost.js';
export type {InitPackEvidenceOptions} from './initPackEvidenceHost.js';
export {LANE_STATE_RELATIVE_PATH, buildLaneStateFile, projectLaneState} from './laneStateProjection.js';
