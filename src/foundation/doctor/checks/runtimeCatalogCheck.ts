import {RuntimeCatalogError} from '../../../contracts/runtimeCatalog.js';
import {LaneInstallIdentityReader, type LaneInstallIdentity} from '../../read/index.js';
import {RuntimeCatalog} from '../../runtime/index.js';
import type {DoctorCheckProvider, DoctorLaneContext} from '../DoctorCheckProvider.js';
import {fail, pass, watchtowerErrorReason} from '../DoctorCheckResult.js';

const ID = 'runtime-catalog' as const;

export interface RuntimeCatalogCheckOptions {
    readonly identity?: LaneInstallIdentityReader;
    readonly runtimeCatalog?: RuntimeCatalog;
}

/**
 * Verifies the exact immutable runtime version this lane is pinned to
 * (`install.json`, LC-01) is installed and structurally valid, reusing the
 * already-accepted `LaneInstallIdentityReader` and `RuntimeCatalog` owners
 * verbatim (RT-04) rather than re-deriving install-identity parsing or
 * runtime-root validation here. Never stages, repairs, or rebuilds a runtime.
 */
export function createRuntimeCatalogCheck(options: RuntimeCatalogCheckOptions = {}): DoctorCheckProvider {
    const identity = options.identity ?? new LaneInstallIdentityReader();
    const runtimeCatalog = options.runtimeCatalog ?? new RuntimeCatalog();
    return {
        id: ID,
        run(context: DoctorLaneContext) {
            let install: LaneInstallIdentity;
            try {
                install = identity.read(context.lane.laneDir);
            } catch (error) {
                return fail(ID, `The lane install identity (install.json) is missing or invalid: ${
                    watchtowerErrorReasonMessage(error)}.`, watchtowerErrorReason(error));
            }
            try {
                const runtimeRoot = runtimeCatalog.getRuntimeRoot(install.runtimeVersion);
                return pass(ID, `Runtime version ${install.runtimeVersion} is installed at ${runtimeRoot}.`);
            } catch (error) {
                return fail(ID, `Runtime version ${install.runtimeVersion} is missing or corrupt: ${
                    runtimeCatalogErrorMessage(error)}.`, mapRuntimeCatalogReason(error));
            }
        }
    };
}

export const runtimeCatalogCheck: DoctorCheckProvider = createRuntimeCatalogCheck();

function watchtowerErrorReasonMessage(error: unknown): string {
    return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
        ? error.message : 'the file could not be read';
}

function runtimeCatalogErrorMessage(error: unknown): string {
    return error instanceof RuntimeCatalogError ? error.message : 'an unexpected error occurred';
}

function mapRuntimeCatalogReason(error: unknown) {
    if (!(error instanceof RuntimeCatalogError)) return null;
    switch (error.reason) {
        case 'VERSION_NOT_INSTALLED': return 'ERR_MISSING_DEPENDENCY';
        case 'INVALID_VERSION_STRING': return 'ERR_INVALID_LANE_CONFIG';
        default: return 'ERR_INTEGRITY_FAILURE';
    }
}
