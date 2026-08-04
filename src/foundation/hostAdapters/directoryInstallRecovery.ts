import {lstatSync, readFileSync} from 'node:fs';
import {basename, dirname, join} from 'node:path';
import {createWatchtowerError} from '../../contracts/errors.js';
import {authorizePath, canonicalizePath, createPathEscapeError} from '../paths/index.js';
import {directoryInstallPort} from './directoryInstallPort.js';
import {VERSION_RECORD_FILE, writeDurableFile} from './hostAdapterInstaller.js';

export type FilesystemEntryKind = 'absent' | 'directory' | 'file' | 'symlink' | 'other';

/**
 * The one `lstat`-based classification boundary for every untrusted path this transaction touches
 * (`destination`, `staging`, `previous`, the marker). Never follows a symlink — a symlink is always
 * `'symlink'`, even to a real target. Only genuine `ENOENT` is `'absent'`; every other `lstat` failure
 * (permission, I/O, `ENOTDIR`) is rethrown so the caller fails closed rather than treating it as absence.
 */
export function classifyEntry(path: string): FilesystemEntryKind {
    let stat;
    try {
        stat = lstatSync(path);
    } catch (error) {
        if (isEnoent(error)) return 'absent';
        throw error;
    }
    if (stat.isSymbolicLink()) return 'symlink';
    if (stat.isDirectory()) return 'directory';
    if (stat.isFile()) return 'file';
    return 'other';
}

/**
 * Classifies `destination`'s own identity — untrusted until proven. Returns whether it currently exists as
 * a real directory, so callers reuse one result instead of a symlink-following `existsSync`. A symlink could
 * redirect a later copy/overlay/rename outside the host base; a regular/other entry is an unmanageable
 * topology conflict. Must run before ANY recovery branch: a wrong-typed destination that reached
 * `classifyTransactionState` could match a legal shape and delete a real `staging`/`previous` (correction-08).
 */
export function classifyManagedDestination(destination: string): boolean {
    const kind = classifyEntry(destination);
    if (kind === 'absent') return false;
    if (kind === 'directory') return true;
    if (kind === 'symlink') {
        throw createPathEscapeError(
            'install knowledge pack', basename(destination),
            'Remove the symlink before installing, or point --replace at a plain directory.'
        );
    }
    throw createWatchtowerError('ERR_MANAGED_CONFLICT', {
        operation: 'install knowledge pack', target: basename(destination),
        remediation: 'Remove or rename the conflicting existing file, then retry.'
    });
}

export interface TransactionRecord {
    readonly staging: string;
    readonly previous: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const STAGING_SUFFIX_PATTERN = /^[A-Za-z0-9]{6}$/;

/**
 * Resolves any transaction an interrupted replace left behind, before anything else may observe
 * `destination`. Must be the first thing `preview()`, `install()`, and `getInstalledVersion()` do.
 * A no-op only when the marker path itself is absent (`readTransactionMarkerText` confirms via `lstatSync`).
 * A recovered marker's text is still untrusted: `validateTransactionRecord` checks schema, exact sibling
 * naming, and canonical containment; `classifyTransactionState` then requires the `(destination, staging,
 * previous)` triple to match one of the exact states `commitStagedDirectory` can legally leave — anything
 * else fails closed with the marker preserved byte-for-byte.
 */
/**
 * Read-only guard for preview, dry-run, and version reads. Detects any transaction state that still
 * requires an authorized mutation path and fails closed without renaming, removing, or consuming bytes.
 */
export function assertNoPendingRecoveryMutation(destination: string): void {
    const raw = readTransactionMarkerText(destination);
    if (raw === null) return;
    const {staging, previous} = validateTransactionRecord(destination, raw);
    assertDestinationIdentityForRecovery(destination);
    const state = classifyTransactionState(destination, staging, previous, true);
    if (state === 'committed-pending-marker-cleanup') return;
    if (state === 'stale') throw staleTransactionMarkerError(destination);
    throw interruptedInstallPendingError(destination);
}

export function recoverInterruptedInstall(destination: string): void {
    const port = directoryInstallPort();
    // Validate `destination`'s own identity BEFORE reading the marker, as the single owner that guarantees it
    // for every caller (including any future one that forgets the up-front assert): a wrong-typed destination
    // can never reach a branch that renames/removes `staging`/`previous` or consumes the marker.
    classifyManagedDestination(destination);
    const raw = readTransactionMarkerText(destination);
    if (raw === null) return;
    const {staging, previous} = validateTransactionRecord(destination, raw);
    const state = classifyTransactionState(destination, staging, previous, true);
    switch (state) {
        case 'abandoned-before-first-rename':
            // `destination` untouched; `staging` held a never-committed attempt. Discard it.
            port.rmSync(staging, {recursive: true, force: true});
            port.syncDirectory(dirname(staging));
            break;
        case 'interrupted-between-renames':
            // `destination` already moved to `previous`; `staging` holds the ready new state. Complete forward.
            port.renameSync(staging, destination);
            port.syncDirectory(dirname(destination));
            port.rmSync(previous, {recursive: true, force: true});
            port.syncDirectory(dirname(previous));
            break;
        case 'landed-pending-previous-cleanup':
            // `destination` already holds the new content; only removing old `previous` was left undone.
            port.rmSync(previous, {recursive: true, force: true});
            port.syncDirectory(dirname(previous));
            break;
        case 'committed-pending-marker-cleanup':
            break;
        case 'stale':
            throw staleTransactionMarkerError(destination);
    }
    removeTransactionMarker(destination);
}

export function transactionMarkerPath(destination: string): string {
    return `${destination}.install-transaction.json`;
}

export function writeTransactionMarker(destination: string, record: TransactionRecord): void {
    writeDurableFile(transactionMarkerPath(destination), `${JSON.stringify(record)}\n`, 0o644);
}

export function removeTransactionMarker(destination: string): void {
    const markerPath = transactionMarkerPath(destination);
    const port = directoryInstallPort();
    port.rmSync(markerPath, {force: true});
    port.syncDirectory(dirname(markerPath));
}

type TransactionState =
    | 'abandoned-before-first-rename' | 'interrupted-between-renames' | 'landed-pending-previous-cleanup'
    | 'committed-pending-marker-cleanup' | 'stale';

/**
 * `commitStagedDirectory` can leave a marker on disk in exactly three `(destination, staging, previous)`
 * shapes: `(dir, dir, absent)`, `(absent, dir, dir)`, or `(dir, absent, dir)`. It never leaves a non-directory
 * at `staging`/`previous` (those come from `mkdtempSync`/`renameSync` of a directory), so any present entry
 * there that is not a real directory — checked via `classifyEntry`, never following a symlink — is conclusive
 * evidence of tampering: `stale`, before evaluating shapes, even if the other entry is legitimate. A
 * non-absent, non-directory `destination` is likewise `stale` (defense behind `recoverInterruptedInstall`'s
 * own up-front assert). Every other combination — including `(dir, absent, absent)`, indistinguishable from
 * tampering by existence alone — is `stale`, per correction 05.
 */
function classifyTransactionState(
    destination: string, staging: string, previous: string, markerPresent: boolean
): TransactionState {
    let destinationKind: FilesystemEntryKind, stagingKind: FilesystemEntryKind, previousKind: FilesystemEntryKind;
    try {
        destinationKind = classifyEntry(destination);
        stagingKind = classifyEntry(staging);
        previousKind = classifyEntry(previous);
    } catch {
        throw transactionMarkerError(destination, 'a managed transaction path could not be inspected');
    }
    if (stagingKind !== 'absent' && stagingKind !== 'directory') return 'stale';
    if (previousKind !== 'absent' && previousKind !== 'directory') return 'stale';
    if (destinationKind !== 'absent' && destinationKind !== 'directory') return 'stale';
    const destinationExists = destinationKind === 'directory';
    const stagingIsDirectory = stagingKind === 'directory';
    const previousIsDirectory = previousKind === 'directory';
    if (destinationExists && stagingIsDirectory && !previousIsDirectory) return 'abandoned-before-first-rename';
    if (!destinationExists && stagingIsDirectory && previousIsDirectory) return 'interrupted-between-renames';
    if (destinationExists && !stagingIsDirectory && previousIsDirectory) return 'landed-pending-previous-cleanup';
    if (destinationExists && !stagingIsDirectory && !previousIsDirectory && markerPresent) {
        return hasVersionRecordFile(destination) ? 'committed-pending-marker-cleanup' : 'stale';
    }
    return 'stale';
}

function hasVersionRecordFile(destination: string): boolean {
    return classifyEntry(join(destination, VERSION_RECORD_FILE)) === 'file';
}

function assertDestinationIdentityForRecovery(destination: string): void {
    const kind = classifyEntry(destination);
    if (kind === 'absent' || kind === 'directory') return;
    if (kind === 'symlink') {
        throw createPathEscapeError(
            'install knowledge pack', basename(destination),
            'Remove the symlink before installing, or point --replace at a plain directory.'
        );
    }
    throw createWatchtowerError('ERR_MANAGED_CONFLICT', {
        operation: 'install knowledge pack', target: basename(destination),
        remediation: 'Remove or rename the conflicting existing file, then retry.'
    });
}

function interruptedInstallPendingError(destination: string) {
    return createWatchtowerError('ERR_INTEGRITY_FAILURE', {
        operation: 'read knowledge pack installation',
        target: basename(destination),
        remediation: 'An interrupted install must be completed with `wt skill install --replace` before preview or version reads can proceed.'
    });
}

function staleTransactionMarkerError(destination: string) {
    return createWatchtowerError('ERR_INTEGRITY_FAILURE', {
        operation: 'recover interrupted knowledge pack install',
        target: `${basename(destination)}.install-transaction.json (staging/previous state matches no legal interrupted transaction)`,
        remediation: 'Inspect the destination and the transaction marker by hand, remove the marker once resolved, then retry.'
    });
}

/**
 * Returns the marker's raw text, or `null` only when the marker path is genuinely absent (`ENOENT`) — the
 * one legitimate no-op. The marker path is untrusted at the identity level too: `lstatSync` (via
 * `classifyEntry`, never following a symlink) must confirm a plain regular file before any read. A directory,
 * symlink, other entry, or any `lstat`/`readFileSync` failure fails closed rather than being read as absence.
 */
function readTransactionMarkerText(destination: string): string | null {
    const markerPath = transactionMarkerPath(destination);
    let kind: FilesystemEntryKind;
    try {
        kind = classifyEntry(markerPath);
    } catch {
        throw transactionMarkerError(destination, 'transaction marker path could not be inspected');
    }
    if (kind === 'absent') return null;
    if (kind !== 'file') {
        throw transactionMarkerError(destination, 'transaction marker path is not a plain regular file');
    }
    try {
        return readFileSync(markerPath, 'utf8');
    } catch {
        throw transactionMarkerError(destination, 'transaction marker could not be read');
    }
}

function isEnoent(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

/**
 * Validates a marker's raw text as untrusted input: valid JSON, an object with exactly `staging` and
 * `previous` string keys named as this module generates (`<base>.staging-XXXXXX`, `<base>.previous-<uuid>`),
 * each canonically contained beneath `dirname(destination)`. Fails closed on any violation.
 */
function validateTransactionRecord(destination: string, raw: string): TransactionRecord {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw transactionMarkerError(destination, 'transaction marker is not valid JSON');
    }
    if (!isPlainObjectWithExactKeys(parsed, ['previous', 'staging'])) {
        throw transactionMarkerError(destination, 'transaction marker schema is invalid');
    }
    const {staging, previous} = parsed as {staging: unknown; previous: unknown};
    if (typeof staging !== 'string' || typeof previous !== 'string') {
        throw transactionMarkerError(destination, 'transaction marker paths must be strings');
    }
    const base = basename(destination);
    const authorizedStaging = authorizeSiblingPath(destination, staging, `${base}.staging-`, STAGING_SUFFIX_PATTERN);
    const authorizedPrevious = authorizeSiblingPath(destination, previous, `${base}.previous-`, UUID_PATTERN);
    return {staging: authorizedStaging, previous: authorizedPrevious};
}

/** Requires `candidate` to be canonically contained beneath `dirname(destination)` and named exactly `<prefix><suffixPattern>`. */
function authorizeSiblingPath(destination: string, candidate: string, prefix: string, suffixPattern: RegExp): string {
    let authorized: string;
    try {
        authorized = authorizePath(canonicalizePath(dirname(destination)), candidate);
    } catch {
        throw transactionMarkerError(destination, `transaction marker path escapes the authorized host base: ${prefix}...`);
    }
    const name = basename(authorized);
    if (!name.startsWith(prefix) || !suffixPattern.test(name.slice(prefix.length))) {
        throw transactionMarkerError(destination, `transaction marker path is not named like ${prefix}...`);
    }
    return authorized;
}

function isPlainObjectWithExactKeys(value: unknown, expectedKeys: readonly string[]): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const keys = Object.keys(value).sort();
    return keys.length === expectedKeys.length && keys.every((key, index) => key === expectedKeys[index]);
}

function transactionMarkerError(destination: string, reason: string) {
    return createWatchtowerError('ERR_INTEGRITY_FAILURE', {
        operation: 'recover interrupted knowledge pack install', target: `${basename(destination)}.install-transaction.json (${reason})`,
        remediation: 'Remove the corrupted transaction marker file and its stray staging/previous siblings by hand, then retry.'
    });
}
