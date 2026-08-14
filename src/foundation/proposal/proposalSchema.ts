/**
 * Structural (`$defs/decisionProposal`) validation — check 1 of `ProposalValidator`'s
 * ordered pipeline (`docs/spec/coordinator-automation.md` §12.1). Throws
 * `ProposalShapeError` on any malformed, missing, or unsupported member;
 * `ProposalValidator` catches this into a `PROPOSAL_SCHEMA_INVALID` result entry
 * rather than letting it escape, so a caller never receives a thrown exception
 * for ordinary invalid input.
 *
 * The canonical schema (`docs/spec/schemas/v1.schema.json#/$defs/decisionProposal`)
 * declares `additionalProperties: true` at the proposal's top level (the §11.1
 * normative example carries a sibling `rationale` member), so — unlike `body`,
 * which is this module's own closed per-type vocabulary — an unrecognized
 * top-level member is tolerated and dropped, never rejected.
 */
import {EFFECT_TYPES, PROPOSAL_TYPES} from '../../contracts/index.js';
import type {DecisionProposal, EffectType, ProposalType, RequestedEffect} from '../../contracts/index.js';
import {isRfc3339DateTime} from '../schemaComposition/index.js';
import {proposalShapeFailure} from './proposalErrors.js';

const DIGEST = /^sha256:[0-9a-f]{64}$/u;

export function validateProposalShape(value: unknown): DecisionProposal {
    const proposal = object(value, 'proposal');
    if (proposal.schemaVersion !== 1) fail('proposal.schemaVersion', 'unsupported schema version');
    text(proposal.cycleId, 'cycleId');
    text(proposal.proposalId, 'proposalId');
    if (typeof proposal.type !== 'string' || !PROPOSAL_TYPES.includes(proposal.type as ProposalType)) fail('proposal.type', 'unsupported proposal type');
    digest(proposal.snapshotDigest, 'snapshotDigest');
    date(proposal.expiresAt, 'expiresAt');
    stringArray(proposal.evidenceRefs, 'evidenceRefs');
    const type = proposal.type as ProposalType;
    const rawBody = object(proposal.body, 'body');
    validateBody(type, rawBody);
    const requestedEffects = effectArray(proposal.requestedEffects, 'requestedEffects');
    return buildProposal(type, {
        cycleId: proposal.cycleId as string, proposalId: proposal.proposalId as string,
        snapshotDigest: proposal.snapshotDigest as string, expiresAt: proposal.expiresAt as string,
        evidenceRefs: Object.freeze([...(proposal.evidenceRefs as string[])]), requestedEffects
    }, rawBody);
}

const BODY_FIELDS: Readonly<Record<ProposalType, readonly string[]>> = Object.freeze({
    'select-ready-batch': ['batchId'],
    'classify-reject': ['classification', 'findingIds', 'strategy', 'targetBatch'],
    'open-correction': ['batchId', 'findingIds'],
    'select-correction-route': ['batchId', 'route'],
    'request-reroute': ['fromEndpointId', 'toEndpointId'],
    'propose-reconciliation': ['projectionId', 'plan'],
    'request-pack-amendment': ['packId', 'reason'],
    'propose-specification-resolution': ['resolutionId', 'blockerId', 'recommendedDecision', 'affectedPaths', 'requiresSpecAuthority'],
    'admit-pack-amendment': ['amendmentRequestId', 'blockerId', 'resolutionId', 'supersedesSeal', 'candidateSeal', 'reviewedCommit', 'packAcceptanceRef', 'specAuthoritySessionId'],
    'resume-specification-blocked-session': ['blockerId', 'workerSessionId', 'operatorSessionId', 'worktreeId', 'syncedRevision'],
    'grant-session-budget': ['sessionId', 'grantTokens', 'reason'],
    'place-hold': ['scope', 'reason', 'expiresAt'],
    'release-hold': ['holdId'],
    escalate: ['reason', 'profile']
});

const BODY_OPTIONAL_FIELDS: Readonly<Partial<Record<ProposalType, readonly string[]>>> = Object.freeze({
    'propose-specification-resolution': ['affectedRequirementIds', 'alternatives', 'rationale', 'impactDigest']
});

function validateBody(type: ProposalType, body: Record<string, unknown>): void {
    const required = BODY_FIELDS[type];
    const optional = BODY_OPTIONAL_FIELDS[type] ?? [];
    const keys = Object.keys(body);
    if (required.some((field) => !(field in body)) || keys.some((key) => key !== 'type' && !required.includes(key) && !optional.includes(key))) {
        fail(`body(${type})`, 'contains missing, extra, or unsupported members');
    }
    for (const field of required) validateBodyField(type, field, body[field]);
    for (const field of optional) if (field in body) validateBodyField(type, field, body[field]);
}

function validateBodyField(type: ProposalType, field: string, value: unknown): void {
    const subject = `body(${type}).${field}`;
    if (field === 'grantTokens') { if (!Number.isSafeInteger(value) || Number(value) <= 0) fail(subject, 'must be a positive safe integer'); return; }
    if (field === 'requiresSpecAuthority') { if (value !== true) fail(subject, 'must be true'); return; }
    if (field === 'expiresAt') { date(value, subject); return; }
    if (field === 'findingIds' || field === 'affectedPaths' || field === 'affectedRequirementIds' || field === 'alternatives' || field === 'scope') { stringArray(value, subject); return; }
    if (field === 'impactDigest' || field === 'candidateSeal' || field === 'supersedesSeal') { digest(value, subject); return; }
    if (field === 'reviewedCommit') { if (typeof value !== 'string' || !/^[0-9a-f]{40}$/u.test(value)) fail(subject, 'must be a 40-hex commit SHA'); return; }
    text(value, subject);
}

interface ProposalEnvelope {
    readonly cycleId: string;
    readonly proposalId: string;
    readonly snapshotDigest: string;
    readonly expiresAt: string;
    readonly evidenceRefs: readonly string[];
    readonly requestedEffects: readonly RequestedEffect[];
}

/**
 * Constructs the closed `DecisionProposal` union member matching the already-verified
 * `type`, one case per proposal type. Each branch reads its own already-validated
 * fields off `body` by name — never a blanket `as DecisionProposal`/`as ProposalBody`
 * cast that would let an unrelated body shape type-check against the wrong variant.
 */
function buildProposal(type: ProposalType, envelope: ProposalEnvelope, body: Record<string, unknown>): DecisionProposal {
    const {cycleId, proposalId, snapshotDigest, expiresAt, evidenceRefs, requestedEffects} = envelope;
    const schemaVersion = 1 as const;
    switch (type) {
        case 'select-ready-batch':
            return Object.freeze({schemaVersion, cycleId, proposalId, type, snapshotDigest, expiresAt, evidenceRefs, requestedEffects,
                body: Object.freeze({type, batchId: body.batchId as string})});
        case 'classify-reject':
            return Object.freeze({schemaVersion, cycleId, proposalId, type, snapshotDigest, expiresAt, evidenceRefs, requestedEffects,
                body: Object.freeze({type, classification: body.classification as string, findingIds: Object.freeze([...(body.findingIds as string[])]), strategy: body.strategy as string, targetBatch: body.targetBatch as string})});
        case 'open-correction':
            return Object.freeze({schemaVersion, cycleId, proposalId, type, snapshotDigest, expiresAt, evidenceRefs, requestedEffects,
                body: Object.freeze({type, batchId: body.batchId as string, findingIds: Object.freeze([...(body.findingIds as string[])])})});
        case 'select-correction-route':
            return Object.freeze({schemaVersion, cycleId, proposalId, type, snapshotDigest, expiresAt, evidenceRefs, requestedEffects,
                body: Object.freeze({type, batchId: body.batchId as string, route: body.route as string})});
        case 'request-reroute':
            return Object.freeze({schemaVersion, cycleId, proposalId, type, snapshotDigest, expiresAt, evidenceRefs, requestedEffects,
                body: Object.freeze({type, fromEndpointId: body.fromEndpointId as string, toEndpointId: body.toEndpointId as string})});
        case 'propose-reconciliation':
            return Object.freeze({schemaVersion, cycleId, proposalId, type, snapshotDigest, expiresAt, evidenceRefs, requestedEffects,
                body: Object.freeze({type, projectionId: body.projectionId as string, plan: body.plan as string})});
        case 'request-pack-amendment':
            return Object.freeze({schemaVersion, cycleId, proposalId, type, snapshotDigest, expiresAt, evidenceRefs, requestedEffects,
                body: Object.freeze({type, packId: body.packId as string, reason: body.reason as string})});
        case 'propose-specification-resolution':
            return Object.freeze({schemaVersion, cycleId, proposalId, type, snapshotDigest, expiresAt, evidenceRefs, requestedEffects,
                body: Object.freeze({
                    type, resolutionId: body.resolutionId as string, blockerId: body.blockerId as string,
                    recommendedDecision: body.recommendedDecision as string, affectedPaths: Object.freeze([...(body.affectedPaths as string[])]),
                    requiresSpecAuthority: true,
                    ...('affectedRequirementIds' in body ? {affectedRequirementIds: Object.freeze([...(body.affectedRequirementIds as string[])])} : {}),
                    ...('alternatives' in body ? {alternatives: Object.freeze([...(body.alternatives as string[])])} : {}),
                    ...('rationale' in body ? {rationale: body.rationale as string} : {}),
                    ...('impactDigest' in body ? {impactDigest: body.impactDigest as string} : {})
                })});
        case 'admit-pack-amendment':
            return Object.freeze({schemaVersion, cycleId, proposalId, type, snapshotDigest, expiresAt, evidenceRefs, requestedEffects,
                body: Object.freeze({
                    type, amendmentRequestId: body.amendmentRequestId as string, blockerId: body.blockerId as string,
                    resolutionId: body.resolutionId as string, supersedesSeal: body.supersedesSeal as string,
                    candidateSeal: body.candidateSeal as string, reviewedCommit: body.reviewedCommit as string,
                    packAcceptanceRef: body.packAcceptanceRef as string, specAuthoritySessionId: body.specAuthoritySessionId as string
                })});
        case 'resume-specification-blocked-session':
            return Object.freeze({schemaVersion, cycleId, proposalId, type, snapshotDigest, expiresAt, evidenceRefs, requestedEffects,
                body: Object.freeze({type, blockerId: body.blockerId as string, workerSessionId: body.workerSessionId as string, operatorSessionId: body.operatorSessionId as string, worktreeId: body.worktreeId as string, syncedRevision: body.syncedRevision as string})});
        case 'grant-session-budget':
            return Object.freeze({schemaVersion, cycleId, proposalId, type, snapshotDigest, expiresAt, evidenceRefs, requestedEffects,
                body: Object.freeze({type, sessionId: body.sessionId as string, grantTokens: body.grantTokens as number, reason: body.reason as string})});
        case 'place-hold':
            return Object.freeze({schemaVersion, cycleId, proposalId, type, snapshotDigest, expiresAt, evidenceRefs, requestedEffects,
                body: Object.freeze({type, scope: Object.freeze([...(body.scope as string[])]), reason: body.reason as string, expiresAt: body.expiresAt as string})});
        case 'release-hold':
            return Object.freeze({schemaVersion, cycleId, proposalId, type, snapshotDigest, expiresAt, evidenceRefs, requestedEffects,
                body: Object.freeze({type, holdId: body.holdId as string})});
        case 'escalate':
            return Object.freeze({schemaVersion, cycleId, proposalId, type, snapshotDigest, expiresAt, evidenceRefs, requestedEffects,
                body: Object.freeze({type, reason: body.reason as string, profile: body.profile as string})});
    }
}

function effectArray(value: unknown, subject: string): readonly RequestedEffect[] {
    if (!Array.isArray(value)) fail(subject, 'must be an array');
    return Object.freeze(value.map((item, index) => effectValue(item, `${subject}[${index}]`)));
}

function effectValue(value: unknown, subject: string): RequestedEffect {
    const record = object(value, subject);
    if (Object.keys(record).length !== 1 || !Object.hasOwn(record, 'effect')) fail(subject, 'contains missing, extra, or unsupported members');
    if (typeof record.effect !== 'string' || !EFFECT_TYPES.includes(record.effect as EffectType)) fail(`${subject}.effect`, 'unsupported effect type');
    return Object.freeze({effect: record.effect as EffectType});
}

function object(value: unknown, subject: string): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(subject, 'must be an object');
    return value as Record<string, unknown>;
}
function text(value: unknown, subject: string): void { if (typeof value !== 'string' || value.length === 0 || value.length > 512 || /[\x00-\x1f\x7f]/u.test(value)) fail(subject, 'must be bounded text'); }
function digest(value: unknown, subject: string): void { if (typeof value !== 'string' || !DIGEST.test(value)) fail(subject, 'must be a sha256 digest'); }
function date(value: unknown, subject: string): void { if (typeof value !== 'string' || !isRfc3339DateTime(value)) fail(subject, 'must be RFC 3339 date-time'); }
function stringArray(value: unknown, subject: string): void {
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.length === 0 || item.length > 512 || /[\x00-\x1f\x7f]/u.test(item))) fail(subject, 'must be a bounded string array');
    if (new Set(value).size !== value.length) fail(subject, 'contains duplicate members');
}
function fail(subject: string, message: string): never { proposalShapeFailure('PROPOSAL_SCHEMA_INVALID', subject, message); }
