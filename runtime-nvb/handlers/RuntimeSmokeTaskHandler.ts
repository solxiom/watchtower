import {TaskHandler} from '@nirvana/builder';

import {runRuntimeSmokeTask} from './smoke/runtimeSmokeTask.js';

export default class RuntimeSmokeTaskHandler extends TaskHandler {
    static readonly handlerName = 'RuntimeSmokeTaskHandler';

    constructor({taskName}: {readonly taskName: string}) {
        super({
            taskName,
            handlerName: RuntimeSmokeTaskHandler.handlerName,
            hasSyncHandler: false,
            hasAsyncHandler: true,
            waitForDoneSignalOnAsync: true
        });
    }

    async handleAsync(input?: unknown): Promise<void> {
        const result = runRuntimeSmokeTask(input);
        this.onResult(result);
        this.doneSignal(result.ok ? undefined : new Error(result.failure.code));
    }
}
