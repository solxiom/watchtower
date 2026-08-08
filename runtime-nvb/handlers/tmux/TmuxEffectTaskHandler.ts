import {TaskHandler} from '@nirvana/builder';

import {readTmuxTaskRequest, runTmuxTask, type TmuxTaskArgMap} from './tmuxEffectTask.js';

export default class TmuxEffectTaskHandler extends TaskHandler {
    static readonly handlerName = 'TmuxEffectTaskHandler';
    private readonly requestArgMap: TmuxTaskArgMap | undefined;

    constructor({taskName, requestArgMap}: {readonly taskName: string; readonly requestArgMap?: TmuxTaskArgMap}) {
        super({taskName, handlerName: TmuxEffectTaskHandler.handlerName, hasSyncHandler: false,
            hasAsyncHandler: true, waitForDoneSignalOnAsync: true});
        this.requestArgMap = requestArgMap;
    }

    async handleAsync(): Promise<void> {
        const result = await runTmuxTask(readTmuxTaskRequest(this.requestArgMap ?? this.argMap));
        this.onResult({structuredOutput: result});
        this.doneSignal(result.ok ? undefined : new Error('TMUX_TASK_FAILED'));
    }
}
