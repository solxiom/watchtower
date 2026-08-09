/** Injected amendment-request identity — the only randomness `AmendmentRequestStore` sees. */
import {randomUUID} from 'node:crypto';

export interface AmendmentIdFactory {
    nextAmendmentRequestId(): string;
}

export const nodeAmendmentIdFactory: AmendmentIdFactory = Object.freeze({
    nextAmendmentRequestId(): string {
        return randomUUID();
    }
});
