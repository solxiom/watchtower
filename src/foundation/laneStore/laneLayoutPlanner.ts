/**
 * Assembles the complete, side-effect-free `LaneLayout` (`docs/spec/v1.md`
 * §7.2) `TransactionalWriter.commitLane` materializes atomically. This is the
 * sole owner of the lane directory enumeration and of matching `InitPlan`'s
 * (LC-01) managed-link targets against the packaged runtime's declared,
 * checksummed assets; `InitPlan.directories` is a smaller LC-01 preview-only
 * projection (no `coordinator/journal`, no `coordinator/projections`) used
 * for dry-run reporting and is intentionally not reused here.
 */
import {join} from 'node:path';
import {createWatchtowerError} from '../../contracts/errors.js';
import {safePathTarget} from '../paths/index.js';
import {generateInstallManifest} from './installManifestGenerator.js';
import {generateLaneConfig} from './laneConfigGenerator.js';
import {generateLaneManifest} from './laneManifestGenerator.js';
import {generateRepositoriesLocal} from './repositoriesLocalGenerator.js';
import type {LaneFile, LaneLayout, LaneLayoutInputs, LaneManagedLink} from './laneStoreContracts.js';

const LANE_DIRECTORIES = [
    '',
    'bin',
    'state',
    'prompts',
    'reports',
    'budgets',
    'logs',
    'briefs',
    'coordinator',
    'coordinator/operator-sessions',
    'coordinator/amendment-requests',
    'coordinator/holds',
    'coordinator/journal',
    'coordinator/projections'
] as const;

export function buildLaneLayout(inputs: LaneLayoutInputs): LaneLayout {
    const {plan} = inputs;
    const laneDir = plan.laneDir;
    if (laneDir !== join(plan.controlHome, '.watchtower', 'lanes', plan.lane.slug)) {
        throw integrityFailure(laneDir, 'The plan lane directory does not match the canonical control-home/slug path.');
    }
    const dirs = LANE_DIRECTORIES.map(part => (part === '' ? laneDir : join(laneDir, part)));
    const links = resolveManagedLinks(inputs);
    const files = buildManifestFiles(inputs, links);
    return Object.freeze({laneDir, dirs: Object.freeze(dirs), files: Object.freeze(files), links: Object.freeze(links)}) as LaneLayout;
}

function resolveManagedLinks(inputs: LaneLayoutInputs): readonly LaneManagedLink[] {
    const bySha256 = new Map(inputs.runtimeRefs.map(ref => [ref.path, ref.sha256] as const));
    return inputs.plan.links.map(link => {
        const sha256 = bySha256.get(link.target);
        if (sha256 === undefined) {
            throw integrityFailure(link.target, 'Declare the managed-link target in the packaged runtime manifest.');
        }
        return Object.freeze({path: link.path, target: link.target, sha256});
    });
}

function buildManifestFiles(inputs: LaneLayoutInputs, links: readonly LaneManagedLink[]): readonly LaneFile[] {
    const {plan, pack} = inputs;
    const laneManifest = generateLaneManifest(plan, pack);
    const installManifest = generateInstallManifest(plan, links, inputs.install);
    const repositoriesLocal = generateRepositoriesLocal(plan);
    const laneConfig = generateLaneConfig(plan, pack);
    return [
        jsonFile(plan.laneDir, 'lane.json', laneManifest),
        jsonFile(plan.laneDir, 'install.json', installManifest),
        jsonFile(plan.laneDir, 'repositories.local.json', repositoriesLocal),
        {path: join(plan.laneDir, 'lane.config.env'), content: laneConfig}
    ];
}

function jsonFile(laneDir: string, name: string, document: unknown): LaneFile {
    return {path: join(laneDir, name), content: `${JSON.stringify(document, null, 2)}\n`};
}

function integrityFailure(target: string, remediation: string) {
    return createWatchtowerError('ERR_INTEGRITY_FAILURE', {operation: 'build lane layout', target: safePathTarget(target), remediation});
}
