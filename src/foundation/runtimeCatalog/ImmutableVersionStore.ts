import {randomUUID} from 'node:crypto';
import {dirname, join} from 'node:path';
import type {LockRecord} from '../storage/writeLockRecord.js';
import {currentProcessIdentity} from '../observation/index.js';
import {RuntimeCatalogError} from '../../contracts/runtimeCatalog.js';
import {WatchtowerError} from '../../contracts/errors.js';
import {authorizeWatchtowerDataHomeForCreation} from '../paths/index.js';
import {nodeImmutableVersionFileSystem, type ImmutableVersionFileSystem} from './ImmutableVersionFileSystem.js';
import {InstalledVersionCatalog} from './InstalledVersionCatalog.js';
import {
    copyVersionTree,
    removeCreatedVersionDirectories,
    removeWritableVersionTree,
    sealVersionTree,
    writeVersionManifest
} from './ImmutableVersionTree.js';
import {
    finalizingPublicationPath,
    pendingPublicationPath,
    PendingVersionPublication,
    type PendingVersionPublicationState
} from './PendingVersionPublication.js';
import {RuntimeCatalogLock, type RuntimeCatalogLockLease} from './RuntimeCatalogLock.js';

export interface ImmutableVersionStoreOptions {
    readonly fileSystem?: ImmutableVersionFileSystem;
    readonly lockRecord?: () => LockRecord;
    readonly temporaryId?: () => string;
    readonly temporaryReady?: (path: string) => void;
    readonly publicationMarkerRemoved?: (path: string) => void;
}

/** Publishes a validated version through the sole immutable catalog filesystem boundary. */
export class ImmutableVersionStore {
    private readonly fileSystem: ImmutableVersionFileSystem;
    private readonly lockRecord: () => LockRecord;
    private readonly temporaryId: () => string;
    private readonly temporaryReady: (path: string) => void;
    private readonly catalogLock: RuntimeCatalogLock;
    private readonly installedVersions: InstalledVersionCatalog;
    private readonly publication: PendingVersionPublication;
    private residualLock: RuntimeCatalogLockLease | undefined;

    constructor(options: ImmutableVersionStoreOptions = {}) {
        this.fileSystem = options.fileSystem ?? nodeImmutableVersionFileSystem;
        this.lockRecord = options.lockRecord ?? defaultLockRecord;
        this.temporaryId = options.temporaryId ?? randomUUID;
        this.temporaryReady = options.temporaryReady ?? (() => undefined);
        this.catalogLock = new RuntimeCatalogLock(this.fileSystem, this.lockRecord);
        this.installedVersions = new InstalledVersionCatalog(this.fileSystem);
        this.publication = new PendingVersionPublication(this.fileSystem, {
            markerRemoved: options.publicationMarkerRemoved
        });
    }

    stage(parent: string, version: string, source: string, manifest: unknown, validate: (root: string) => void): void {
        const dataRoot = dirname(parent);
        const state = this.publication.state(parent, version);
        const attempt: StageAttempt = {created: '', pending: false, published: false, recovered: false, temporary: ''};
        let failure: unknown;
        try {
            authorizeCatalogDataRoot(dataRoot);
            attempt.created = this.fileSystem.mkdir(parent, {recursive: true, mode: 0o755}) ?? '';
            this.releaseResidualLock(version);
            attempt.lock = this.catalogLock.acquire(dataRoot);
            this.removeStaleTemporaryRoots(parent, version);
            this.recoverPending(state, validate, attempt);
            if (!attempt.recovered) this.publish(state, version, source, manifest, validate, attempt);
        } catch (error) {
            failure = this.resolveRenameAftermath(state, validate, attempt, error);
        }
        if (!attempt.published) this.cleanupUnpublished(state, attempt);
        if (!failure && attempt.pending) {
            try {
                this.publication.settleFinalization(state);
                this.publication.completeFinalization(state);
                attempt.pending = false;
            } catch (error) { failure = error; }
        }
        const releaseFailure = this.releaseLock(attempt.lock, version);
        if (!attempt.published && !this.fileSystem.exists(state.destination)) {
            removeCreatedVersionDirectories(this.fileSystem, attempt.created, parent);
        }
        if (failure) throw normalizeCatalogError(failure, version);
        if (releaseFailure) throw releaseFailure;
    }

    installedRoot(parent: string, version: string, validate: (root: string) => void): string {
        return this.installedVersions.root(parent, version, validate);
    }

    list(parent: string, validVersion: (value: string) => boolean, validate: (root: string) => void): string[] {
        return this.installedVersions.list(parent, validVersion, validate);
    }

    private removeStaleTemporaryRoots(parent: string, version: string): void {
        for (const entry of this.fileSystem.readdir(parent)) {
            if (entry.isDirectory() && entry.name.startsWith(`.${version}.staging-`)) {
                removeWritableVersionTree(this.fileSystem, join(parent, entry.name));
            }
        }
    }

    private recoverPending(state: PendingVersionPublicationState, validate: (root: string) => void, attempt: StageAttempt): void {
        if (!this.publication.exists(state)) return;
        attempt.pending = true;
        if (!this.fileSystem.exists(state.destination)) {
            this.publication.settleFinalization(state);
            this.publication.completeFinalization(state);
            attempt.pending = false;
            return;
        }
        this.publication.settle(state, validate);
        attempt.published = true;
        attempt.recovered = true;
    }

    private publish(state: PendingVersionPublicationState, version: string, source: string, manifest: unknown,
        validate: (root: string) => void, attempt: StageAttempt): void {
        rejectPublicationConflict(this.fileSystem, state.parent, version, state.destination);
        attempt.temporary = join(state.parent, `.${version}.staging-${this.temporaryId()}`);
        this.fileSystem.mkdir(attempt.temporary, {mode: 0o700});
        this.temporaryReady(attempt.temporary);
        copyVersionTree(this.fileSystem, source, attempt.temporary);
        writeVersionManifest(this.fileSystem, attempt.temporary, manifest);
        validate(attempt.temporary);
        sealVersionTree(this.fileSystem, attempt.temporary);
        rejectPublicationConflict(this.fileSystem, state.parent, version, state.destination);
        attempt.pending = true;
        this.publication.begin(state);
        this.fileSystem.rename(attempt.temporary, state.destination);
        attempt.temporary = '';
        attempt.published = true;
        this.publication.settle(state, validate);
    }

    private resolveRenameAftermath(state: PendingVersionPublicationState, validate: (root: string) => void,
        attempt: StageAttempt, error: unknown): unknown {
        if (!attempt.pending || !this.fileSystem.exists(state.destination)) return error;
        attempt.published = true;
        attempt.temporary = '';
        try {
            this.publication.settle(state, validate);
            return undefined;
        } catch (settleError) {
            return settleError;
        }
    }

    private cleanupUnpublished(state: PendingVersionPublicationState, attempt: StageAttempt): void {
        removeWritableVersionTree(this.fileSystem, attempt.temporary);
        if (attempt.pending && !this.fileSystem.exists(state.destination)) {
            try {
                this.publication.settleFinalization(state);
                this.publication.completeFinalization(state);
                attempt.pending = false;
            } catch { /* retain recovery evidence */ }
        }
    }

    private releaseResidualLock(version: string): void {
        if (!this.residualLock) return;
        const result = this.catalogLock.release(this.residualLock);
        if (result.state === 'released') { this.residualLock = undefined; return; }
        throw releaseError(version, result.state, result.error);
    }

    private releaseLock(lock: RuntimeCatalogLockLease | undefined, version: string): RuntimeCatalogError | undefined {
        const result = this.catalogLock.release(lock);
        if (result.state === 'released') return undefined;
        if (result.state === 'owned') this.residualLock = lock;
        return releaseError(version, result.state, result.error);
    }
}

interface StageAttempt {
    created: string;
    lock?: RuntimeCatalogLockLease;
    pending: boolean;
    published: boolean;
    recovered: boolean;
    temporary: string;
}

function defaultLockRecord(): LockRecord {
    return {...currentProcessIdentity(), acquiredAt: new Date().toISOString(), token: randomUUID()};
}

function rejectPublicationConflict(
    fileSystem: ImmutableVersionFileSystem, parent: string, version: string, destination: string
): void {
    if (fileSystem.exists(pendingPublicationPath(parent, version))
        || fileSystem.exists(finalizingPublicationPath(parent, version))) {
        throw new RuntimeCatalogError('STAGING_IO_ERROR', version, 'Runtime version publication is pending recovery.');
    }
    if (fileSystem.exists(destination)) {
        throw new RuntimeCatalogError('VERSION_ALREADY_INSTALLED', version, `Version ${version} is already installed.`);
    }
}

function authorizeCatalogDataRoot(dataRoot: string): void {
    try {
        authorizeWatchtowerDataHomeForCreation(dataRoot);
    } catch (error) {
        if (error instanceof WatchtowerError && error.code === 'ERR_PATH_ESCAPE') {
            throw new RuntimeCatalogError('STAGING_VALIDATION_FAILED', dataRoot, error.message);
        }
        throw error;
    }
}

function releaseError(version: string, state: string, error: unknown): RuntimeCatalogError {
    const detail = error instanceof Error ? `: ${error.message}` : '';
    return new RuntimeCatalogError('STAGING_IO_ERROR', version, `Runtime catalog lock release is ${state}${detail}`);
}

function normalizeCatalogError(error: unknown, subject: string): RuntimeCatalogError {
    if (error instanceof RuntimeCatalogError) return error;
    const detail = error instanceof Error ? error.message : 'unknown error';
    return new RuntimeCatalogError('STAGING_IO_ERROR', subject, `Unable to access runtime catalog ${subject}: ${detail}`);
}
