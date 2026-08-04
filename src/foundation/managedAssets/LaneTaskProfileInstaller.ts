/**
 * Write-time counterpart of `foundation/taskRuntime/taskRuntimePin.ts`
 * (`docs/spec/v1.md` §7.5; RT-06). Resolves the immutable RT-04 runtime root
 * for a requested runtime version, proves the requested catalog/profile only
 * narrows the packaged catalog, and returns the exact `install.json.taskRuntime`
 * pin a lane-lifecycle installer may then persist. This module never writes
 * `install.json` itself — that document remains its own pack's owner — and it
 * never reads or trusts a participating repository's `nvb.json`.
 */
import {join} from 'node:path';
import type {RuntimeCatalog} from '../RuntimeCatalog.js';
import type {PinnedTaskRuntimeTarget} from '../../contracts/taskRuntime.js';
import type {InstallManifestV1} from '../../contracts/manifests.js';
import {readTaskRuntimePin} from '../taskRuntime/taskRuntimePin.js';
import {nodeRuntimeFileSystem, type RuntimeFileSystem} from '../taskRuntime/runtimeFileSystem.js';
import {readNarrowedProfileCatalog} from './laneTaskProfileCatalogReader.js';
import {rebindTaskRuntime} from './installManifestTaskRuntimeWriter.js';

export interface LaneTaskProfileInstallRequest {
    readonly runtimeVersion: string;
    readonly profile: string;
    readonly cliVersion: string;
    /** Runtime-root-relative path to the pinned NVB config, e.g. `runtime-nvb/runtime-nvb.json`. */
    readonly configTargetRelative: string;
    /** Runtime-root-relative path to the pinned NVB module, e.g. `runtime-nvb/runtime-nvb.js`. */
    readonly moduleTargetRelative: string;
}

export class LaneTaskProfileInstaller {
    private readonly files: RuntimeFileSystem;

    constructor(private readonly runtimeCatalog: RuntimeCatalog, files: RuntimeFileSystem = nodeRuntimeFileSystem) {
        this.files = files;
    }

    install(request: LaneTaskProfileInstallRequest): PinnedTaskRuntimeTarget {
        const runtimeRoot = this.runtimeCatalog.getRuntimeRoot(request.runtimeVersion);
        const configTarget = join(runtimeRoot, request.configTargetRelative);
        const moduleTarget = join(runtimeRoot, request.moduleTargetRelative);
        const identity = readNarrowedProfileCatalog(runtimeRoot, configTarget, this.files, request.profile, request.cliVersion);
        const candidate: unknown = {
            catalogId: identity.catalogId,
            catalogSha256: identity.catalogSha256,
            profile: request.profile,
            configTarget,
            moduleTarget
        };
        return readTaskRuntimePin(candidate, runtimeRoot, this.files);
    }

    /**
     * `install()` plus durable persistence: compute the verified pin and
     * atomically rebind it into `laneDir`'s already-materialized
     * `install.json`, refusing if its `runtimeVersion` disagrees with
     * `request.runtimeVersion` (Correction 02, finding 1). See
     * `installManifestTaskRuntimeWriter.ts` and
     * `docs/spec/implementation/wt-runtime-distribution/RT-06-specification-resolution-amendment.md`
     * §1 for the exact, operator-authorized ownership boundary this keeps.
     */
    installAndRebind(laneDir: string, request: LaneTaskProfileInstallRequest): InstallManifestV1 {
        return rebindTaskRuntime(laneDir, request.runtimeVersion, this.install(request));
    }
}
