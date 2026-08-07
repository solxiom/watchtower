// Public surface of the effect capability — the sole lane effect authority (CA-10).
export {EffectExecutor} from './EffectExecutor.js';
export type {EffectExecutorDeps, EffectRequest} from './EffectExecutor.js';
export {declaredRuntimeActions, resolveDeclaredAction, undeclaredEffectTypes} from './effectActionRegistry.js';
export {planEffect, preconditionDigest, resolveEffectBinding} from './effectPlanner.js';
export type {EffectPlanInput} from './effectPlanner.js';
export {classifyReplay} from './effectReplay.js';
export {assertStillCommittable} from './effectRevalidation.js';
export type {RevalidationInput} from './effectRevalidation.js';
export {invokeAndVerify} from './effectCommitSequence.js';
export type {CommitSequenceDeps, CommitSequenceInput} from './effectCommitSequence.js';
export {verifyEffectPostconditions} from './effectVerification.js';
export type {VerificationOutcome, VerificationStatus} from './effectVerification.js';
export {acquireEffectLocks, LOCK_ORDER} from './laneEffectLock.js';
export type {HeldEffectLock, LockLevel} from './laneEffectLock.js';
export {
    appendEffectPhase, effectJournalPath, findLatestPhase, findSettledOutcome, readEffectJournal
} from './effectJournal.js';
export type {JournalRead} from './effectJournal.js';
export {
    buildEnvelopeDocument, consumeInvocationEnvelope, envelopePath, writeInvocationEnvelope
} from './invocationEnvelopeWriter.js';
export {discardUnusedEnvelope, reconcileOrphanEnvelope} from './envelopeRecovery.js';
export type {EnvelopeWriteInput, WrittenEnvelope} from './invocationEnvelopeWriter.js';
export {activatePackRevision, assertResumable, readActiveRevision} from './packRevisionActivation.js';
export type {ActivationInput, ActivePackRevision} from './packRevisionActivation.js';
export {nodeEffectFileSystem} from './nodeEffectFileSystem.js';
export type {
    EffectActionResolver, EffectClock, EffectFileSystem, EffectIdFactory, EffectTaskRunner
} from './effectPorts.js';
