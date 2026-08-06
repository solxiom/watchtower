import {PROPOSAL_REASONS} from '../../contracts/index.js';
import type {ProposalReason} from '../../contracts/index.js';

export {PROPOSAL_REASONS};
export type {ProposalReason};

/** Thrown only for structurally malformed input outside the boundary `validateProposal` accepts as `unknown`; every other rejection is a typed `ValidationError` entry, never a throw. */
export class ProposalShapeError extends Error {
    constructor(readonly reason: ProposalReason, readonly subject: string, message: string) {
        super(message);
        this.name = 'ProposalShapeError';
    }
}

export function proposalShapeFailure(reason: ProposalReason, subject: string, message: string): never {
    throw new ProposalShapeError(reason, subject, message);
}
