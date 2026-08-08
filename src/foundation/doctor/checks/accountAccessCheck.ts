import {safePathTarget} from '../../paths/index.js';
import {LaneInstallIdentityReader} from '../../read/index.js';
import {RuntimeCatalog} from '../../runtime/index.js';
import {nodeRuntimeFileSystem, type RuntimeFileSystem} from '../../task/index.js';
import type {DoctorCheckProvider, DoctorLaneContext} from '../DoctorCheckProvider.js';
import {fail, pass, skip} from '../DoctorCheckResult.js';

const ID = 'account-access' as const;

export interface AccountAccessCheckOptions {
    readonly identity?: LaneInstallIdentityReader;
    readonly runtimeCatalog?: RuntimeCatalog;
    readonly files?: RuntimeFileSystem;
}

/**
 * Verifies the effective account's access invariants from `docs/spec/v1.md`
 * §7.1: the control home must be readable/traversable by every configured
 * account, and the immutable installed runtime root must be readable/
 * traversable but never writable — so a worker account can execute the
 * pinned runtime but can never edit it. Reuses the same accepted
 * `LaneInstallIdentityReader`/`RuntimeCatalog` owners the `runtime-catalog`
 * check uses (never a second runtime-root-resolution algorithm) and the same
 * `RuntimeFileSystem` permission-probe port the RT-05 task runtime uses
 * (never a second `node:fs` permission probe). If the runtime itself is
 * missing or corrupt, this check `skip`s — that failure is exclusively
 * `runtime-catalog`'s to report.
 */
export function createAccountAccessCheck(options: AccountAccessCheckOptions = {}): DoctorCheckProvider {
    const identity = options.identity ?? new LaneInstallIdentityReader();
    const runtimeCatalog = options.runtimeCatalog ?? new RuntimeCatalog();
    const files = options.files ?? nodeRuntimeFileSystem;
    return {
        id: ID,
        run(context: DoctorLaneContext) {
            const controlHome = context.lane.controlHome;
            if (!files.isReadable(controlHome) || !files.isTraversable(controlHome)) {
                return fail(ID, `The effective account cannot read or traverse the control home ${
                    safePathTarget(controlHome)}.`);
            }
            const runtimeRoot = resolveRuntimeRoot(context, identity, runtimeCatalog);
            if (runtimeRoot === undefined) {
                return skip(ID, 'Runtime-root account access could not be verified because the pinned runtime ' +
                    'is missing or corrupt; see the runtime-catalog check.');
            }
            if (!files.isReadable(runtimeRoot) || !files.isTraversable(runtimeRoot)) {
                return fail(ID, `The effective account cannot read or traverse the installed runtime root ${
                    safePathTarget(runtimeRoot)}.`);
            }
            if (files.isWritable(runtimeRoot)) {
                return fail(ID, `The installed runtime root ${
                    safePathTarget(runtimeRoot)} is writable by the effective account and is therefore not immutable.`);
            }
            return pass(ID, 'The effective account has exactly its required control-home and runtime-root access.');
        }
    };
}

export const accountAccessCheck: DoctorCheckProvider = createAccountAccessCheck();

function resolveRuntimeRoot(context: DoctorLaneContext, identity: LaneInstallIdentityReader,
    runtimeCatalog: RuntimeCatalog): string | undefined {
    try {
        const install = identity.read(context.lane.laneDir);
        return runtimeCatalog.getRuntimeRoot(install.runtimeVersion);
    } catch {
        return undefined;
    }
}
