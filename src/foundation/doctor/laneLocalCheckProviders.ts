import {createWatchtowerError} from '../../contracts/index.js';
import type {DoctorCheckId} from '../../contracts/index.js';
import type {DoctorCheckProvider} from './DoctorCheckProvider.js';
import {gitIgnoreCheck} from './checks/gitIgnoreCheck.js';
import {laneConfigCheck} from './checks/laneConfigCheck.js';
import {laneMarkerCheck} from './checks/laneMarkerCheck.js';
import {repositoryBindingsCheck} from './checks/repositoryBindingsCheck.js';
import {repositoryPermissionsCheck} from './checks/repositoryPermissionsCheck.js';

/** Immutable composition of every lane-local check LC-07 owns. */
export const laneLocalCheckProviders: readonly DoctorCheckProvider[] = Object.freeze([
    laneMarkerCheck,
    laneConfigCheck,
    repositoryBindingsCheck,
    repositoryPermissionsCheck,
    gitIgnoreCheck
]);

const CLOSED_PROVIDER_IDS: readonly DoctorCheckId[] = Object.freeze([
    'lane-marker', 'lane-config', 'repository-bindings', 'repository-permissions', 'git-ignore-coverage',
    'required-tools', 'runtime-catalog', 'managed-links', 'account-access', 'watcher-heartbeat', 'pack-index',
    'coordinator-queue', 'coordinator-cursor', 'session-index', 'session-turns', 'tui-terminal'
]);
const CLOSED_PROVIDER_ID_SET: ReadonlySet<DoctorCheckId> = new Set(CLOSED_PROVIDER_IDS);

/** Snapshots and validates one closed provider composition at the kernel boundary. */
export function composeDoctorCheckProviders(input: readonly DoctorCheckProvider[]): readonly DoctorCheckProvider[] {
    const snapshot = [...input];
    const seen = new Set<DoctorCheckId>();
    for (const candidate of snapshot) {
        if (!isProvider(candidate) || !CLOSED_PROVIDER_ID_SET.has(candidate.id)) invalidProviderComposition();
        if (seen.has(candidate.id)) invalidProviderComposition();
        seen.add(candidate.id);
    }
    return Object.freeze(snapshot);
}

function isProvider(value: unknown): value is DoctorCheckProvider {
    return typeof value === 'object' && value !== null
        && 'id' in value && typeof value.id === 'string'
        && 'run' in value && typeof value.run === 'function';
}

function invalidProviderComposition(): never {
    throw createWatchtowerError('ERR_INVALID_ARGUMENT', {
        operation: 'construct doctor kernel', target: 'doctor provider composition',
        remediation: 'Use each supported doctor provider ID at most once.'
    });
}
