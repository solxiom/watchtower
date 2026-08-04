import type {TaskCatalogTaskFailureCode} from './taskCatalogTaskContracts.js';

export class TaskCatalogFileBoundaryError extends Error {
    constructor(
        readonly code: TaskCatalogTaskFailureCode,
        readonly subject: string | null
    ) {
        super(code);
    }
}
