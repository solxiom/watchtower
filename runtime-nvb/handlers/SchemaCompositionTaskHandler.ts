import {randomUUID} from 'node:crypto';

import {TaskHandler} from '@nirvana/builder';

import {runSchemaCompositionTask} from './schema/SchemaCompositionFileAdapter.js';

export default class SchemaCompositionTaskHandler extends TaskHandler {
    static readonly handlerName = 'SchemaCompositionTaskHandler';

    constructor({taskName}: {readonly taskName: string}) {
        super({
            taskName,
            handlerName: SchemaCompositionTaskHandler.handlerName,
            hasSyncHandler: false,
            hasAsyncHandler: true,
            waitForDoneSignalOnAsync: true
        });
    }

    async handleAsync(input: unknown = {mode: 'check'}): Promise<void> {
        const result = await runSchemaCompositionTask(this.cwd, input, randomUUID);
        this.onResult(result);
        this.doneSignal(result.ok ? undefined : new Error(result.failure.code));
    }
}
