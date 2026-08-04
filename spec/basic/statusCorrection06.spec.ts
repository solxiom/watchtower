import {StatusProjection} from '../../src/foundation/status/index.js';
import {createLane, createReadCommandFixture, type LaneFixtureOptions} from './readCommandFixtures.js';

describe('RM-12 correction 06', function () {
    it('rejects requirement coverage absent from the referenced batch requirements', async function () {
        await expectPackStatus({
            packRequirements: [
                {id: 'REQ-1', workBatches: ['WB-1'], reviewBatches: ['WB-1']},
                {id: 'REQ-2', workBatches: ['WB-1'], reviewBatches: ['WB-1']}
            ],
            packBatches: [batch('WB-1', ['REQ-2'])]
        }, 'invalid');
    });

    it('rejects a batch requirement absent from that requirement coverage', async function () {
        await expectPackStatus({
            packRequirements: [{id: 'REQ-1', workBatches: ['WB-1'], reviewBatches: ['WB-1']}],
            packBatches: [batch('WB-1', ['REQ-1']), batch('WB-2', ['REQ-1'])]
        }, 'invalid');
    });

    it('accepts a reciprocal multi-batch and multi-requirement graph', async function () {
        await expectPackStatus({
            packRequirements: [
                {id: 'REQ-1', workBatches: ['WB-1'], reviewBatches: ['WB-2']},
                {id: 'REQ-2', workBatches: ['WB-1', 'WB-2'], reviewBatches: ['WB-2']}
            ],
            packBatches: [batch('WB-1', ['REQ-1', 'REQ-2']), batch('WB-2', ['REQ-1', 'REQ-2'])]
        }, 'valid');
    });
});

function batch(id: string, requirements: readonly string[]) {
    return {id, requirements, workBrief: `work-batches/${id}.md`,
        reviewBrief: `review-batches/${id.replace(/^WB-/, 'RB-')}.md`};
}

async function expectPackStatus(options: LaneFixtureOptions, expected: 'valid' | 'invalid'): Promise<void> {
    const fixture = createReadCommandFixture();
    try {
        createLane(fixture, {lifecycle: 'paused', ...options});
        const result = await new StatusProjection({
            now: () => new Date('2026-08-01T10:05:00Z'),
            runtime: {observe(configured: string | null) { return {qualification: 'valid' as const,
                configured, installed: configured, available: configured !== null,
                availableVersions: configured === null ? [] : [configured]}; }},
            proofConflicts: {inspect: () => ({available: true, conflicts: []})},
            tmuxObserver: () => ({async listSessionNames() { return []; }})
        }).project({cwd: fixture.controlHome,
            environment: {WATCHTOWER_DATA_HOME: fixture.dataHome, PATH: '/usr/bin'}});
        expect(result.packIntegrity.status).toBe(expected);
    } finally { fixture.remove(); }
}
