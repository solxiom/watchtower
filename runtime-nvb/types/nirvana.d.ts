// Ambient NVB type hints for watchtower runtime-NVB handlers.
// Extend as needed when using advanced NVB handler APIs.

declare module '@nirvana/b-core/TaskHandler' {
    export default class TaskHandler {
        constructor(input: {
            taskName: string;
            handlerName: string;
            hasSyncHandler?: boolean;
            hasAsyncHandler?: boolean;
            waitForDoneSignalOnSync?: boolean;
            waitForDoneSignalOnAsync?: boolean;
        });

        doneSignal(err?: Error): void;
    }
}

declare module '@nirvana/b-core/tasks' {
    export interface TaskHandlerContext {
        cwd?: string;
        args?: string[];
    }
}
