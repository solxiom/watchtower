/**
 * Private path and config resolution for the derived-store adapter and rebuild
 * owner. Store names are validated identifiers (no path separators), and the
 * Watchtower `SqliteConfig` is projected onto the commons `SQLiteConfig` input.
 * Nothing here is exported from the capsule barrel; only the composition root
 * chooses the authorized root that these helpers resolve against.
 */
import {join} from 'node:path';
import type {SQLiteConfig} from '@nirvana/commons/contracts/db';
import {createWatchtowerError} from '../../contracts/index.js';
import type {SqliteConfig} from './SqliteConfig.js';
import type {DerivedStoreLocation} from './sqlitePorts.js';

const STORE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Resolve the on-disk file for a validated store location. */
export function resolveStoreFile(location: DerivedStoreLocation): string {
    if (!STORE_NAME.test(location.name)) {
        throw createWatchtowerError('ERR_INVALID_ARGUMENT', {
            operation: 'resolve derived store path',
            target: location.name,
            remediation: 'Use a store name of letters, digits, and underscores with no path separators.'
        });
    }
    return join(location.root, `${location.name}.sqlite`);
}

/** Project the Watchtower config onto the commons SQLite config input. */
export function toCommonsConfig(file: string, config: SqliteConfig): SQLiteConfig {
    return {
        type: 'sqlite',
        mode: 'file',
        file,
        journalMode: config.journalMode,
        busyTimeoutMs: config.busyTimeoutMs,
        readonly: config.readOnly
    };
}
