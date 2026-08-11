import {chmodSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {DoctorKernel} from '../../../src/foundation/doctor/index.js';
import {
    coordinatorCursorCheck, coordinatorQueueCheck, DoctorCoordinatorProjectionSource
} from '../../../src/foundation/doctor/index.js';
import {nodeLaneDiscoveryFileSystem} from '../../../src/foundation/discovery/index.js';
import type {DoctorCheckProvider} from '../../../src/foundation/doctor/index.js';
import type {DoctorCheck} from '../../../src/contracts/index.js';
import {createLane, createReadCommandFixture, treeSnapshot} from '../../basic/readCommandFixtures.js';
import {
    coordinatorDir, cursorDocument, entry, queueDocument, reservation, trigger, writeCursor, writeJournal, writeQueue
} from './support/coordinatorDoctorFixtures.js';

async function runCheck(provider: DoctorCheckProvider, controlHome: string): Promise<DoctorCheck> {
    const report = await new DoctorKernel([provider]).run({cwd: controlHome});
    return report.checks[0];
}

function laneDirOf(controlHome: string): string {
    return join(controlHome, '.watchtower', 'lanes', 'lane-a');
}

describe('CA-31 coordinator queue doctor provider', function () {
    it('skips a lane that has never written a queue projection and never creates one', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const before = treeSnapshot(fixture.root);
            const check = await runCheck(coordinatorQueueCheck, fixture.controlHome);
            expect(check.id).toBe('coordinator-queue');
            expect(check.status).toBe('skip');
            expect(check.reason).toBeNull();
            expect(check.message).toContain('has not run a judgment cycle');
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('passes a consistent projection and leaves every authoritative byte unchanged', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const laneDir = laneDirOf(fixture.controlHome);
            writeQueue(laneDir, queueDocument({entries: [entry(trigger(), 0)], nextSequenceNumber: 1}));
            const before = treeSnapshot(fixture.root);
            const check = await runCheck(coordinatorQueueCheck, fixture.controlHome);
            expect(check.status).toBe('pass');
            expect(check.message).toContain('1 queued trigger(s)');
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('warns, without failing, on unsettled reservations and recorded holds', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            writeQueue(laneDirOf(fixture.controlHome), queueDocument({
                reservations: [reservation()], activeCycleId: 'cycle-9',
                holds: [{blockerId: 'blocker-1', scope: 'impact-scoped', batchIds: ['CA-31'], recordedAt: '2026-08-11T10:04:00.000Z'}]
            }));
            const check = await runCheck(coordinatorQueueCheck, fixture.controlHome);
            expect(check.status).toBe('warn');
            expect(check.message).toContain('cycle-9');
            expect(check.message).toContain('blocker-1');
        } finally { fixture.remove(); }
    });

    it('fails malformed, foreign-lane, duplicate-event, overrun-sequence, and double-claimed projections', async function () {
        const cases: Array<{readonly document: unknown; readonly fragment: string}> = [
            {document: '{not json', fragment: 'invalid'},
            {document: queueDocument({laneId: '22222222-2222-4222-8222-222222222222'}), fragment: 'invalid'},
            {
                document: queueDocument({
                    entries: [entry(trigger(), 0), entry(trigger({triggerId: 'trig-2'}), 1)], nextSequenceNumber: 2
                }),
                fragment: 'Durable event event-1 produced more than one queued trigger'
            },
            {
                document: queueDocument({entries: [entry(trigger(), 7)], nextSequenceNumber: 1}),
                fragment: 'not below the lane\'s next sequence'
            },
            {
                document: queueDocument({
                    entries: [entry(trigger(), 0)], nextSequenceNumber: 1,
                    reservations: [reservation({cycleId: 'cycle-1', triggerId: 'trig-1'})], activeCycleId: 'cycle-1'
                }),
                fragment: 'both queued and claimed'
            },
            {
                document: queueDocument({activeCycleId: 'cycle-orphan'}),
                fragment: 'has no durable open-cycle reservation'
            }
        ];
        for (const {document, fragment} of cases) {
            const fixture = createReadCommandFixture();
            try {
                createLane(fixture, {packAvailable: false});
                const laneDir = laneDirOf(fixture.controlHome);
                if (typeof document === 'string') writeFileSync(join(coordinatorDir(laneDir), 'queue.json'), document);
                else writeQueue(laneDir, document);
                const before = treeSnapshot(fixture.root);
                const check = await runCheck(coordinatorQueueCheck, fixture.controlHome);
                expect(check.status).withContext(fragment).toBe('fail');
                expect(check.reason).withContext(fragment).toBe('ERR_INTEGRITY_FAILURE');
                expect(check.message).withContext(fragment).toContain(fragment);
                expect(treeSnapshot(fixture.root)).withContext(fragment).toBe(before);
            } finally { fixture.remove(); }
        }
    });

    it('fails closed on an unreadable projection instead of reporting an empty queue', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const path = join(coordinatorDir(laneDirOf(fixture.controlHome)), 'queue.json');
            writeFileSync(path, JSON.stringify(queueDocument()));
            chmodSync(path, 0o000);
            const check = await runCheck(coordinatorQueueCheck, fixture.controlHome);
            chmodSync(path, 0o600);
            expect(check.status).toBe('fail');
            expect(check.reason).toBe('ERR_INTEGRITY_FAILURE');
        } finally { fixture.remove(); }
    });
});

describe('CA-31 coordinator cursor doctor provider', function () {
    it('skips a lane with no cursor projection', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const check = await runCheck(coordinatorCursorCheck, fixture.controlHome);
            expect(check.status).toBe('skip');
        } finally { fixture.remove(); }
    });

    it('passes an initial cursor and a cursor anchored exactly at the journal end', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const laneDir = laneDirOf(fixture.controlHome);
            writeCursor(laneDir, cursorDocument({
                journalIdentity: null, lastProcessedEventId: null, lastProcessedSequence: -1,
                lastByteOffset: 0, journalByteLength: 0, prefixDigest: null
            }));
            expect((await runCheck(coordinatorCursorCheck, fixture.controlHome)).status).toBe('pass');

            writeJournal(laneDir, 'x'.repeat(16));
            writeCursor(laneDir, cursorDocument());
            const anchored = await runCheck(coordinatorCursorCheck, fixture.controlHome);
            expect(anchored.status).toBe('pass');
            expect(anchored.message).toContain('sequence 4');
        } finally { fixture.remove(); }
    });

    it('warns when the journal has grown past the anchor and fails when it shrank below it', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const laneDir = laneDirOf(fixture.controlHome);
            writeCursor(laneDir, cursorDocument());
            writeJournal(laneDir, 'x'.repeat(64));
            const behind = await runCheck(coordinatorCursorCheck, fixture.controlHome);
            expect(behind.status).toBe('warn');
            expect(behind.message).toContain('48 byte(s)');

            writeJournal(laneDir, 'x'.repeat(4));
            const truncated = await runCheck(coordinatorCursorCheck, fixture.controlHome);
            expect(truncated.status).toBe('fail');
            expect(truncated.reason).toBe('ERR_INTEGRITY_FAILURE');
            expect(truncated.message).toContain('truncated or rewritten');
        } finally { fixture.remove(); }
    });

    it('fails a journal that shrank below the recorded advance checkpoint even while still past the anchor (correction-01)', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const laneDir = laneDirOf(fixture.controlHome);
            // lastByteOffset 50 < observed 60 < journalByteLength 100: larger than the
            // anchor, so the lag path would have accepted it, but smaller than the length
            // recorded at the last advance, which an append-only journal can never be.
            writeCursor(laneDir, cursorDocument({lastByteOffset: 50, journalByteLength: 100}));
            writeJournal(laneDir, 'x'.repeat(60));
            const before = treeSnapshot(fixture.root);
            const check = await runCheck(coordinatorCursorCheck, fixture.controlHome);
            expect(check.status).toBe('fail');
            expect(check.reason).toBe('ERR_INTEGRITY_FAILURE');
            expect(check.message).toContain('truncated or rewritten');
            expect(check.message).toContain('60 bytes');
            expect(check.message).toContain('100-byte length');
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('keeps the lag warning only at or above the recorded advance checkpoint', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const laneDir = laneDirOf(fixture.controlHome);
            writeCursor(laneDir, cursorDocument({lastByteOffset: 50, journalByteLength: 100}));
            writeJournal(laneDir, 'x'.repeat(100));
            const atCheckpoint = await runCheck(coordinatorCursorCheck, fixture.controlHome);
            expect(atCheckpoint.status).toBe('warn');
            expect(atCheckpoint.message).toContain('50 byte(s)');

            writeJournal(laneDir, 'x'.repeat(99));
            expect((await runCheck(coordinatorCursorCheck, fixture.controlHome)).status).toBe('fail');
        } finally { fixture.remove(); }
    });

    it('fails a cursor that claims progress with no journal, and every self-contradicting anchor', async function () {
        const cases: Array<{readonly document: unknown; readonly fragment: string; readonly journal?: string}> = [
            {document: cursorDocument(), fragment: 'the coordinator journal it addresses is absent'},
            {document: cursorDocument({journalIdentity: null}), fragment: 'without a journal identity'},
            {document: cursorDocument({prefixDigest: null}), fragment: 'without an anchor prefix digest'},
            {
                document: cursorDocument({lastProcessedEventId: null, journalIdentity: null, prefixDigest: null}),
                fragment: 'no event yet still records a non-zero journal offset'
            },
            {document: cursorDocument({lastByteOffset: 64}), fragment: 'is past the journal length'}
        ];
        for (const {document, fragment, journal} of cases) {
            const fixture = createReadCommandFixture();
            try {
                createLane(fixture, {packAvailable: false});
                const laneDir = laneDirOf(fixture.controlHome);
                writeCursor(laneDir, document);
                if (journal !== undefined) writeJournal(laneDir, journal);
                const check = await runCheck(coordinatorCursorCheck, fixture.controlHome);
                expect(check.status).withContext(fragment).toBe('fail');
                expect(check.message).withContext(fragment).toContain(fragment);
            } finally { fixture.remove(); }
        }
    });
});

describe('CA-31 doctor coordinator projection source', function () {
    it('exposes no way to create or replace a projection', function () {
        const source = new DoctorCoordinatorProjectionSource(nodeLaneDiscoveryFileSystem) as unknown as Record<string, unknown>;
        expect(Object.keys(source).filter(key => /write|ensure|repair|rebuild/i.test(key))).toEqual([]);
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const laneDir = laneDirOf(fixture.controlHome);
            const before = treeSnapshot(fixture.root);
            const projections = new DoctorCoordinatorProjectionSource(nodeLaneDiscoveryFileSystem);
            expect(projections.queue(laneDir, '11111111-1111-4111-8111-111111111111').kind).toBe('absent');
            expect(projections.cursor(laneDir, '11111111-1111-4111-8111-111111111111').kind).toBe('absent');
            expect(projections.journalByteLength(laneDir)).toBeNull();
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });
});
