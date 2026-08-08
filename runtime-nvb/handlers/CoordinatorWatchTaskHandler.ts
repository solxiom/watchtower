import {TaskHandler} from '@nirvana/builder';

import {decodeTaskRequest, TASK_REQUEST_FLAG} from '../foundation/task/runtime/laneTaskRequest.js';
import {isPollTriggersInput, refusedPoll, type PollTriggersResult} from './coordinatorWatch/coordinatorWatchTaskContracts.js';
import {runPollTriggers} from './coordinatorWatch/pollTriggersScan.js';

const POLL_TRIGGERS_TASK = 'wt:coordinator:poll-triggers';

/**
 * Focused packaged TaskHandler for CA-13's one declared read-only action
 * (`coordinator.poll-triggers` → `wt:coordinator:poll-triggers`).
 *
 * It performs the bounded watcher-journal scan and nothing else. It has no
 * cataloged leaf, needs no invocation envelope, writes no byte, and cannot
 * reach the queue, the cursor, routing policy, or the effect executor —
 * priority policy, cycle state, effect authority, and journal *truth* stay with
 * the application services, which reach this task only through
 * `LaneTaskRunner`.
 *
 * Its result is evidence, not a decision: a bounded page of typed candidates
 * plus the §9 journal identity and byte offsets a cursor checkpoint needs.
 */
export default class CoordinatorWatchTaskHandler extends TaskHandler {
    static readonly handlerName = 'CoordinatorWatchTaskHandler';
    private readonly ownTaskName: string;

    constructor({taskName}: {readonly taskName: string}) {
        super({
            taskName, handlerName: CoordinatorWatchTaskHandler.handlerName,
            hasSyncHandler: false, hasAsyncHandler: true, waitForDoneSignalOnAsync: true
        });
        this.ownTaskName = taskName;
    }

    async handleAsync(): Promise<void> {
        const result = this.handlePollTriggers(decodeTaskRequest(this.argMap.get(TASK_REQUEST_FLAG)));
        this.onResult({structuredOutput: result});
        this.doneSignal(result.ok ? undefined : new Error('COORDINATOR_WATCH_TASK_FAILED'));
    }

    private handlePollTriggers(request: unknown): PollTriggersResult {
        if (this.ownTaskName !== POLL_TRIGGERS_TASK) return refusedPoll('COORDINATOR_POLL_INPUT_INVALID');
        return isPollTriggersInput(request) ? runPollTriggers(request) : refusedPoll('COORDINATOR_POLL_INPUT_INVALID');
    }
}
