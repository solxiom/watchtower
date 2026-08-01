import {existsSync, lstatSync, realpathSync} from 'node:fs';
import {resolve, sep} from 'node:path';
import type {RepositoryBinding, StatusPackIntegrityView, StatusWarningCode, WorkerEventRecord} from '../contracts/index.js';
import type {StatusLane} from './statusLaneTypes.js';
import {semanticDigest} from './schemaComposition/jsonCanonicalizer.js';
import {StatusPackContractReader} from './StatusPackContractReader.js';
import {StatusAcceptedInputInspector} from './StatusAcceptedInputInspector.js';
import {StatusPackAcceptanceAuthority} from './StatusPackAcceptanceAuthority.js';
import {StatusPackFileInventory} from './StatusPackFileInventory.js';
import {StatusPackGitInspector} from './StatusPackGitInspector.js';
import {StatusPackGraphValidator} from './StatusPackGraphValidator.js';
import {StatusSourceBaselineInspector} from './StatusSourceBaselineInspector.js';

const REQUIRED_FILES = ['implementation-pack.json', 'implementation-pack.lock.json', 'pack-acceptance.json',
    'requirements-traceability.md', 'implementation-map.md', 'implementation-quality-and-agent-rules.md',
    'implementation-roadmap.md', 'implementation-tracker.md'];
const REQUIRED_DIRECTORIES = ['work-batches', 'review-batches'];

export interface StatusPackIntegritySource {
    inspect(lane: StatusLane, bindings: readonly RepositoryBinding[], warnings: StatusWarningCode[],
        reviewEvents?: readonly WorkerEventRecord[]): Promise<StatusPackIntegrityView>;
}

export class StatusPackIntegrity implements StatusPackIntegritySource {
    constructor(private readonly contracts = new StatusPackContractReader(),
        private readonly inventory = new StatusPackFileInventory(), private readonly git = new StatusPackGitInspector(),
        private readonly acceptedInputs = new StatusAcceptedInputInspector(),
        private readonly baselines = new StatusSourceBaselineInspector(),
        private readonly authority = new StatusPackAcceptanceAuthority(),
        private readonly graph = new StatusPackGraphValidator()) {}

    async inspect(lane: StatusLane, bindings: readonly RepositoryBinding[], warnings: StatusWarningCode[],
        reviewEvents: readonly WorkerEventRecord[] = []): Promise<StatusPackIntegrityView> {
        const reference = lane.manifest.implementationPack;
        const binding = bindings.find(item => item.id === reference?.repository);
        if (reference === undefined || binding === undefined) return result('missing', warnings);
        const root = resolve(binding.path, reference.path);
        if (!root.startsWith(`${resolve(binding.path)}${sep}`) || !existsSync(root)) return result('missing', warnings);
        try {
            if (!lstatSync(root).isDirectory() || realpathSync(root) !== root ||
                REQUIRED_FILES.some(path => !lstatSync(resolve(root, path)).isFile()) ||
                REQUIRED_DIRECTORIES.some(path => !lstatSync(resolve(root, path)).isDirectory())) {
                return result('invalid', warnings);
            }
            const parsed = this.contracts.read(this.inventory.text(root, 'implementation-pack.json'),
                this.inventory.text(root, 'pack-acceptance.json'), this.inventory.text(root, 'implementation-pack.lock.json'));
            if (parsed === undefined) return result('invalid', warnings);
            const {manifest, acceptance, lock} = parsed;
            if (manifest.packId !== acceptance.packId || manifest.packId !== lock.packId ||
                manifest.packRepository !== reference.repository || semanticDigest(manifest.value) !== acceptance.acceptedManifestDigest ||
                lock.manifestDigest !== semanticDigest(manifest.value) || lock.acceptanceDigest !== semanticDigest(acceptance.value) ||
                semanticDigest(lock.sourceBaselines) !== semanticDigest(manifest.sourceBaselines)) return result('unaccepted', warnings);
            const actual = this.inventory.inspect(root);
            if (actual.invalidEntry || JSON.stringify(actual.files) !== JSON.stringify(lock.files)) return result('drift', warnings);
            if (!this.graph.valid(manifest, actual.files)) return result('invalid', warnings);
            if (!this.authority.valid(manifest, acceptance, reviewEvents)) return result('unaccepted', warnings);
            const seal = semanticDigest({schemaVersion: 1, packId: lock.packId, manifestDigest: lock.manifestDigest,
                acceptanceDigest: lock.acceptanceDigest, sourceBaselines: lock.sourceBaselines,
                files: lock.files.map(file => ({path: file.path, sha256: file.sha256, bytes: file.bytes}))});
            if (seal !== lock.sealId) return result('unaccepted', warnings);
            const current = await this.git.current(binding.path, root, actual.files);
            const reviewed = await this.git.reviewed(binding.path, root, acceptance.reviewedCommit, actual.files);
            if (current === 'unavailable' || reviewed === 'unavailable') return result('unavailable', warnings);
            const accepted = await this.acceptedInputs.inspect(manifest.acceptedInputs, bindings, root, actual.files);
            if (accepted === 'unavailable') return result('unavailable', warnings);
            if (current === 'drift' || reviewed === 'drift' || accepted === 'changed') return result('drift', warnings);
            const baseline = await this.baselines.inspect(manifest, bindings, reference.repository, root);
            if (baseline === 'SOURCE_BASELINE_CRITICAL') return baselineResult('drift', baseline, warnings);
            if (baseline === 'SOURCE_BASELINE_UNAVAILABLE') return baselineResult('unavailable', baseline, warnings);
            if (baseline === 'SOURCE_BASELINE_UNRELATED') warnings.push('SOURCE_BASELINE_UNRELATED');
            if (baseline === 'SOURCE_BASELINE_OPTIONAL_UNAVAILABLE') warnings.push('SOURCE_BASELINE_OPTIONAL_UNAVAILABLE');
            return {status: 'valid', sealId: lock.sealId};
        } catch (error) {
            return result(isUnavailable(error) ? 'unavailable' : 'invalid', warnings);
        }
    }
}
function baselineResult(status: 'drift' | 'unavailable', code: 'SOURCE_BASELINE_CRITICAL' |
    'SOURCE_BASELINE_UNAVAILABLE', warnings: StatusWarningCode[]): StatusPackIntegrityView {
    warnings.push(code); return {status, sealId: null};
}

type InvalidPackStatus = Exclude<StatusPackIntegrityView['status'], 'valid'>;
function result(status: InvalidPackStatus,
    warnings: StatusWarningCode[]): StatusPackIntegrityView {
    const codes: Record<InvalidPackStatus, StatusWarningCode> = {
        missing: 'IMPLEMENTATION_PACK_MISSING', unavailable: 'IMPLEMENTATION_PACK_UNAVAILABLE',
        invalid: 'IMPLEMENTATION_PACK_INVALID', unaccepted: 'IMPLEMENTATION_PACK_UNACCEPTED',
        drift: 'IMPLEMENTATION_PACK_DRIFT'};
    warnings.push(codes[status]); return {status, sealId: null};
}
function isUnavailable(error: unknown): boolean {
    return error instanceof Error && 'code' in error && ['EACCES', 'EPERM', 'EMFILE'].includes(String(error.code));
}
