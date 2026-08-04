/**
 * Builds a compiled CA-01 pack index with an arbitrary number of batches in a
 * linear dependency chain (`B2` depends on `B1`, `B3` depends on `B2`, ...),
 * so CA-02 specs can exercise pagination, filters, and depth-limited
 * dependency traversal against a realistically sized index without hand
 * authoring one fixture per batch count.
 */
import {join} from 'node:path';
import {PackIndexCompiler, consumePack} from '../../../src/foundation/pack/index.js';
import type {PackIndexCompileRequest} from '../../../src/foundation/pack/index.js';
import type {ConsumedPack, PackIndexCompileResult} from '../../../src/contracts/index.js';
import {buildPackFixture, deps, fakeFileSystem, realValidators, PACK_ROOT, type PackFixture} from '../fixtures/packFixture.js';

const LANE_ID = '9d0ee3d2-8833-4fb7-b112-8438f04f57d2';

export interface ChainOptions {
    readonly count: number;
    readonly requirementId?: string;
}

function chainManifest(options: ChainOptions): Record<string, unknown> {
    const requirementId = options.requirementId ?? 'REQ-1';
    const batches = Array.from({length: options.count}, (_unused, index) => {
        const number = index + 1;
        const id = `B${number}`;
        return {
            id, title: `Batch ${number}`, dependsOn: number > 1 ? [`B${number - 1}`] : [],
            primaryRepository: 'nirvana', workBrief: 'work-batches/B1.md', reviewBrief: 'review-batches/B1.md',
            requirements: [requirementId],
            repositories: [{id: 'nirvana', access: 'write', paths: ['src/**'], claimMode: 'exclusive-write'}],
            implementationReasoning: number % 2 === 0 ? 'R3' : 'R5', reviewReasoning: 'R5',
            workload: number % 3 === 0 ? 'small' : 'large', proofClasses: ['unit'],
            proofInputs: number === 1 ? [{repository: 'nirvana', path: 'docs/spec/source-input.md', optional: false}] : []
        };
    });
    return {
        repositories: [{id: 'nirvana', role: 'primary', access: 'write'}],
        requirements: [{id: requirementId, repository: 'nirvana', source: 'requirements-traceability.md', workBatches: batches.map((b) => b.id), reviewBatches: ['B1']}],
        batches
    };
}

export function buildChainFixture(options: ChainOptions): PackFixture {
    return buildPackFixture({manifest: chainManifest(options)});
}

async function acceptedPack(fixture: PackFixture): Promise<ConsumedPack> {
    const result = await consumePack(fixture.context, deps(fixture));
    if (!result.ok) throw new Error(`fixture pack was rejected: ${result.reason}`);
    return result.pack;
}

function requestFor(pack: ConsumedPack, indexRoot: string): PackIndexCompileRequest {
    return {pack, packRoot: PACK_ROOT, packPath: 'docs/spec/implementation/watchtower-v1', laneId: LANE_ID, indexRoot};
}

function accepted(result: PackIndexCompileResult) {
    if (!result.ok) throw new Error(`unexpected compile rejection ${result.reason}: ${result.detail}`);
    return result;
}

/** Compiles `fixture` into a fresh generation under `indexRoot` and returns its published `<index-id>/` directory. */
export async function compileChainIndex(fixture: PackFixture, indexRoot: string): Promise<{readonly indexDir: string; readonly pack: ConsumedPack}> {
    const pack = await acceptedPack(fixture);
    const compiler = new PackIndexCompiler({fs: fakeFileSystem(fixture), validators: realValidators()});
    const result = accepted(await compiler.compile(requestFor(pack, indexRoot)));
    return {indexDir: result.indexDir, pack};
}

export function generationDir(indexRoot: string, indexId: string): string {
    return join(indexRoot, indexId);
}
