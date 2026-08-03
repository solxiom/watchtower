/**
 * Builds the closed `lane.json` document (`docs/spec/v1.md` §7.3) from an
 * accepted `InitPlan` (LC-01) and its bound `ConsumedPack` (LC-02). Every
 * field is validated against the exact rules `laneManifestReader.ts` already
 * enforces on read, so a document this module returns always round-trips.
 */
import type {ConsumedPack} from '../../contracts/pack.js';
import type {LaneManifestV1, RepositoryRef} from '../../contracts/types.js';
import {createWatchtowerError} from '../../contracts/errors.js';
import {safePathTarget} from '../canonicalPaths.js';
import type {InitPlan} from '../InitContracts.js';

const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/iu;
const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/u;
const GENERAL_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

export function generateLaneManifest(plan: InitPlan, pack: ConsumedPack, now: () => string = () => new Date().toISOString()): LaneManifestV1 {
    const controlHomeRepository = homeRepositoryId(plan);
    const repositories = repositoryRefs(plan);
    assertOneHomeRepository(repositories, controlHomeRepository);
    const manifest: LaneManifestV1 = Object.freeze({
        schemaVersion: 1,
        laneId: assertUuid(plan.lane.id),
        kind: 'implementation',
        slug: assertSlug(plan.lane.slug),
        initiativeId: assertGeneralId(pack.initiativeId),
        controlHomeRepository,
        laneDir: `.watchtower/lanes/${plan.lane.slug}`,
        implementationPack: Object.freeze({
            repository: assertSlug(plan.implementationPack.repository),
            path: assertRelativePath(plan.implementationPack.path)
        }),
        repositories,
        createdAt: assertIso(now())
    }) as LaneManifestV1;
    return manifest;
}

export function homeRepositoryId(plan: InitPlan): string {
    const matches = plan.repositories.filter(binding => binding.path === plan.controlHome);
    if (matches.length !== 1) throw integrityFailure(plan.controlHome, 'Restore exactly one repository binding for the control home.');
    return assertSlug(matches[0].id);
}

function repositoryRefs(plan: InitPlan): readonly RepositoryRef[] {
    if (plan.repositories.length === 0) throw integrityFailure('repositories', 'Declare at least one repository binding.');
    const ids = new Set<string>();
    return Object.freeze(plan.repositories.map(binding => {
        if (ids.has(binding.id)) throw integrityFailure(binding.id, 'Remove duplicate repository ids.');
        ids.add(binding.id);
        return Object.freeze({id: assertSlug(binding.id), role: assertSafeString(binding.role), access: binding.access});
    }));
}

function assertOneHomeRepository(repositories: readonly RepositoryRef[], controlHomeRepository: string): void {
    if (repositories.filter(repository => repository.id === controlHomeRepository).length !== 1) {
        throw integrityFailure(controlHomeRepository, 'Declare the control-home repository exactly once.');
    }
}

function assertUuid(value: string): string { if (!UUID.test(value)) throw integrityFailure(value, 'Use a UUID lane id.'); return value; }
function assertSlug(value: string): string { if (!SLUG.test(value)) throw integrityFailure(value, 'Use the v1 lowercase slug syntax.'); return value; }
function assertGeneralId(value: string): string { if (!GENERAL_ID.test(value)) throw integrityFailure(value, 'Use a safe pack initiativeId.'); return value; }
function assertIso(value: string): string { if (Number.isNaN(Date.parse(value))) throw integrityFailure(value, 'Use an ISO date-time for createdAt.'); return value; }
function assertSafeString(value: string): string {
    if (value.length === 0 || value.length > 200 || hasControlCharacter(value)) throw integrityFailure(value, 'Use a safe repository role string.');
    return value;
}

function hasControlCharacter(value: string): boolean {
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        if (code <= 0x1f || code === 0x7f) return true;
    }
    return false;
}
function assertRelativePath(value: string): string {
    if (value.startsWith('/') || value.includes('\\') || value.split('/').some(segment => segment === '' || segment === '.' || segment === '..')) {
        throw integrityFailure(value, 'Use a repository-relative implementation pack path.');
    }
    return value;
}

function integrityFailure(target: string, remediation: string) {
    return createWatchtowerError('ERR_INTEGRITY_FAILURE', {operation: 'generate lane marker', target: safePathTarget(target), remediation});
}
