import type {CatalogAggregateFileSystem} from './catalogAggregateFileSystem.js';

export function aggregateErrorCode(error: unknown): string | null {
    return typeof error === 'object' && error !== null && 'code' in error &&
        typeof error.code === 'string' ? error.code : null;
}

export async function attemptAggregateOperation(
    operation: () => Promise<void>,
    failures: string[],
    subject: string
): Promise<void> {
    try {
        await operation();
    } catch {
        failures.push(subject);
    }
}

export async function syncAggregateDirectory(
    path: string,
    fileSystem: CatalogAggregateFileSystem
): Promise<void> {
    const handle = await fileSystem.open(path, 'r');
    try {
        await handle.sync();
    } finally {
        await handle.close();
    }
}
