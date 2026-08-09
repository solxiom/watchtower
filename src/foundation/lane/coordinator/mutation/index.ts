/**
 * Public capsule surface for the mutating coordinator command boundary
 * (CA-25). Exactly one owner exists for the command-boundary fences
 * (`coordinatorMutationFences`), the declared-action task input projection
 * (`coordinatorEffectParameters`), the durable authorization capsule
 * (`coordinatorAuthorizationCapsule`), the CA-09/CA-10 bridge
 * (`Ca10CoordinatorEffectAuthority`), and the read-only resolution projections
 * (`SpecificationResolutionReadService`). Nothing here validates a proposal,
 * plans an effect, or writes lane state itself.
 */
export {Ca10CoordinatorEffectAuthority} from './CoordinatorEffectAuthority.js';
export type {CoordinatorEffectAuthority, CoordinatorEffectAuthorityOptions} from './CoordinatorEffectAuthority.js';
export {checkMutationFences, isAdvisoryOperation, permittedProposalTypes} from './coordinatorMutationFences.js';
export {effectParametersFor} from './coordinatorEffectParameters.js';
export type {EffectParameterInput, EffectParameters} from './coordinatorEffectParameters.js';
export {
    DurableCoordinatorAuthorizationSource, capsuleRelativePath
} from './coordinatorAuthorizationCapsule.js';
export type {CapsuleRead, CoordinatorAuthorizationSource} from './coordinatorAuthorizationCapsule.js';
export {LaneCoordinatorMutationContextSource} from './LaneCoordinatorMutationContextSource.js';
export type {
    CoordinatorMutationContextOptions, CoordinatorMutationRequestSource, CoordinatorMutationResolution,
    CoordinatorMutationSelection
} from './LaneCoordinatorMutationContextSource.js';
export {SpecificationResolutionReadService} from './SpecificationResolutionReadService.js';
export type {SpecificationResolutionReadOptions} from './SpecificationResolutionReadService.js';
export {createDefaultCoordinatorMutationComposition} from './CoordinatorMutationComposition.js';
export type {CoordinatorMutationComposition} from './CoordinatorMutationComposition.js';
