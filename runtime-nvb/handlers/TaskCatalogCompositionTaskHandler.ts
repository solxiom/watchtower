import {randomUUID} from 'node:crypto';

import {TaskHandler} from '@nirvana/builder';

import {runTaskCatalogCompositionTask} from
    '../foundation/taskCatalogComposition/taskCatalogCompositionFileAdapter.js';

export default class TaskCatalogCompositionTaskHandler extends TaskHandler {
    static readonly handlerName = 'TaskCatalogCompositionTaskHandler';

    constructor({taskName}: {readonly taskName: string}) {
        super({
            taskName,
            handlerName: TaskCatalogCompositionTaskHandler.handlerName,
            hasSyncHandler: false,
            hasAsyncHandler: true,
            waitForDoneSignalOnAsync: true
        });
    }

    async handleAsync(input: unknown = {mode: 'check'}): Promise<void> {
        const result = await runTaskCatalogCompositionTask(this.cwd, input, {tempToken: randomUUID});
        this.onResult(result);
        this.doneSignal(result.ok ? undefined : new Error(result.failure.code));
    }
}
