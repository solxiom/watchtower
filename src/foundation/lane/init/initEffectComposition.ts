/**
 * The production wiring of `InitEffectPorts` (LC-11): one place where each
 * accepted owner is resolved and adapted to the orchestrator's narrow port
 * shape. It contains no init policy of its own — every decision it forwards
 * (pack acceptance, drift classification, lock order, layout, commit,
 * baselines, index activation, registration) belongs to the owner it calls.
 */
import {join} from 'node:path';
import gitDriver from '@nirvana/base/git';
import type {ConsumedPack} from '../../../contracts/pack.js';
import type {PackIndexCompileResult} from '../../../contracts/packIndex.js';
import {readRepositoryBindings} from '../../bindings/index.js';
import {nodeLaneDiscoveryFileSystem, readLaneManifest} from '../../discovery/index.js';
import {acquireInitLockLease, acquireInitStagingLockLease, type InitLockOptions, type InitPlan} from '../../init/index.js';
import {registerLaneWithRetry, restoreGitignore, shouldUpdateGitignore, updateGitignore} from '../../lifecycle/index.js';
import {
    InitialPackIndexActivation, consumePack, loadPackSchemaValidators, nodePackFileSystem, nodePackGitInspector,
    observePackDrift, type PackConsumerContext, type PackConsumerDeps
} from '../../pack/index.js';
import {LaneInstallIdentityReader} from '../../read/index.js';
import {LaneTaskProfileInstaller, RuntimeCatalog, readStagedRuntimeManifest} from '../../runtime/index.js';
import {nodeRuntimeFileSystem} from '../../task/index.js';
import {VersionReportService} from '../../upgrade/index.js';
import {buildCoordinatorBaseline, composeLaneLayoutWithCoordinatorBaseline, resolveInstalledKnowledgeTag} from '../coordinator/index.js';
import {buildLaneLayout, type LaneLayout, type RuntimeAssetRef} from '../store/index.js';
import {commitLane, nodeTransactionalWriterFileSystem, type TransactionalWriterFileSystem} from '../writer/index.js';
import {InitEffect} from './InitEffect.js';
import type {InitEffectRequest} from './initEffectContracts.js';
import {packRejectionCode, refusal} from './initEffectFailure.js';
import type {InitEffectPorts, InitInstallResolution} from './initEffectPorts.js';
import {createInitPackEvidenceInspector} from './initPackEvidenceHost.js';
import {buildLaneStateFile, projectLaneState} from './laneStateProjection.js';

/** The packaged implementation-lane task profile; RT-06's catalog reader proves it exists and only narrows. */
const IMPLEMENTATION_PROFILE = 'implementation-v1';
const CONFIG_TARGET_RELATIVE = 'runtime-nvb/runtime-nvb.json';
const MODULE_TARGET_RELATIVE = 'runtime-nvb/runtime-nvb.js';
const REGISTRATION_RETRIES = 3;

export interface InitEffectCompositionOptions {
    readonly lockOptions?: InitLockOptions;
    /** Injected only by focused staging/write/fsync/rename fault-injection proof. */
    readonly writerFileSystem?: TransactionalWriterFileSystem;
}
export function createInitEffect(options: InitEffectCompositionOptions = {}): InitEffect {
    return new InitEffect(createInitEffectPorts(options));
}

export function createInitEffectPorts(options: InitEffectCompositionOptions = {}): InitEffectPorts {
    const files = options.writerFileSystem ?? nodeTransactionalWriterFileSystem;
    return {
        validatePack: (request) => validatePack(request),
        resolveInstall: (request) => resolveInstall(request),
        acquireLocks: (request) => acquireInitStagingLockLease({dataHome: request.dataHome, ...options.lockOptions}),
        acquireCompletionLocks: (request) => acquireInitLockLease(request.plan.controlHome, request.plan.lane.slug,
            {dataHome: request.dataHome, ...options.lockOptions}),
        gitignoreUpdateRequired: (controlHome) => shouldUpdateGitignore(controlHome),
        updateGitignore: async (controlHome) => {
            const update = await updateGitignore(controlHome);
            return {path: update.path, originalDigest: update.originalDigest};
        },
        restoreGitignore: (controlHome, originalDigest) => restoreGitignore(controlHome, originalDigest),
        composeLayout: (request, pack, install) => composeLayout(request, pack, install),
        commitLayout: (layout) => commitLane(layout, files),
        activateIndex: (request, pack, laneDir) => activateIndex(request, pack, laneDir),
        verifyCommit: (laneDir, pack) => verifyCommit(laneDir, pack),
        projectLifecycle: (laneDir, lifecycle) => projectLaneState(laneDir, lifecycle, files),
        registerMemberships: (request, laneDir) =>
            registerLaneWithRetry(laneDir, REGISTRATION_RETRIES, {dataHome: request.dataHome})
    };
}

/** LC-02: acceptance, seal reproduction, and the mechanical §3.5 drift matrix. */
async function validatePack(request: InitEffectRequest): Promise<ConsumedPack> {
    const plan = request.plan;
    const deps = packDeps(request);
    const context = await packContext(plan);
    const result = await consumePack(context, deps);
    if (!result.ok) {
        throw refusal('pack-validation', packRejectionCode(result.reason), result.target,
            `${result.reason}: ${result.detail}. Re-run init with an accepted, sealed, committed pack.`);
    }
    const declared = {...context, sources: context.sources
        .filter((source) => result.pack.repositories.includes(source.repository))};
    const drift = await observePackDrift(result.pack, declared, deps);
    if (!drift.ok) {
        const finding = drift.findings.find((item) => item.severity === 'fail') ?? drift.findings[0];
        throw refusal('pack-validation', 'ERR_PREFLIGHT_FAILED', finding?.path ?? plan.implementationPack.path,
            `${finding?.code ?? 'PACK_FILESET_CHANGED'}: resolve the pack drift and re-run init.`);
    }
    return result.pack;
}

function packDeps(request: InitEffectRequest): PackConsumerDeps {
    const validators = loadPackSchemaValidators();
    if (!validators.ok) throw validators.error;
    return {
        fs: nodePackFileSystem, git: nodePackGitInspector, validators: validators.validators,
        evidence: createInitPackEvidenceInspector({
            controlHome: request.plan.controlHome, dataHome: request.dataHome, fs: nodePackFileSystem
        })
    };
}

async function packContext(plan: InitPlan): Promise<PackConsumerContext> {
    const packRepositoryRoot = repositoryPath(plan, plan.implementationPack.repository);
    return {
        packRoot: plan.implementationPack.absolutePath,
        packRepositoryRoot,
        headCommit: await headCommit(packRepositoryRoot),
        sources: plan.repositories.map((binding) => ({
            repository: binding.id, repositoryRoot: binding.path,
            readOnly: binding.access === 'read', proofOptional: false
        }))
    };
}

async function headCommit(repositoryRoot: string): Promise<string> {
    return String(await gitDriver.raw({repoPath: repositoryRoot, args: ['rev-parse', 'HEAD']})).trim();
}

function repositoryPath(plan: InitPlan, repository: string): string {
    const binding = plan.repositories.find((item) => item.id === repository);
    if (binding === undefined) {
        throw refusal('pack-validation', 'ERR_PREFLIGHT_FAILED', repository,
            'Declare the implementation-pack repository in --scope.');
    }
    return binding.path;
}

/** RT-04/RT-06: the installed runtime assets and the verified `install.json` task-runtime pin. */
function resolveInstall(request: InitEffectRequest): InitInstallResolution {
    const plan = request.plan;
    const runtimeVersion = plan.runtime.version;
    const runtimeRoot = plan.runtime.root;
    if (runtimeVersion === null || runtimeRoot === null) {
        throw refusal('runtime-resolution', 'ERR_MISSING_DEPENDENCY', plan.lane.slug,
            'Applying init requires --runtime=<installed version>; install.json cannot be written without one.');
    }
    const cliVersion = new VersionReportService().report({cwd: plan.controlHome}).cliVersion;
    const manifest = readStagedRuntimeManifest(runtimeRoot, nodeRuntimeFileSystem);
    const taskRuntime = new LaneTaskProfileInstaller(new RuntimeCatalog({dataRoot: () => request.dataHome})).install({
        runtimeVersion, profile: IMPLEMENTATION_PROFILE, cliVersion,
        configTargetRelative: CONFIG_TARGET_RELATIVE, moduleTargetRelative: MODULE_TARGET_RELATIVE
    });
    return {
        cliVersion, taskRuntime,
        knowledgeVersion: resolveInstalledKnowledgeTag(request.dataHome).knowledgeVersion,
        runtimeRefs: manifest.assets.map((asset): RuntimeAssetRef =>
            ({path: join(runtimeRoot, asset.path), sha256: asset.sha256}))
    };
}

/** LC-03 layout + LC-05 coordinator baseline + this batch's own bootstrap lifecycle projection. */
function composeLayout(request: InitEffectRequest, pack: ConsumedPack, install: InitInstallResolution): LaneLayout {
    const plan = request.plan;
    const base = buildLaneLayout({
        plan, pack, runtimeRefs: install.runtimeRefs,
        install: {cliVersion: install.cliVersion, knowledgeVersion: install.knowledgeVersion,
            taskRuntime: install.taskRuntime}
    });
    const composed = composeLaneLayoutWithCoordinatorBaseline(base,
        buildCoordinatorBaseline({plan, dataHome: request.dataHome}));
    return Object.freeze({
        laneDir: composed.laneDir, dirs: composed.dirs, links: composed.links,
        files: Object.freeze([...composed.files, buildLaneStateFile(plan.laneDir, 'bootstrap')])
    });
}

/** LC-09: the seal-bound compile/verify/atomic activation adapter over the accepted compiler. */
function activateIndex(request: InitEffectRequest, pack: ConsumedPack, laneDir: string): Promise<PackIndexCompileResult> {
    const validators = loadPackSchemaValidators();
    if (!validators.ok) throw validators.error;
    return new InitialPackIndexActivation({fs: nodePackFileSystem, validators: validators.validators}).activate({
        pack, packRoot: request.plan.implementationPack.absolutePath,
        packPath: request.plan.implementationPack.path, laneId: request.plan.lane.id, laneDir
    });
}

/**
 * Post-commit verification through the accepted readers only: the lane marker,
 * its local bindings, and the install identity must all read back, and the
 * marker must still name the pack init just sealed.
 */
function verifyCommit(laneDir: string, pack: ConsumedPack): void {
    const manifest = readLaneManifest(join(laneDir, 'lane.json'), nodeLaneDiscoveryFileSystem);
    if (manifest.initiativeId !== pack.initiativeId) {
        throw refusal('post-commit-verification', 'ERR_INTEGRITY_FAILURE', 'lane.json',
            'The committed lane marker does not name the accepted pack initiative.');
    }
    readRepositoryBindings(join(laneDir, 'repositories.local.json'), manifest.repositories);
    new LaneInstallIdentityReader().read(laneDir);
}
