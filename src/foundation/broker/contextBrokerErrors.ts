import {BROKER_REASONS} from '../../contracts/index.js';
import type {BrokerReason} from '../../contracts/index.js';

export {BROKER_REASONS};
export type {BrokerReason};

/** Every refusal this capsule raises; consumers branch on `reason`, never on message text. */
export class BrokerError extends Error {
    constructor(readonly reason: BrokerReason, readonly subject: string, message: string) {
        super(message);
        this.name = 'BrokerError';
    }
}

export function brokerFailure(reason: BrokerReason, subject: string, message: string): never {
    throw new BrokerError(reason, subject, message);
}
