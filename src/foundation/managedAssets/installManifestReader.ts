/**
 * Closed `unknown → InstallManifestV1` reader (Correction 01, finding 7). The
 * accepted work brief typed `InstallManifestV1` as a public method parameter
 * without ever validating install-manifest bytes into it, so a caller could
 * hand `ManagedAssets` an unvalidated shape. This module is the trust
 * boundary: every field is checked for exact shape, and every managed-asset
 * key is rejected unless it already satisfies the same `bin/`-descendant rule
 * `managedLinkPlanner.ts` enforces (reused, not re-derived) before a single
 * mutation is even considered.
 *
 * Deep pin validation (catalog id/digest syntax, containment against a
 * runtime root) remains `taskRuntimePin.ts#readTaskRuntimePin`'s job, run
 * later against a resolved runtime root; this reader only proves the
 * `taskRuntime` block has exactly the five expected string fields.
 */
import {ManagedAssetsError, type InstallManifestV1, type ManagedAssetDeclaration} from '../../contracts/manifests.js';
import {isManagedBinPath} from './managedLinkPlanner.js';

const SEMVER = /^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-[0-9A-Za-z.-]+)?$/u;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const TASK_RUNTIME_FIELDS = ['catalogId', 'catalogSha256', 'configTarget', 'moduleTarget', 'profile'] as const;
const MANIFEST_FIELDS = ['cliVersion', 'knowledgeVersion', 'managedAssets', 'mode', 'runtimeVersion', 'schemaVersion', 'taskRuntime'] as const;
const ASSET_FIELDS = ['sha256', 'target'] as const;

export function parseInstallManifest(value: unknown): InstallManifestV1 {
    const root = requireExactObject(value, MANIFEST_FIELDS, 'install.json');
    if (root.schemaVersion !== 1) throw invalid('schemaVersion', 'install.json must declare schemaVersion 1.');
    if (root.mode !== 'linked') throw invalid('mode', 'v1 supports only the "linked" install mode.');
    const cliVersion = requireSemver(root.cliVersion, 'cliVersion');
    const runtimeVersion = requireSemver(root.runtimeVersion, 'runtimeVersion');
    const knowledgeVersion = requireSemver(root.knowledgeVersion, 'knowledgeVersion');
    const taskRuntime = requireTaskRuntimeShape(root.taskRuntime);
    const managedAssets = requireManagedAssets(root.managedAssets);
    return {schemaVersion: 1, cliVersion, runtimeVersion, knowledgeVersion, mode: 'linked', taskRuntime, managedAssets};
}

function requireTaskRuntimeShape(value: unknown): InstallManifestV1['taskRuntime'] {
    const block = requireExactObject(value, TASK_RUNTIME_FIELDS, 'taskRuntime');
    for (const field of TASK_RUNTIME_FIELDS) {
        if (typeof block[field] !== 'string' || (block[field] as string).length === 0) {
            throw invalid(`taskRuntime.${field}`, 'The taskRuntime pin field must be a non-empty string.');
        }
    }
    return block as unknown as InstallManifestV1['taskRuntime'];
}

function requireManagedAssets(value: unknown): Readonly<Record<string, ManagedAssetDeclaration>> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw invalid('managedAssets', 'managedAssets must be a JSON object.');
    }
    const result: Record<string, ManagedAssetDeclaration> = {};
    for (const [assetPath, declaration] of Object.entries(value)) {
        if (!isManagedBinPath(assetPath)) {
            throw invalid('managedAssets', `The managed-asset key "${assetPath}" is not a normalized lane-relative bin/ descendant.`);
        }
        const entry = requireExactObject(declaration, ASSET_FIELDS, `managedAssets["${assetPath}"]`);
        if (typeof entry.target !== 'string' || entry.target.length === 0) {
            throw invalid(`managedAssets["${assetPath}"].target`, 'The managed-asset target must be a non-empty string.');
        }
        if (typeof entry.sha256 !== 'string' || !DIGEST.test(entry.sha256)) {
            throw invalid(`managedAssets["${assetPath}"].sha256`, 'The managed-asset digest must match sha256:<64 hex>.');
        }
        result[assetPath] = {target: entry.target, sha256: entry.sha256 as `sha256:${string}`};
    }
    return result;
}

function requireSemver(value: unknown, field: string): string {
    if (typeof value !== 'string' || !SEMVER.test(value)) {
        throw invalid(field, `${field} must be a full, valid semantic version.`);
    }
    return value;
}

function requireExactObject(value: unknown, fields: readonly string[], subject: string): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw invalid(subject, `${subject} must be a JSON object.`);
    }
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const expected = [...fields].sort();
    if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
        throw invalid(subject, `${subject} must declare exactly: ${expected.join(', ')}.`);
    }
    return record;
}

function invalid(subject: string, message: string): ManagedAssetsError {
    return new ManagedAssetsError('INSTALL_MANIFEST_INVALID', subject, message);
}
