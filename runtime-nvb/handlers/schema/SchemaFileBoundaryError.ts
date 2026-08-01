import type {SchemaCompositionTaskFailureCode} from './schemaCompositionTaskContracts.js';

export class SchemaFileBoundaryError extends Error {
    constructor(
        readonly code: SchemaCompositionTaskFailureCode,
        readonly subject: string | null
    ) {
        super(code);
    }
}
