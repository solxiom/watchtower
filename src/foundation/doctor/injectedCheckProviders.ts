import type {DoctorCheckProvider} from './DoctorCheckProvider.js';
import {laneLocalCheckProviders} from './laneLocalCheckProviders.js';
import {accountAccessCheck} from './checks/accountAccessCheck.js';
import {coordinatorCursorCheck} from './checks/coordinatorCursorCheck.js';
import {coordinatorQueueCheck} from './checks/coordinatorQueueCheck.js';
import {managedLinksCheck} from './checks/managedLinksCheck.js';
import {packIndexCheck} from './checks/packIndexCheck.js';
import {requiredToolsCheck} from './checks/requiredToolsCheck.js';
import {runtimeCatalogCheck} from './checks/runtimeCatalogCheck.js';
import {sessionIndexCheck} from './checks/sessionIndexCheck.js';
import {sessionTurnCheck} from './checks/sessionTurnCheck.js';
import {tuiTerminalCheck} from './checks/tuiTerminalCheck.js';
import {watcherHeartbeatCheck} from './checks/watcherHeartbeatCheck.js';

/**
 * Immutable composition of every lane-local check LC-07 owns, the injected
 * required-tools, runtime, managed-link, account, watcher, and pack-index
 * providers LC-10 owns, and the coordinator queue/cursor and session index/turn
 * providers CA-31 owns. This is the exact list `DoctorCommand` passes into the
 * unmodified LC-07 `DoctorKernel` — there is no global provider registry;
 * every entry is an explicit, statically composed array.
 */
export const injectedDiagnosticCheckProviders: readonly DoctorCheckProvider[] = Object.freeze([
    ...laneLocalCheckProviders,
    requiredToolsCheck,
    runtimeCatalogCheck,
    managedLinksCheck,
    accountAccessCheck,
    watcherHeartbeatCheck,
    packIndexCheck,
    coordinatorQueueCheck,
    coordinatorCursorCheck,
    sessionIndexCheck,
    sessionTurnCheck
]);

/**
 * The `--tui` composition: everything above plus the terminal-target provider
 * CA-31 owns. `docs/spec/v1.md` §11.7 exposes the TUI target-tuple validation
 * only under `--tui`, so it is a second frozen array rather than a runtime
 * mutation of the default one — a caller selects a composition, it never
 * registers into one.
 */
export const tuiDiagnosticCheckProviders: readonly DoctorCheckProvider[] = Object.freeze([
    ...injectedDiagnosticCheckProviders,
    tuiTerminalCheck
]);
