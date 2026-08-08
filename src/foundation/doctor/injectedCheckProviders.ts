import type {DoctorCheckProvider} from './DoctorCheckProvider.js';
import {laneLocalCheckProviders} from './laneLocalCheckProviders.js';
import {accountAccessCheck} from './checks/accountAccessCheck.js';
import {packIndexCheck} from './checks/packIndexCheck.js';
import {requiredToolsCheck} from './checks/requiredToolsCheck.js';
import {runtimeCatalogCheck} from './checks/runtimeCatalogCheck.js';
import {watcherHeartbeatCheck} from './checks/watcherHeartbeatCheck.js';

/**
 * Immutable composition of every lane-local check LC-07 owns plus the
 * injected required-tools, runtime, account, watcher, and pack-index
 * diagnostic providers LC-10 owns. This is the exact list `DoctorCommand`
 * passes into the unmodified LC-07 `DoctorKernel` — there is no global
 * provider registry; every entry is an explicit, statically composed array.
 */
export const injectedDiagnosticCheckProviders: readonly DoctorCheckProvider[] = Object.freeze([
    ...laneLocalCheckProviders,
    requiredToolsCheck,
    runtimeCatalogCheck,
    accountAccessCheck,
    watcherHeartbeatCheck,
    packIndexCheck
]);
