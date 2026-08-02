export const RUNTIME_CATALOG_REASONS = [
    'VERSION_ALREADY_INSTALLED',
    'VERSION_NOT_INSTALLED',
    'INVALID_VERSION_STRING',
    'STAGING_VALIDATION_FAILED',
    'STAGING_IO_ERROR'
] as const;

export type RuntimeCatalogReason = typeof RUNTIME_CATALOG_REASONS[number];

export class RuntimeCatalogError extends Error {
    constructor(readonly reason: RuntimeCatalogReason, readonly subject: string, message: string) {
        super(message);
        this.name = 'RuntimeCatalogError';
    }
}
