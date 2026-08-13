import {basename, dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import type {InstallManifestV1, ManagedAssetDeclaration, RuntimeManifestV1} from '../../../contracts/index.js';
import {canonicalizePath, isPathSafe} from '../../paths/index.js';
import {ContainedLaneReadFileStore, LaneInstallIdentityReader, type LaneReadFileStore} from '../../read/index.js';
import {
    RuntimeCatalog, nodeManagedLinkFileSystem, parseInstallManifest, readStagedRuntimeManifest,
    type ManagedLinkFileSystem
} from '../../runtime/index.js';
import {nodeRuntimeFileSystem, type RuntimeFileSystem} from '../../task/index.js';
import type {DoctorCheckProvider, DoctorLaneContext} from '../DoctorCheckProvider.js';
import {fail, pass, skip} from '../DoctorCheckResult.js';

const ID = 'managed-links' as const;
const MAX_INSTALL_BYTES = 256 * 1024;
const MAX_REPORTED_ASSETS = 5;

/** Closed, doctor-local drift vocabulary; `'valid'` is the only healthy member. */
type LinkStatus =
    | 'valid' | 'missing' | 'not-a-link' | 'outside-lane' | 'wrong-target' | 'outside-runtime'
    | 'target-missing' | 'unmanaged-target' | 'checksum-mismatch' | 'unreadable';

export interface ManagedLinksCheckOptions {
    readonly files?: LaneReadFileStore;
    readonly identity?: LaneInstallIdentityReader;
    readonly runtimeCatalog?: RuntimeCatalog;
    readonly linkFiles?: ManagedLinkFileSystem;
    readonly runtimeFiles?: RuntimeFileSystem;
}

/**
 * Verifies every managed `bin/` link a lane declares in `install.json`
 * (`docs/spec/v1.md` §7.5) still exists as a symlink, still points at its
 * install-declared target, and that the target is still a packaged
 * runtime-manifest asset inside the pinned immutable runtime root whose
 * install-declared, manifest-declared, and live digests all agree. Read-only:
 * it never creates, repairs, or removes a link, and takes no lock.
 *
 * Every dependency arrives through a capability or domain barrel — `paths/`,
 * `read/`, `runtime/`, `task/` — never a sub-capsule path, so no containment,
 * manifest, or link policy is duplicated here.
 *
 * It deliberately does **not** route through `ManagedAssets.validateLinks`:
 * that path authorizes a target only when the runtime manifest declares mode
 * `0755` (`managedLinkPlanner.ts` `ELIGIBLE_MODE`), while `wt init` itself
 * links `bin/runtime-nvb.json` and `bin/runtime-nvb.js` — packaged data/module
 * assets declared `0644`. Reusing that gate here would report every real lane
 * as broken; the divergence is routed to RT-06, not decided here. §7.5 makes
 * runtime-manifest representation, runtime-root containment, and checksum
 * agreement normative and makes no executable-mode demand, so those are
 * exactly the properties this check owns. Executable-mode integrity of the
 * packaged bytes belongs to `runtime-catalog`: `RuntimeCatalog.getRuntimeRoot`
 * re-validates every staged asset's live mode against its manifest mode on
 * each run, so mode drift surfaces there as a `fail` while this check `skip`s.
 *
 * Untrusted `install.json` bytes are fenced at this boundary by the accepted
 * duplicate-safe `LaneInstallIdentityReader` and the closed-shape
 * `parseInstallManifest`, never by relying on a sibling provider: the kernel
 * runs providers concurrently, so a neighbour's failure fences nothing here.
 */
export function createManagedLinksCheck(options: ManagedLinksCheckOptions = {}): DoctorCheckProvider {
    const files = options.files ?? new ContainedLaneReadFileStore();
    const identity = options.identity ?? new LaneInstallIdentityReader();
    const runtimeCatalog = options.runtimeCatalog ?? new RuntimeCatalog();
    const linkFiles = options.linkFiles ?? nodeManagedLinkFileSystem;
    const runtimeFiles = options.runtimeFiles ?? nodeRuntimeFileSystem;
    return {
        id: ID,
        run(context: DoctorLaneContext) {
            const laneDir = context.lane.laneDir;
            const install = readInstallManifest(files, identity, laneDir);
            if (install === undefined) {
                return fail(ID, 'The lane install manifest (install.json) is missing or is not a valid ' +
                    'schemaVersion 1 linked manifest, so its managed links cannot be verified.',
                'ERR_INVALID_LANE_CONFIG');
            }
            const assetPaths = Object.keys(install.managedAssets).sort();
            if (assetPaths.length === 0) {
                return skip(ID, 'This lane declares no managed runtime links in install.json.');
            }
            const runtime = resolveRuntime(runtimeCatalog, runtimeFiles, install);
            if (runtime === undefined) {
                return skip(ID, `Managed links could not be verified because runtime version ${
                    install.runtimeVersion} is missing or corrupt; see the runtime-catalog check.`);
            }
            const drifted = assetPaths
                .map(assetPath => ({assetPath, status: classify(laneDir, runtime, assetPath,
                    install.managedAssets[assetPath], linkFiles, runtimeFiles)}))
                .filter(entry => entry.status !== 'valid');
            if (drifted.length > 0) {
                return fail(ID, `${drifted.length} of ${assetPaths.length} managed runtime links no longer match ` +
                    `install.json: ${describe(drifted.map(entry => `${entry.assetPath} (${entry.status})`))}.`,
                'ERR_INTEGRITY_FAILURE');
            }
            return pass(ID, `All ${assetPaths.length} managed runtime links are present, contained in the pinned ` +
                'runtime root, and checksum-verified.');
        }
    };
}

export const managedLinksCheck: DoctorCheckProvider = createManagedLinksCheck();

interface ResolvedRuntime {
    readonly root: string;
    readonly manifest: RuntimeManifestV1;
}

function classify(
    laneDir: string, runtime: ResolvedRuntime, assetPath: string, declaration: ManagedAssetDeclaration,
    linkFiles: ManagedLinkFileSystem, runtimeFiles: RuntimeFileSystem
): LinkStatus {
    const declaredTarget = resolve(declaration.target);
    if (!isAbsolute(declaration.target) || !isPathSafe(declaredTarget, runtime.root)) return 'outside-runtime';
    const source = containedLaneSource(laneDir, assetPath);
    if (source === 'missing' || source === 'outside-lane') return source;
    let observation;
    try {
        observation = linkFiles.observeSource(source);
    } catch {
        return 'unreadable';
    }
    if (observation.kind === 'missing') return 'missing';
    if (observation.kind !== 'symlink') return 'not-a-link';
    if (observation.linkTarget === null || resolve(observation.linkTarget) !== declaredTarget) return 'wrong-target';
    return classifyTarget(runtime, declaredTarget, declaration, runtimeFiles);
}

/**
 * Resolve the lane-side link path with its **existing parents canonicalized**,
 * so a symlinked `bin/` — or any symlinked ancestor at any depth — cannot make
 * a link outside the lane look managed. The managed link itself is deliberately
 * left unresolved: it points into the runtime root by design, so only its
 * container is required to stay inside the lane. Canonicalization and
 * containment are both asked of the `paths` owner; no path policy is restated
 * here.
 */
function containedLaneSource(laneDir: string, assetPath: string): string | 'missing' | 'outside-lane' {
    const candidate = join(laneDir, assetPath);
    let canonicalParent: string;
    try {
        canonicalParent = canonicalizePath(dirname(candidate));
    } catch {
        return 'missing';
    }
    if (!isPathSafe(canonicalParent, laneDir)) return 'outside-lane';
    return join(canonicalParent, basename(candidate));
}

function classifyTarget(
    runtime: ResolvedRuntime, declaredTarget: string, declaration: ManagedAssetDeclaration, runtimeFiles: RuntimeFileSystem
): LinkStatus {
    const target = runtimeFiles.observe(declaredTarget);
    if (target.kind !== 'file') return 'target-missing';
    if (!isPathSafe(target.canonicalPath, runtime.root)) return 'outside-runtime';
    const manifestPath = relative(runtime.root, target.canonicalPath).split(sep).join('/');
    const asset = runtime.manifest.assets.find(entry => entry.path === manifestPath);
    if (asset === undefined) return 'unmanaged-target';
    const live = runtimeFiles.digest(target.canonicalPath);
    if (live === null) return 'unreadable';
    return asset.sha256 === live && declaration.sha256 === live ? 'valid' : 'checksum-mismatch';
}

function resolveRuntime(
    runtimeCatalog: RuntimeCatalog, runtimeFiles: RuntimeFileSystem, install: InstallManifestV1
): ResolvedRuntime | undefined {
    try {
        const root = runtimeCatalog.getRuntimeRoot(install.runtimeVersion);
        return {root, manifest: readStagedRuntimeManifest(root, runtimeFiles)};
    } catch {
        return undefined;
    }
}

/**
 * `install.json` bytes are untrusted at this boundary and are fenced here, not
 * elsewhere: `LaneInstallIdentityReader` is the accepted duplicate-safe public
 * reader (it refuses any duplicated member, top-level or nested, before
 * parsing), and `parseInstallManifest` is the accepted closed-shape reader.
 * Both must accept the file before a single asset is classified. A sibling
 * provider's failure is not a fence — `DoctorKernel` runs providers
 * concurrently — so this check fails closed on its own evidence.
 */
function readInstallManifest(
    files: LaneReadFileStore, identity: LaneInstallIdentityReader, laneDir: string
): InstallManifestV1 | undefined {
    let text: string;
    try {
        identity.read(laneDir);
        text = files.readRequired(laneDir, 'install.json', MAX_INSTALL_BYTES);
    } catch {
        return undefined;
    }
    try {
        return parseInstallManifest(JSON.parse(text) as unknown);
    } catch {
        return undefined;
    }
}

/** Bounded rendering: a lane with many declared assets never produces an unbounded message. */
function describe(entries: readonly string[]): string {
    const shown = entries.slice(0, MAX_REPORTED_ASSETS).join(', ');
    return entries.length > MAX_REPORTED_ASSETS
        ? `${shown} and ${entries.length - MAX_REPORTED_ASSETS} more` : shown;
}
