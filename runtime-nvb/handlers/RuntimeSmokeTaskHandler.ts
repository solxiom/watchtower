import {TaskHandler} from '@nirvana/builder';

import {readRuntimeSmokeTaskRequest, runRuntimeSmokeTask, type RuntimeSmokeArgMap} from './smoke/runtimeSmokeTask.js';

export default class RuntimeSmokeTaskHandler extends TaskHandler {
    static readonly handlerName = 'RuntimeSmokeTaskHandler';
    private readonly requestArgMap: RuntimeSmokeArgMap | undefined;

    constructor({taskName, requestArgMap}: {readonly taskName: string; readonly requestArgMap?: RuntimeSmokeArgMap}) {
        super({
            taskName,
            handlerName: RuntimeSmokeTaskHandler.handlerName,
            hasSyncHandler: false,
            hasAsyncHandler: true,
            waitForDoneSignalOnAsync: true
        });
        this.requestArgMap = requestArgMap;
    }

    async handleAsync(): Promise<void> {
        const result = runRuntimeSmokeTask(readRuntimeSmokeTaskRequest(this.requestArgMap ?? this.argMap));
        this.onResult({structuredOutput: result});
        this.doneSignal(result.ok ? undefined : new Error(result.failure.code));
    }
}
