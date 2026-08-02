import {join} from 'node:path';
import {RuntimeCatalogError} from '../../contracts/runtimeCatalog.js';
import type {ImmutableVersionFileSystem} from './ImmutableVersionFileSystem.js';
import {finalizingPublicationPath, pendingPublicationPath} from './PendingVersionPublication.js';

/** Read boundary that refuses to present pending publications as installed. */
export class InstalledVersionCatalog {
    constructor(private readonly fileSystem: ImmutableVersionFileSystem) {}

    root(parent: string, version: string, validate: (root: string) => void): string {
        const root = join(parent, version);
        try {
            this.rejectPending(parent, version);
            if (!this.fileSystem.exists(root)) {
                throw new RuntimeCatalogError('VERSION_NOT_INSTALLED', version, `Version ${version} is not installed.`);
            }
            if (!this.fileSystem.lstat(root).isDirectory()) {
                throw new RuntimeCatalogError('STAGING_VALIDATION_FAILED', version, 'Version root is not a directory.');
            }
            validate(root);
            return this.fileSystem.realpath(root);
        } catch (error) { throw normalizeReadError(error, version); }
    }

    list(parent: string, validVersion: (value: string) => boolean, validate: (root: string) => void): string[] {
        try {
            if (!this.fileSystem.exists(parent)) return [];
            return this.fileSystem.readdir(parent).filter((entry) => validVersion(entry.name)).map((entry) => {
                this.rejectPending(parent, entry.name);
                if (!entry.isDirectory()) {
                    throw new RuntimeCatalogError('STAGING_VALIDATION_FAILED', entry.name, 'Version root is not a directory.');
                }
                const root = join(parent, entry.name);
                validate(root);
                return entry.name;
            }).sort((left, right) => left.localeCompare(right));
        } catch (error) { throw normalizeReadError(error, parent); }
    }

    private rejectPending(parent: string, version: string): void {
        if (this.fileSystem.exists(pendingPublicationPath(parent, version))
            || this.fileSystem.exists(finalizingPublicationPath(parent, version))) {
            throw new RuntimeCatalogError('STAGING_IO_ERROR', version, 'Runtime version publication is pending recovery.');
        }
    }
}

function normalizeReadError(error: unknown, subject: string): RuntimeCatalogError {
    if (error instanceof RuntimeCatalogError) return error;
    const detail = error instanceof Error ? error.message : 'unknown error';
    return new RuntimeCatalogError('STAGING_IO_ERROR', subject, `Unable to read runtime catalog ${subject}: ${detail}`);
}
