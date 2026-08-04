import {buildPackIndexRows} from '../../../src/foundation/packIndex/packIndexRowBuilder.js';
import type {PackIndexManifestDocument} from '../../../src/foundation/packIndex/packIndexJsonReaders.js';
import type {ConsumedPack} from '../../../src/contracts/index.js';

const PACK: ConsumedPack = Object.freeze({
    packId: 'watchtower-v1', initiativeId: 'watchtower-v1', packRepository: 'nirvana',
    manifestDigest: 'sha256:0'.padEnd(71, '0') as `sha256:${string}`,
    acceptanceDigest: 'sha256:0'.padEnd(71, '0') as `sha256:${string}`,
    sealId: 'sha256:0'.padEnd(71, '0') as `sha256:${string}`,
    reviewedCommit: 'a'.repeat(40), repositories: ['nirvana'],
    sealedFiles: [
        {path: 'work-batches/B1.md', sha256: 'sha256:1'.padEnd(71, '0') as `sha256:${string}`, bytes: 10},
        {path: 'review-batches/B1.md', sha256: 'sha256:2'.padEnd(71, '0') as `sha256:${string}`, bytes: 10}
    ],
    acceptedInputs: [], sourceBaselines: [], claimPaths: []
});

function document(overrides: Partial<PackIndexManifestDocument> = {}): PackIndexManifestDocument {
    return {
        packId: 'watchtower-v1', packRepository: 'nirvana',
        artifacts: {
            readme: 'implementation-map.md', traceability: 'requirements-traceability.md', implementationMap: 'implementation-map.md',
            qualityRules: 'implementation-quality-and-agent-rules.md', roadmap: 'implementation-roadmap.md',
            tracker: 'implementation-tracker.md', acceptance: 'pack-acceptance.json', seal: 'implementation-pack.lock.json'
        },
        repositories: [{id: 'nirvana', role: 'primary', access: 'write'}],
        requirements: [{id: 'REQ-1', repository: 'nirvana', source: 'requirements-traceability.md', workBatches: ['B1'], reviewBatches: ['B1']}],
        batches: [{
            id: 'B1', title: 'Batch one', dependsOn: [], primaryRepository: 'nirvana', workBrief: 'work-batches/B1.md',
            reviewBrief: 'review-batches/B1.md', requirements: ['REQ-1'],
            repositories: [{id: 'nirvana', access: 'write', claimMode: 'exclusive-write', paths: ['src/**']}],
            implementationReasoning: 'R5', reviewReasoning: 'R5', workload: 'large', proofClasses: ['unit'], proofInputs: []
        }],
        ...overrides
    };
}

function rejection(result: ReturnType<typeof buildPackIndexRows>) {
    if ('repository' in result) throw new Error('expected a rejection');
    return result;
}

describe('buildPackIndexRows — valid manifest', function () {
    it('builds the closed table registry with the expected row shapes', function () {
        const rows = buildPackIndexRows(document(), PACK);
        if (!('repository' in rows)) throw new Error(`unexpected rejection: ${rows.reason}`);
        expect(rows.repository).toEqual([{id: 'nirvana', role: 'primary', access: 'write'}]);
        expect(rows.batch).toEqual([{
            id: 'B1', title: 'Batch one', primary_repository: 'nirvana', work_brief: 'work-batches/B1.md',
            review_brief: 'review-batches/B1.md', implementation_reasoning: 'R5', review_reasoning: 'R5', workload: 'large'
        }]);
        expect(rows.dependency).toEqual([]);
        expect(rows.batch_requirement).toEqual([
            {batch_id: 'B1', requirement_id: 'REQ-1', relation: 'review'},
            {batch_id: 'B1', requirement_id: 'REQ-1', relation: 'work'}
        ]);
        expect(rows.batch_repository).toEqual([{batch_id: 'B1', repository_id: 'nirvana', access: 'write', claim_mode: 'exclusive-write', paths: '["src/**"]'}]);
        expect(rows.proof).toEqual([{id: 'B1::class::0', batch_id: 'B1', kind: 'class', proof_class: 'unit', repository: null, path: null, optional: null}]);
        expect(rows.artifact.map((row) => row.ref).sort()).toEqual(['nirvana:review-batches/B1.md', 'nirvana:work-batches/B1.md']);
    });
});

describe('buildPackIndexRows — adversarial identifier graph', function () {
    it('rejects a duplicate repository id', function () {
        const doc = document({repositories: [{id: 'nirvana', role: 'primary', access: 'write'}, {id: 'nirvana', role: 'dup', access: 'read'}]});
        expect(rejection(buildPackIndexRows(doc, PACK)).reason).toBe('PACK_INDEX_ENTITY_INVALID');
    });

    it('rejects a batch dependsOn referencing an undeclared batch', function () {
        const base = document();
        const doc = document({batches: [{...base.batches[0], dependsOn: ['B-MISSING']}]});
        const result = rejection(buildPackIndexRows(doc, PACK));
        expect(result.reason).toBe('PACK_INDEX_ENTITY_INVALID');
        expect(result.target).toBe('B-MISSING');
    });

    it('rejects a batch primaryRepository referencing an undeclared repository', function () {
        const base = document();
        const doc = document({batches: [{...base.batches[0], primaryRepository: 'ghost'}]});
        expect(rejection(buildPackIndexRows(doc, PACK)).reason).toBe('PACK_INDEX_ENTITY_INVALID');
    });

    it('rejects a requirement whose workBatches references an undeclared batch', function () {
        const doc = document({requirements: [{id: 'REQ-1', repository: 'nirvana', source: 'x.md', workBatches: ['B-MISSING'], reviewBatches: []}]});
        expect(rejection(buildPackIndexRows(doc, PACK)).reason).toBe('PACK_INDEX_ENTITY_INVALID');
    });

    it('rejects a batch.requirements entry the requirement does not declare as a work or review batch', function () {
        const base = document();
        const doc = document({
            requirements: [{id: 'REQ-1', repository: 'nirvana', source: 'x.md', workBatches: [], reviewBatches: []}],
            batches: [{...base.batches[0], requirements: ['REQ-1']}]
        });
        const result = rejection(buildPackIndexRows(doc, PACK));
        expect(result.reason).toBe('PACK_INDEX_ENTITY_INVALID');
        expect(result.target).toBe('B1:REQ-1');
    });

    it('rejects a duplicate batch repository claim', function () {
        const base = document();
        const doc = document({
            batches: [{
                ...base.batches[0],
                repositories: [
                    {id: 'nirvana', access: 'write', claimMode: 'exclusive-write', paths: ['src/**']},
                    {id: 'nirvana', access: 'read', claimMode: 'read', paths: ['docs/**']}
                ]
            }]
        });
        expect(rejection(buildPackIndexRows(doc, PACK)).reason).toBe('PACK_INDEX_ENTITY_INVALID');
    });

    it('rejects a proof input referencing an undeclared repository', function () {
        const base = document();
        const doc = document({batches: [{...base.batches[0], proofInputs: [{repository: 'ghost', path: 'x.md', optional: false}]}]});
        expect(rejection(buildPackIndexRows(doc, PACK)).reason).toBe('PACK_INDEX_ENTITY_INVALID');
    });
});
