import {relative, sep} from 'node:path';
import type {RepositoryBinding} from '../../contracts/index.js';
import {StatusRepositoryGitInspector, type RepositoryChanges} from './StatusRepositoryGitInspector.js';
import type {PackManifestRecord} from './statusPackTypes.js';
import {StatusProofInputInspector} from './StatusProofInputInspector.js';
import {resourcePathsOverlap} from '../bindings/index.js';

export class StatusSourceBaselineInspector {
    constructor(private readonly git: StatusRepositoryChangesSource = new StatusRepositoryGitInspector(),
        private readonly proofs = new StatusProofInputInspector()) {}

    async inspect(manifest: PackManifestRecord, bindings: readonly RepositoryBinding[],
        packRepository: string, packRoot: string): Promise<SourceBaselineState> {
        let unrelated = false;
        let optionalUnavailable = false;
        for (const repository of manifest.repositories) {
            const baseline = manifest.baselines[repository.id];
            const binding = bindings.find(item => item.id === repository.id);
            if (baseline === undefined || binding === undefined) {
                if (optionalReadProof(manifest, repository.id, repository.access)) optionalUnavailable = true;
                else return 'SOURCE_BASELINE_UNAVAILABLE';
                continue;
            }
            const proofInputs = manifest.proofInputs.filter(input => input.repository === repository.id);
            const proofState = proofInputs.length === 0 ? 'current' :
                await this.proofs.inspect(binding.path, baseline.revision, proofInputs);
            if (proofState === 'invalid') return 'SOURCE_BASELINE_CRITICAL';
            if (proofState === 'unavailable') {
                if (optionalReadProof(manifest, repository.id, repository.access)) optionalUnavailable = true;
                else return 'SOURCE_BASELINE_UNAVAILABLE';
                continue;
            }
            const observation = await this.git.changedPaths(binding.path, baseline.revision);
            if (observation.state === 'unavailable') {
                if (optionalReadProof(manifest, repository.id, repository.access)) optionalUnavailable = true;
                else return 'SOURCE_BASELINE_UNAVAILABLE';
                continue;
            }
            const packPrefix = repository.id === packRepository
                ? relative(binding.path, packRoot).split(sep).join('/') : undefined;
            const changes = observation.paths.filter(path => packPrefix === undefined && path !== '' ||
                packPrefix !== undefined && path !== packPrefix && !path.startsWith(`${packPrefix}/`));
            if (changes.some(path => critical(manifest, repository.id, path))) return 'SOURCE_BASELINE_CRITICAL';
            if (changes.length > 0) unrelated = true;
        }
        if (optionalUnavailable) return 'SOURCE_BASELINE_OPTIONAL_UNAVAILABLE';
        return unrelated ? 'SOURCE_BASELINE_UNRELATED' : 'current';
    }
}

export interface StatusRepositoryChangesSource {
    changedPaths(repository: string, revision: string): Promise<RepositoryChanges>;
}

export type SourceBaselineState = 'current' | 'SOURCE_BASELINE_CRITICAL' | 'SOURCE_BASELINE_UNRELATED' |
    'SOURCE_BASELINE_UNAVAILABLE' | 'SOURCE_BASELINE_OPTIONAL_UNAVAILABLE';

function critical(manifest: PackManifestRecord, repository: string, changedPath: string): boolean {
    const protectedPaths = [...manifest.writablePaths, ...manifest.acceptedInputs, ...manifest.proofInputs]
        .filter(item => item.repository === repository);
    return protectedPaths.some(item => resourcePathsOverlap(changedPath, item.path));
}

function optionalReadProof(manifest: PackManifestRecord, repository: string, access: 'read' | 'write'): boolean {
    const proofInputs = manifest.proofInputs.filter(input => input.repository === repository);
    return access === 'read' && proofInputs.length > 0 && proofInputs.every(input => input.optional);
}
