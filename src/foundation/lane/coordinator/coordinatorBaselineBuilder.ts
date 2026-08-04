/**
 * Composes the verified policy files and empty durable roots into one
 * side-effect-free `CoordinatorBaselineLayout`. Pure planning only: actual
 * materialization is `TransactionalWriter.commitLane` (LC-03), which this
 * capsule's output is shaped to compose into (`directories`/`files` join
 * directly onto a `LaneLayout`).
 *
 * `composeLaneLayoutWithCoordinatorBaseline` performs that join against
 * LC-03's own accepted public `LaneLayout` contract — the sole composition
 * owner `TransactionalWriter.commitLane` accepts. This capsule does not
 * write to `laneLayoutPlanner.ts` or any command (foreign-batch territory;
 * no batch has yet wired an `init --apply` effect path), but its output is
 * proven reachable by merging directly onto a real `LaneLayout` value rather
 * than only a standalone fixture.
 */
import {join} from 'node:path';
import {createWatchtowerError} from '../../../contracts/errors.js';
import {buildContextPolicyDocument} from './contextPolicyBaseline.js';
import type {CoordinatorBaselineInputs, CoordinatorBaselineLayout, LaneLayout} from './coordinatorBaselineContracts.js';
import {buildDurableRoots} from './durableRootsPlanner.js';
import {nodeKnowledgeProvenanceHost} from './knowledgeProvenanceHost.js';
import {buildRoutingPolicyDocument} from './routingPolicyProjection.js';
import type {LaneFile} from '../store/laneStoreContracts.js';

export function buildCoordinatorBaseline(inputs: CoordinatorBaselineInputs): CoordinatorBaselineLayout {
    const {plan, dataHome, knowledgePort = nodeKnowledgeProvenanceHost} = inputs;
    const installedKnowledge = knowledgePort.resolve(dataHome);
    const coordinatorRouting = jsonFile(plan.laneDir, 'coordinator-routing.json', plan.routing);
    const routingPolicy = jsonFile(plan.laneDir, 'routing-policy.json',
        buildRoutingPolicyDocument(plan.routing, plan.routingProvenance, installedKnowledge));
    const contextPolicy = jsonFile(plan.laneDir, 'context-policy.json', buildContextPolicyDocument(installedKnowledge));
    const roots = buildDurableRoots(plan.laneDir);
    return Object.freeze({
        directories: roots.directories,
        files: Object.freeze([coordinatorRouting, routingPolicy, contextPolicy, ...roots.files])
    });
}

/**
 * Merges this batch's owned baseline into an already-built `LaneLayout`
 * (`laneLayoutPlanner.buildLaneLayout`, LC-03). Rejects a directory this
 * batch's own roots did not plan being pre-declared by the base layout and
 * any file path collision, so a future LC-03 directory/file addition that
 * accidentally overlaps this batch's owned names fails closed instead of
 * silently shadowing one side.
 */
export function composeLaneLayoutWithCoordinatorBaseline(laneLayout: LaneLayout, baseline: CoordinatorBaselineLayout): LaneLayout {
    const existingDirs = new Set(laneLayout.dirs);
    for (const dir of baseline.directories) {
        if (existingDirs.has(dir)) {
            throw integrityFailure(dir, 'A coordinator-baseline directory duplicates one the base lane layout already declares.');
        }
    }
    const existingFilePaths = new Set(laneLayout.files.map(file => file.path));
    for (const file of baseline.files) {
        if (existingFilePaths.has(file.path)) {
            throw integrityFailure(file.path, 'A coordinator-baseline file duplicates one the base lane layout already declares.');
        }
    }
    return Object.freeze({
        laneDir: laneLayout.laneDir,
        dirs: Object.freeze([...laneLayout.dirs, ...baseline.directories]),
        files: Object.freeze([...laneLayout.files, ...baseline.files]),
        links: laneLayout.links
    });
}

function jsonFile(laneDir: string, name: string, document: unknown): LaneFile {
    return Object.freeze({path: join(laneDir, 'coordinator', name), content: `${JSON.stringify(document, null, 2)}\n`});
}

function integrityFailure(target: string, remediation: string) {
    return createWatchtowerError('ERR_INTEGRITY_FAILURE', {operation: 'compose coordinator baseline into lane layout', target, remediation});
}
