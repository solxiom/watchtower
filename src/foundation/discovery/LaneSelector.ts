import {isAbsolute, relative, sep} from 'node:path';
import type {WatchtowerError} from '../../contracts/errors.js';
import {createWatchtowerError} from '../../contracts/errors.js';
import {canonicalizePath} from '../paths/index.js';
import type {DiscoveredLane} from './laneDiscovery.js';
import type {LaneDiscoveryFileSystem} from './LaneDiscoveryFileSystem.js';
import {discoverHomeLanes} from './homeLaneDiscovery.js';

export interface LaneSelectionContext {
    readonly cwd: string;
    readonly lane?: string;
    readonly initiative?: string;
}

const MAX_SELECTOR_LENGTH = 200;
const TRUNCATED_SUFFIX = '...[truncated]';
const SECRET_CONTEXT = /\b(?:token|secret|password|credential|api[ _-]?key)\b\s*[:=]/iu;

export function resolveLane(context: LaneSelectionContext, fileSystem?: LaneDiscoveryFileSystem): DiscoveredLane {
    return selectLane(discoverHomeLanes(context.cwd, fileSystem), context);
}

export function selectLane(lanes: readonly DiscoveredLane[], context: LaneSelectionContext): DiscoveredLane {
    const candidates = filterRelevantLanes(lanes, context.initiative);
    if (context.lane !== undefined) return selectExplicit(candidates, context.lane);
    if (candidates.length === 0) throw laneNotFound('current repository');
    const containing = containingLanes(candidates, context.cwd);
    if (containing.length === 1) return containing[0];
    if (containing.length > 1) throw ambiguity(containing);
    const active = candidates.filter(candidate => candidate.lifecycle === 'active');
    if (active.length === 1) return active[0];
    if (candidates.length === 1) return candidates[0];
    throw ambiguity(candidates);
}

export function filterRelevantLanes(
    lanes: readonly DiscoveredLane[], initiative?: string
): DiscoveredLane[] {
    validateFilter(initiative, 'initiative');
    return lanes.filter(candidate => initiative === undefined || candidate.initiativeId === initiative).sort(compareLanes);
}

function selectExplicit(candidates: readonly DiscoveredLane[], selector: string): DiscoveredLane {
    validateFilter(selector, 'lane');
    const byId = candidates.filter(candidate => candidate.laneId === selector);
    if (byId.length === 1) return byId[0];
    if (byId.length > 1) throw ambiguity(byId);
    const bySlug = candidates.filter(candidate => candidate.slug === selector);
    if (bySlug.length === 1) return bySlug[0];
    if (bySlug.length > 1) throw ambiguity(bySlug);
    throw laneNotFound(selector);
}

function validateFilter(value: string | undefined, name: string): void {
    if (value !== undefined && (value.length === 0 || value.length > MAX_SELECTOR_LENGTH ||
        /[\u0000-\u001f\u007f]/u.test(value) || SECRET_CONTEXT.test(value))) {
        throw createWatchtowerError('ERR_INVALID_ARGUMENT', {
            operation: 'select lane', target: `${name} selector`, remediation: 'Pass a non-empty safe selector.'
        });
    }
}

function containingLanes(candidates: readonly DiscoveredLane[], cwd: string): DiscoveredLane[] {
    const canonicalCwd = canonicalizePath(cwd);
    return candidates.filter(candidate => contains(candidate.laneDir, canonicalCwd));
}

function contains(root: string, candidate: string): boolean {
    const difference = relative(root, candidate);
    return difference === '' || (difference !== '..' && !difference.startsWith(`..${sep}`) && !isAbsolute(difference));
}

function ambiguity(candidates: readonly DiscoveredLane[]): WatchtowerError {
    const summary = candidates.map(candidateSummary).join('; ');
    return createWatchtowerError('ERR_AMBIGUOUS_SELECTION', {
        operation: 'select lane',
        target: bounded(summary),
        remediation: 'Pass --lane with one listed lane ID or relevant slug.'
    });
}

function candidateSummary(candidate: DiscoveredLane): string {
    return [candidate.laneId, candidate.slug, candidate.initiativeId, candidate.kind, candidate.controlHome]
        .map(safeDiagnosticField).join('|');
}

function safeDiagnosticField(value: string): string {
    return value.replace(/[\u0000-\u001f\u007f]/gu, '?').replaceAll(':', '%3A').replaceAll('=', '%3D');
}

function bounded(value: string): string {
    if (value.length <= 200) return value;
    return `${value.slice(0, MAX_SELECTOR_LENGTH - TRUNCATED_SUFFIX.length)}${TRUNCATED_SUFFIX}`;
}

function laneNotFound(target: string): WatchtowerError {
    return createWatchtowerError('ERR_LANE_NOT_FOUND', {
        operation: 'select lane', target: bounded(target), remediation: 'Choose a discovered lane ID or relevant slug.'
    });
}

function compareLanes(left: DiscoveredLane, right: DiscoveredLane): number {
    return left.controlHome.localeCompare(right.controlHome) || left.slug.localeCompare(right.slug) ||
        left.laneId.localeCompare(right.laneId);
}
