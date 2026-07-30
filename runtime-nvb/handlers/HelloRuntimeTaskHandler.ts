// Example runtime-NVB handler for watchtower.
// Remove or extend this when building real task capabilities.

import TaskHandler from "@nirvana/b-core/TaskHandler";

export default class HelloRuntimeTaskHandler extends TaskHandler {

    static handlerName = 'HelloRuntimeTaskHandler';

    constructor({taskName}: {taskName: string}) {
        super({
            taskName,
            handlerName: HelloRuntimeTaskHandler.handlerName,
            hasSyncHandler: true,
            hasAsyncHandler: false,
            waitForDoneSignalOnSync: true
        });
    }

    handleSync(message: string = 'Hello from watchtower runtime NVB.'): void {
        process.stdout.write(`[wt] ${message}\n`);
        this.doneSignal();
    }
}
