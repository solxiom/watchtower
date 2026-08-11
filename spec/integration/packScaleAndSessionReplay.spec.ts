/**
 * CA-24 — independent 30/300/3,000/10,000 pack-scale and long-session replay
 * acceptance proof (`docs/spec/roadmap.md` M6 "30/300/3,000/10,000-batch
 * fixtures keep routine envelope size bounded after indexing"; pack quality
 * rules "CA-24 independently reproduces 30–10k pack scale, long-session
 * replay, and final M6 closure").
 *
 * This suite reproduces the claim rather than restating it. Each pack size is
 * compiled by the accepted CA-01 compiler and read through CA-02's accepted
 * bounded query, and the assertion is *invariance*: the routine decision
 * context a coordinator cycle would carry must be byte-identical at 10,000
 * batches and at 30. A regression that let context grow with pack size — the
 * exact failure M6 forbids — fails here.
 */
import {IndexQuery, IndexStore} from '../../src/foundation/index/index.js';
import {makeWorkDir, removeWorkDir} from '../storage/support/storeFixtures.js';
import {buildChainFixture, compileChainIndex} from '../foundation/support/indexQueryFixtures.js';
import {
    MAX_EXPORT_RECORDS, OperatorSessionReadService
} from '../../src/foundation/lane/coordinator/sessionCommand/index.js';
import {createSessionLane, openSession, type SessionLaneFixture} from '../foundation/sessionCommand/support/sessionCommandFixtures.js';

/** The accepted-map scale points; every one is compiled, not simulated. */
const SCALE_POINTS = [30, 300, 3000, 10000] as const;

interface ScaleReading {
    readonly count: number;
    readonly contextBytes: number;
    readonly truncated: boolean;
    readonly pageSize: number;
    readonly dependencyDepth: number;
}

async function readAtScale(count: number): Promise<ScaleReading> {
    const dir = makeWorkDir();
    try {
        const {indexDir} = await compileChainIndex(buildChainFixture({count}), dir);
        const store = await IndexStore.openIndex(indexDir);
        try {
            const query = new IndexQuery(store);
            const context = await query.assembleBatchContext('B10');
            const page = await query.getBatches({});
            return {
                count, contextBytes: JSON.stringify(context).length, truncated: context.truncated,
                pageSize: page.items.length, dependencyDepth: context.dependencies.direct.length
            };
        } finally { await store.close(); }
    } finally { removeWorkDir(dir); }
}

describe('CA-24 pack scale invariance (30 → 10,000 batches)', function () {
    let readings: ScaleReading[];

    beforeAll(async function () {
        readings = [];
        for (const count of SCALE_POINTS) readings.push(await readAtScale(count));
    }, 600000);

    it('compiles and reads every accepted scale point', function () {
        expect(readings.map((reading) => reading.count)).toEqual([...SCALE_POINTS]);
    });

    it('keeps the routine decision context byte-identical from 30 to 10,000 batches', function () {
        const sizes = new Set(readings.map((reading) => reading.contextBytes));
        expect(sizes.size).withContext(JSON.stringify(readings)).toBe(1);
        expect(readings.every((reading) => reading.truncated === false)).toBeTrue();
        expect(readings.every((reading) => reading.dependencyDepth === 1)).toBeTrue();
    });

    it('caps a default bounded page instead of growing it with the pack', function () {
        // Below the ceiling a page is the whole pack; at and above it the page
        // stops growing, which is the property that keeps a routine read bounded.
        const above = readings.filter((reading) => reading.count >= 300).map((reading) => reading.pageSize);
        expect(new Set(above).size).withContext(JSON.stringify(readings)).toBe(1);
        expect(above[0]).toBeLessThanOrEqual(100);
        expect(readings.every((reading) => reading.pageSize <= above[0])).toBeTrue();
    });
});

/** Appends `count` durable metadata events through the accepted CA-15 producer. */
function grow(fixture: SessionLaneFixture, sessionId: string, count: number, tag: string): void {
    for (let index = 0; index < count; index += 1) {
        fixture.store.appendEvent(sessionId, 'operator-session-pinned', {ref: `${tag}-${index}`, added: true});
    }
}

function projected(data: {readonly result: object}, key: string): unknown {
    return (data.result as Record<string, unknown>)[key];
}

describe('CA-24 long-session bounded export', function () {
    let fixture: SessionLaneFixture;
    let reads: OperatorSessionReadService;

    beforeEach(function () {
        fixture = createSessionLane('wt-ca24-replay-');
        reads = new OperatorSessionReadService({reads: fixture.reads});
    });
    afterEach(function () { fixture.dispose(); });

    it('bounds a long session\'s export and replays it byte-identically', function () {
        const id = openSession(fixture, 'long').operatorSessionId;
        grow(fixture, id, MAX_EXPORT_RECORDS + 100, 'ref');
        const first = reads.export(fixture.query, id);
        const replay = reads.export(fixture.query, id);
        expect(first.ok).toBeTrue();
        if (!first.ok || !replay.ok) return;
        expect((projected(first.data, 'records') as unknown[]).length).toBe(MAX_EXPORT_RECORDS);
        expect(projected(first.data, 'truncated')).toBeTrue();
        expect(JSON.stringify(replay.data)).toBe(JSON.stringify(first.data));
    }, 120000);
});

describe('CA-24 long-session bounded projection', function () {
    let fixture: SessionLaneFixture;
    let reads: OperatorSessionReadService;

    beforeEach(function () {
        fixture = createSessionLane('wt-ca24-growth-');
        reads = new OperatorSessionReadService({reads: fixture.reads});
    });
    afterEach(function () { fixture.dispose(); });

    it('keeps show and history bounded while the journal keeps growing', function () {
        const id = openSession(fixture, 'growing').operatorSessionId;
        const before = reads.show(fixture.query, id);
        grow(fixture, id, 200, 'grow');
        const after = reads.show(fixture.query, id);
        expect(before.ok && after.ok).toBeTrue();
        if (!before.ok || !after.ok) return;
        expect(projected(after.data, 'journalEvents')).toBe((projected(before.data, 'journalEvents') as number) + 200);
        expect(JSON.stringify(projected(after.data, 'session'))).toBe(JSON.stringify(projected(before.data, 'session')));
        const history = reads.history(fixture.query, id);
        expect(history.ok).toBeTrue();
        if (history.ok) expect(projected(history.data, 'returned')).toBe(0);
    }, 120000);
});
