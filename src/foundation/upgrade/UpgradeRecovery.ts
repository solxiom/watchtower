/**
 * UK-03 crash recovery and downgrade guard: the counterpart to `UpgradeApply`
 * for the install-pointer/store boundary (`docs/spec/v1.md` §11.5, §14;
 * `docs/spec/v1-contracts.md` §11). `recover()` is a pure disk scan — it never
 * trusts any in-process bookkeeping from a crashed `apply()` call, because a
 * real crash leaves nothing in memory. It removes leftover staging temp
 * artifacts (predictable-suffix names `UpgradeApply` writes adjacent to their
 * target), then proves the old `install.json` is still readable and every
 * declared managed-asset target still exists in the immutable runtime store
 * with a matching checksum — the old runtime is invocable at that root
 * regardless of what a lane `bin/` link happens to point to after a crash.
 * `guardDowngrade()` performs no I/O and no mutation; it only classifies
 * whether a requested downgrade may proceed before any lock is acquired.
 */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {InstallManifestV1} from '../../contracts/manifests.js';
import type {RuntimeManifestV1} from '../../contracts/runtimeKnowledgeManifests.js';
import type {DowngradeGuardResult, OldManifestStatus, RecoveryResult} from '../../contracts/upgradeApply.js';
import {buildLaneFilePath} from '../paths/index.js';
import {parseInstallManifest} from '../runtime/index.js';
import {INSTALL_STAGING_SUFFIX, nodeUpgradeApplyFileSystem, STAGING_SUFFIX, type UpgradeApplyFileSystem} from './upgradeApplyFileSystem.js';

export interface DowngradeGuardInput {
    readonly currentRuntimeVersion: string;
    readonly allowDowngrade: boolean;
    readonly laneSchemaVersion: number;
    readonly targetRuntime: RuntimeManifestV1;
}

const SEMVER = /^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-.+)?$/u;

/** `< 0` when `left` is older than `right`; a malformed component compares as `0`. */
function compareVersions(left: string, right: string): number {
    const a = SEMVER.exec(left);
    const b = SEMVER.exec(right);
    if (a === null || b === null) return 0;
    for (let index = 1; index <= 3; index += 1) {
        const diff = Number(a[index]) - Number(b[index]);
        if (diff !== 0) return diff;
    }
    return 0;
}

export interface UpgradeRecoveryOptions { readonly fileSystem?: UpgradeApplyFileSystem; }

export class UpgradeRecovery {
    private readonly fileSystem: UpgradeApplyFileSystem;

    constructor(options: UpgradeRecoveryOptions = {}) { this.fileSystem = options.fileSystem ?? nodeUpgradeApplyFileSystem; }

    recover(laneDir: string): RecoveryResult {
        const artifactsCleaned = [...this.cleanDirectory(laneDir, INSTALL_STAGING_SUFFIX), ...this.cleanDirectory(join(laneDir, 'bin'), STAGING_SUFFIX)];
        const {install, status} = this.readOldInstall(laneDir);
        if (install === null) return {recovered: artifactsCleaned.length > 0, artifactsCleaned, oldManifestStatus: status, oldRuntimeInvocable: false};
        const oldRuntimeInvocable = this.verifyManagedAssets(install);
        return {recovered: true, artifactsCleaned, oldManifestStatus: status, oldRuntimeInvocable};
    }

    guardDowngrade(input: DowngradeGuardInput): DowngradeGuardResult {
        const isDowngrade = compareVersions(input.targetRuntime.runtimeVersion, input.currentRuntimeVersion) < 0;
        if (!isDowngrade) return {allowed: true, reason: null, incompatibleField: null};
        if (!input.allowDowngrade) return {allowed: false, reason: 'DOWNGRADE_NOT_ALLOWED', incompatibleField: null};
        const supported = input.targetRuntime.compatibleLaneSchemaVersions;
        if (!supported.includes(input.laneSchemaVersion as 1)) {
            return {allowed: false, reason: 'DOWNGRADE_SCHEMA_INCOMPATIBLE', incompatibleField: 'compatibleLaneSchemaVersions'};
        }
        return {allowed: true, reason: null, incompatibleField: null};
    }

    private cleanDirectory(directory: string, suffix: string): string[] {
        const cleaned: string[] = [];
        for (const name of this.fileSystem.listDirectory(directory)) {
            if (!name.endsWith(suffix)) continue;
            const path = join(directory, name);
            this.fileSystem.removeIfExists(path);
            cleaned.push(path);
        }
        return cleaned.sort();
    }

    private readOldInstall(laneDir: string): {readonly install: InstallManifestV1 | null; readonly status: OldManifestStatus} {
        let path: string;
        try {
            path = buildLaneFilePath(laneDir, 'install.json');
        } catch {
            return {install: null, status: 'missing'};
        }
        const text = readTextSafely(path);
        if (text === null) return {install: null, status: 'missing'};
        try {
            return {install: parseInstallManifest(JSON.parse(text) as unknown), status: 'valid'};
        } catch {
            return {install: null, status: 'invalid'};
        }
    }

    private verifyManagedAssets(install: InstallManifestV1): boolean {
        for (const declaration of Object.values(install.managedAssets)) {
            const digest = this.fileSystem.digestFile(declaration.target);
            if (digest === null || digest !== declaration.sha256) return false;
        }
        return true;
    }
}

function readTextSafely(path: string): string | null {
    try {
        return readFileSync(path, 'utf8');
    } catch {
        return null;
    }
}
