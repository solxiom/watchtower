/**
 * The single refusal owner for the CA-17 session routing/budget capsule.
 * Every module in this capsule fails through `sessionRoutingFailure` so a
 * consumer branches on a stable `reason` code and never on message text.
 */
import {SESSION_ROUTING_REASONS} from '../../../../contracts/index.js';
import type {SessionRoutingReason} from '../../../../contracts/index.js';

export {SESSION_ROUTING_REASONS};
export type {SessionRoutingReason};

export class SessionRoutingError extends Error {
    constructor(readonly reason: SessionRoutingReason, readonly subject: string, message: string) {
        super(message);
        this.name = 'SessionRoutingError';
    }
}

export function sessionRoutingFailure(reason: SessionRoutingReason, subject: string, message: string): never {
    throw new SessionRoutingError(reason, subject, message);
}
