import {join} from 'node:path';
import {RuntimeCatalogError} from '../../../contracts/runtimeCatalog.js';
import type {ImmutableVersionFileSystem} from './ImmutableVersionFileSystem.js';
import {syncDirectory} from './RuntimeCatalogLock.js';

const SETTLE_ATTEMPTS = 2;

export interface PendingVersionPublicationState {
    readonly destination: string;
    readonly finalizing: string;
    readonly marker: string;
    readonly parent: string;
}

export interface PendingVersionPublicationHooks {
    readonly markerRemoved?: (path: string) => void;
}

/** Durable evidence that a renamed immutable destination still needs settlement. */
export class PendingVersionPublication {
    constructor(
        private readonly fileSystem: ImmutableVersionFileSystem,
        private readonly hooks: PendingVersionPublicationHooks = {}
    ) {}

    state(parent: string, version: string): PendingVersionPublicationState {
        return {
            destination: join(parent, version),
            finalizing: finalizingPublicationPath(parent, version),
            marker: pendingPublicationPath(parent, version),
            parent
        };
    }

    exists(state: PendingVersionPublicationState): boolean {
        return this.markerExists(state, state.marker) || this.markerExists(state, state.finalizing);
    }

    begin(state: PendingVersionPublicationState): void {
        this.fileSystem.writeFile(state.marker, '{"schemaVersion":1}\n', {flag: 'wx', mode: 0o600});
        syncFile(this.fileSystem, state.marker);
        syncDirectory(this.fileSystem, state.parent);
    }

    settle(state: PendingVersionPublicationState, validate: (root: string) => void): void {
        retry(() => {
            if (!this.fileSystem.exists(state.destination)
                || !this.fileSystem.lstat(state.destination).isDirectory()) {
                throw publicationFailure(state, 'Published destination is absent or invalid.');
            }
            validate(state.destination);
            syncDirectory(this.fileSystem, state.parent);
        });
    }

    settleFinalization(state: PendingVersionPublicationState): void {
        retry(() => {
            this.ensureFinalizingMarker(state);
            this.removePendingMarker(state);
        });
    }

    completeFinalization(state: PendingVersionPublicationState): void {
        retry(() => {
            syncDirectory(this.fileSystem, state.parent);
            if (!this.fileSystem.exists(state.finalizing)) return;
            try {
                this.fileSystem.unlink(state.finalizing);
                syncDirectory(this.fileSystem, state.parent);
            } catch (error) {
                this.ensureFinalizingMarker(state);
                throw error;
            }
        });
    }

    private ensureFinalizingMarker(state: PendingVersionPublicationState): void {
        if (!this.fileSystem.exists(state.finalizing)) {
            this.writeMarker(state, state.finalizing);
        }
        syncFile(this.fileSystem, state.finalizing);
        syncDirectory(this.fileSystem, state.parent);
    }

    private removePendingMarker(state: PendingVersionPublicationState): void {
        try {
            if (this.fileSystem.exists(state.marker)) {
                this.fileSystem.unlink(state.marker);
                if (!this.fileSystem.exists(state.marker)) this.hooks.markerRemoved?.(state.marker);
            }
            syncDirectory(this.fileSystem, state.parent);
        } catch (error) {
            try { this.restorePendingMarker(state); }
            catch (restorationError) {
                throw publicationFailure(
                    state,
                    `Pending marker restoration failed after ${errorMessage(error)}: ${errorMessage(restorationError)}`
                );
            }
            throw error;
        }
    }

    private restorePendingMarker(state: PendingVersionPublicationState): void {
        if (!this.fileSystem.exists(state.marker)) this.writeMarker(state, state.marker);
        syncFile(this.fileSystem, state.marker);
        syncDirectory(this.fileSystem, state.parent);
    }

    private writeMarker(state: PendingVersionPublicationState, path: string): void {
        try {
            this.fileSystem.writeFile(path, '{"schemaVersion":1}\n', {flag: 'wx', mode: 0o600});
        } catch (error) {
            if (!this.fileSystem.exists(path)) throw error;
        }
        if (!this.markerExists(state, path)) throw publicationFailure(state, 'Publication marker is invalid.');
    }

    private markerExists(state: PendingVersionPublicationState, path: string): boolean {
        if (!this.fileSystem.exists(path)) return false;
        const marker = this.fileSystem.lstat(path);
        if (!marker.isFile() || marker.isSymbolicLink()) {
            throw publicationFailure(state, 'Publication marker is not a regular file.');
        }
        return true;
    }
}

export function pendingPublicationPath(parent: string, version: string): string {
    return join(parent, `.${version}.publication-pending`);
}

export function finalizingPublicationPath(parent: string, version: string): string {
    return join(parent, `.${version}.publication-finalizing`);
}

function retry(action: () => void): void {
    let failure: unknown;
    for (let attempt = 0; attempt < SETTLE_ATTEMPTS; attempt += 1) {
        try {
            action();
            return;
        } catch (error) {
            failure = error;
        }
    }
    throw failure;
}

function syncFile(fileSystem: ImmutableVersionFileSystem, path: string): void {
    const descriptor = fileSystem.open(path, 'r');
    try { fileSystem.fsync(descriptor); } finally { fileSystem.close(descriptor); }
}

function publicationFailure(state: PendingVersionPublicationState, message: string): RuntimeCatalogError {
    return new RuntimeCatalogError('STAGING_IO_ERROR', state.destination, message);
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error';
}
