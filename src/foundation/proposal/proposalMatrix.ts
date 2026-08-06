/**
 * The closed origin/class/effect matrix (`docs/spec/v1-contracts.md` §5,
 * `docs/spec/coordinator-automation.md` §11.2, `specification-resolution-batch-amendment.md`
 * Batch Ownership row for CA-09). One entry per proposal type; nothing outside
 * this table may add, remove, or reinterpret a permitted origin or legal effect.
 */
import {PROPOSAL_TYPES} from '../../contracts/index.js';
import type {EffectType, ProposalOrigin, ProposalType} from '../../contracts/index.js';

export type RoutingFloor = 'M0' | 'D1' | 'D2' | 'D3';
export type ConfirmationRule = 'never' | 'always' | 'operator-origin-only';

export type MinimumCapability = 'C2' | 'C3' | 'C5';

export interface ProposalRule {
    readonly minimumClass: RoutingFloor | null;
    readonly permittedOrigins: readonly ProposalOrigin[];
    readonly legalEffects: readonly EffectType[];
    readonly confirmation: ConfirmationRule;
    readonly requiresSpecAuthority: boolean;
    /** The endpoint capability floor an authorizing envelope must record (`specification-resolution.md` §5: "coordinator selects a C5 endpoint"). `null` when no floor beyond the routing policy's own class-based selection applies. */
    readonly minimumCapability: MinimumCapability | null;
}

const MATRIX: Readonly<Record<ProposalType, ProposalRule>> = Object.freeze({
    'select-ready-batch': {minimumClass: 'D1', permittedOrigins: ['coordinator-D1', 'operator'], legalEffects: ['dispatch-batch'], confirmation: 'operator-origin-only', requiresSpecAuthority: false, minimumCapability: null},
    'classify-reject': {minimumClass: 'D2', permittedOrigins: ['coordinator-D2'], legalEffects: [], confirmation: 'never', requiresSpecAuthority: false, minimumCapability: null},
    'open-correction': {minimumClass: 'D2', permittedOrigins: ['coordinator-D2'], legalEffects: ['open-correction'], confirmation: 'never', requiresSpecAuthority: false, minimumCapability: null},
    'select-correction-route': {minimumClass: 'D2', permittedOrigins: ['coordinator-D2'], legalEffects: ['route-correction'], confirmation: 'never', requiresSpecAuthority: false, minimumCapability: null},
    'request-reroute': {minimumClass: 'D1', permittedOrigins: ['coordinator-D1'], legalEffects: ['reroute-endpoint'], confirmation: 'never', requiresSpecAuthority: false, minimumCapability: null},
    'propose-reconciliation': {minimumClass: 'D3', permittedOrigins: ['coordinator-D3'], legalEffects: ['reconcile-projection'], confirmation: 'always', requiresSpecAuthority: false, minimumCapability: null},
    'request-pack-amendment': {minimumClass: 'D2', permittedOrigins: ['coordinator-D2'], legalEffects: ['create-amendment-request'], confirmation: 'always', requiresSpecAuthority: false, minimumCapability: null},
    'propose-specification-resolution': {minimumClass: 'D3', permittedOrigins: ['architect-advisor'], legalEffects: [], confirmation: 'never', requiresSpecAuthority: false, minimumCapability: 'C5'},
    'admit-pack-amendment': {minimumClass: null, permittedOrigins: ['operator'], legalEffects: ['activate-pack-revision'], confirmation: 'always', requiresSpecAuthority: true, minimumCapability: null},
    'resume-specification-blocked-session': {minimumClass: 'M0', permittedOrigins: ['M0-system'], legalEffects: ['resume-blocked-session'], confirmation: 'never', requiresSpecAuthority: false, minimumCapability: null},
    'grant-session-budget': {minimumClass: null, permittedOrigins: ['operator'], legalEffects: ['grant-session-budget'], confirmation: 'always', requiresSpecAuthority: false, minimumCapability: null},
    'place-hold': {minimumClass: null, permittedOrigins: ['operator', 'M0-safety'], legalEffects: ['place-hold'], confirmation: 'operator-origin-only', requiresSpecAuthority: false, minimumCapability: null},
    'release-hold': {minimumClass: null, permittedOrigins: ['operator', 'M0-system'], legalEffects: ['release-hold'], confirmation: 'operator-origin-only', requiresSpecAuthority: false, minimumCapability: null},
    escalate: {minimumClass: 'D1', permittedOrigins: ['coordinator-D1', 'coordinator-D2', 'coordinator-D3'], legalEffects: ['open-escalation'], confirmation: 'never', requiresSpecAuthority: false, minimumCapability: null}
});

export function proposalRule(type: ProposalType): ProposalRule {
    return MATRIX[type];
}

export function getPermittedOrigins(type: ProposalType): readonly ProposalOrigin[] {
    return MATRIX[type].permittedOrigins;
}

export function getLegalEffects(type: ProposalType): readonly EffectType[] {
    return MATRIX[type].legalEffects;
}

/** Every `ProposalType` has exactly one matrix row — a structural guarantee the module-load-time check below proves once. */
function assertCompleteMatrix(): void {
    for (const type of PROPOSAL_TYPES) if (!(type in MATRIX)) throw new Error(`proposalMatrix: missing rule for "${type}"`);
}
assertCompleteMatrix();
