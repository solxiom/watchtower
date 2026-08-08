/** Read-only resolution of a lane's accepted implementation-pack evidence. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import gitDriver from '@nirvana/base/git';
import type {ConsumedPack} from '../../../contracts/pack.js';
import {createWatchtowerError} from '../../../contracts/index.js';
import {consumePack, nodePackFileSystem, nodePackGitInspector, loadPackSchemaValidators} from '../../pack/index.js';
import type {PackEvidenceInspector} from '../../pack/index.js';
import {readRepositoryBindings} from '../../bindings/index.js';
import {parseJsonlStream} from '../../parsing/index.js';
import type {DiscoveredLane} from '../../discovery/laneDiscovery.js';

/** Resolves and validates the lane's accepted implementation pack from repository bytes; never writes. */
export async function resolveAcceptedPack(lane: DiscoveredLane): Promise<ConsumedPack> {
    const reference = lane.manifest.implementationPack;
    if (reference === undefined) throw createWatchtowerError('ERR_INDEX_UNAVAILABLE', {operation: 'resolve accepted implementation pack', target: lane.laneId, remediation: 'Restore the lane implementation-pack reference.'});
    const bindings = readRepositoryBindings(join(lane.laneDir, 'repositories.local.json'), lane.manifest.repositories);
    const packBinding = bindings.find((binding) => binding.id === reference.repository);
    if (packBinding === undefined) throw createWatchtowerError('ERR_INDEX_UNAVAILABLE', {operation: 'resolve accepted implementation pack', target: reference.repository, remediation: 'Restore the pack repository binding.'});
    const packRoot = join(packBinding.path, reference.path);
    const manifest = JSON.parse(readFileSync(join(packRoot, 'implementation-pack.json'), 'utf8')) as Record<string, unknown>;
    const packRepository = typeof manifest.packRepository === 'string' ? manifest.packRepository : '';
    const packRootBinding = bindings.find((binding) => binding.id === packRepository);
    if (packRootBinding === undefined) throw createWatchtowerError('ERR_INDEX_UNAVAILABLE', {operation: 'resolve accepted implementation pack', target: packRepository, remediation: 'Restore the manifest packRepository binding.'});
    const validators = loadPackSchemaValidators();
    if (!validators.ok) throw validators.error;
    const headCommit = String(await gitDriver.raw({repoPath: packRootBinding.path, args: ['rev-parse', 'HEAD']})).trim();
    const sources = await Promise.all(bindings.filter((binding) => binding.id !== packRepository).map(async (binding) => ({
        repository: binding.id, repositoryRoot: binding.path, readOnly: binding.access === 'read', proofOptional: false,
        head: String(await gitDriver.raw({repoPath: binding.path, args: ['rev-parse', 'HEAD']})).trim()
    })));
    const evidence: PackEvidenceInspector = laneEvidence(lane);
    const result = await consumePack({packRoot, packRepositoryRoot: packRootBinding.path, headCommit,
        sources: sources.map(({head, ...source}) => source)}, {fs: nodePackFileSystem, git: nodePackGitInspector, validators: validators.validators, evidence});
    if (!result.ok) throw createWatchtowerError('ERR_INDEX_UNAVAILABLE', {operation: 'validate accepted implementation pack', target: result.target, remediation: result.detail});
    return result.pack;
}

function laneEvidence(lane: DiscoveredLane): PackEvidenceInspector {
    const events = () => parseJsonlStream(readOptional(join(lane.laneDir, 'state/pack-review-events.jsonl'))).records;
    return {
        resolveSession: (sessionId) => {
            const event = events().find((item) => item.payload.session === sessionId);
            if (event === undefined || (event.payload.role !== 'reviewer' && event.payload.role !== 'implementer')) return null;
            return {sessionId, laneId: event.laneId, role: event.payload.role as 'reviewer' | 'author'};
        },
        resolveAcceptanceEvidence: (root, relativePath) => {
            try {
                const value = JSON.parse(readFileSync(join(root, relativePath), 'utf8')) as Record<string, unknown>;
                return typeof value.verdict === 'string' && typeof value.repository === 'string' && typeof value.inputPath === 'string' && typeof value.inputSha256 === 'string' && typeof value.reviewSessionId === 'string'
                    ? {verdict: value.verdict, repository: value.repository, inputPath: value.inputPath, inputSha256: value.inputSha256, reviewSessionId: value.reviewSessionId} : null;
            } catch { return null; }
        },
        resolveReviewEvents: () => events()
    };
}

function readOptional(path: string): string { try { return readFileSync(path, 'utf8'); } catch { return ''; } }
