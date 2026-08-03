// Ambient NVB type hints for watchtower runtime-NVB handlers.
// Extend as needed when using advanced NVB handler APIs.

declare module '@nirvana/builder' {
    export class TaskHandler {
        constructor(input: {
            taskName: string;
            handlerName: string;
            hasSyncHandler?: boolean;
            hasAsyncHandler?: boolean;
            waitForDoneSignalOnSync?: boolean;
            waitForDoneSignalOnAsync?: boolean;
        });

        readonly argMap: {get(key: string): unknown; getOriginalIndexes(key: string): readonly number[]};
        readonly cwd: string | null;
        onResult(result: unknown): void;
        doneSignal(err?: Error): void;
    }
}

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

        readonly argMap: {get(key: string): unknown; getOriginalIndexes(key: string): readonly number[]};
        readonly cwd: string | null;
        onResult(result: unknown): void;
        doneSignal(err?: Error): void;
    }
}

declare module '@nirvana/b-core/tasks' {
    export interface TaskHandlerContext {
        cwd?: string;
        args?: string[];
    }
}
