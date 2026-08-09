/** Injected hold identity — the only randomness `ScopedHoldService` sees. */
import {randomUUID} from 'node:crypto';

export interface HoldIdFactory {
    nextHoldId(): string;
}

export const nodeHoldIdFactory: HoldIdFactory = Object.freeze({
    nextHoldId(): string {
        return randomUUID();
    }
});
