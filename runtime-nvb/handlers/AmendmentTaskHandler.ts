import {TaskHandler} from '@nirvana/builder';

import {decodeTaskRequest, TASK_REQUEST_FLAG} from '../foundation/task/runtime/laneTaskRequest.js';
// The foundation closure is staged by dist:runtime-nvb:foundation-compile before
// this handler is compiled and is part of the relocated runtime package.
// @ts-ignore staged runtime foundation is not in the handler source root
import {runAmendmentEffectTask, AmendmentError} from '../foundation/lane/coordinator/amendment/index.js';
import {isAmendmentTaskInput, refusedAmendmentResult} from './amendment/amendmentTaskContracts.js';

/**
 * Packaged `TaskHandler` for the two CA-27 amendment declared actions
 * (`effect.createAmendmentRequest` → `wt:amendment:create-request`,
 * `effect.activatePackRevision` → `wt:amendment:admit`). Review correction
 * CA27-03: this is the one place those declared actions actually reach
 * `AmendmentRequestStore`/`AmendmentAdmissionService`. Mechanics only — the
 * authority/independence/seal-reproduction proof stays owned by
 * `assertAdmissionAuthority`; a forged-but-flag-valid request is refused
 * there, before `activatePackRevision` ever runs.
 */
export default class AmendmentTaskHandler extends TaskHandler {
    static readonly handlerName = 'AmendmentTaskHandler';

    constructor({taskName}: {readonly taskName: string}) {
        super({
            taskName, handlerName: AmendmentTaskHandler.handlerName,
            hasSyncHandler: false, hasAsyncHandler: true, waitForDoneSignalOnAsync: true
        });
    }

    async handleAsync(): Promise<void> {
        const request = decodeTaskRequest(this.argMap.get(TASK_REQUEST_FLAG));
        if (!isAmendmentTaskInput(request)) {
            this.onResult({structuredOutput: refusedAmendmentResult()});
            this.doneSignal(new Error('AMENDMENT_TASK_INPUT_INVALID'));
            return;
        }
        try {
            const result = runAmendmentEffectTask(request);
            this.onResult({structuredOutput: result});
            this.doneSignal(undefined);
        } catch (error) {
            const reason = error instanceof AmendmentError ? (error as {reason: string}).reason : 'AMENDMENT_TASK_FAILED';
            this.onResult({structuredOutput: refusedAmendmentResult(reason)});
            this.doneSignal(error instanceof Error ? error : new Error(reason));
        }
    }
}
