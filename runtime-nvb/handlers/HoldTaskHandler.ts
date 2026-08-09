import {TaskHandler} from '@nirvana/builder';

import {decodeTaskRequest, TASK_REQUEST_FLAG} from '../foundation/task/runtime/laneTaskRequest.js';
// The foundation closure is staged by dist:runtime-nvb:foundation-compile before
// this handler is compiled and is part of the relocated runtime package.
// @ts-ignore staged runtime foundation is not in the handler source root
import {runHoldEffectTask, ScopedHoldError} from '../foundation/lane/coordinator/hold/index.js';
import {isHoldTaskInput, refusedHoldResult} from './hold/holdTaskContracts.js';

/**
 * Packaged `TaskHandler` for the two CA-27 hold declared actions
 * (`effect.placeHold` → `wt:hold:place`, `effect.releaseHold` →
 * `wt:hold:release`). Review correction CA27-03: this is the one place the
 * declared actions actually reach `ScopedHoldService`. Mechanics only — no
 * precondition/conflict logic lives here; that stays owned by CA-09's
 * `ProposalValidator` and `ScopedHoldService` itself.
 */
export default class HoldTaskHandler extends TaskHandler {
    static readonly handlerName = 'HoldTaskHandler';

    constructor({taskName}: {readonly taskName: string}) {
        super({
            taskName, handlerName: HoldTaskHandler.handlerName,
            hasSyncHandler: false, hasAsyncHandler: true, waitForDoneSignalOnAsync: true
        });
    }

    async handleAsync(): Promise<void> {
        const request = decodeTaskRequest(this.argMap.get(TASK_REQUEST_FLAG));
        if (!isHoldTaskInput(request)) {
            this.onResult({structuredOutput: refusedHoldResult()});
            this.doneSignal(new Error('HOLD_TASK_INPUT_INVALID'));
            return;
        }
        try {
            const result = runHoldEffectTask(request);
            this.onResult({structuredOutput: result});
            this.doneSignal(undefined);
        } catch (error) {
            const reason = error instanceof ScopedHoldError ? (error as {reason: string}).reason : 'HOLD_TASK_FAILED';
            this.onResult({structuredOutput: refusedHoldResult(reason)});
            this.doneSignal(error instanceof Error ? error : new Error(reason));
        }
    }
}
