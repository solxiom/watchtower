import {appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {JournalError, type DurableEvent} from '../../src/contracts/index.js';
import {JournalIndex} from '../../src/foundation/index/runtime/JournalIndex.js';
import {JournalProjection} from '../../src/foundation/index/runtime/JournalProjection.js';
import {JOURNAL_INDEX_SCHEMA, openJournalReader, openJournalStore} from '../../src/foundation/index/runtime/JournalWal.js';

function event(sequence: number, type = 'handoff', batchId = 'CA-03'): DurableEvent {
    return {
        schemaVersion: 1, eventId: `event-${sequence}`, type, sequence,
        at: `2026-08-05T00:00:0${sequence}.000Z`, laneId: 'lane-1', producer: 'test',
        correlationId: `corr-${sequence}`, causationId: null, policyVersion: 'v1', batchId,
        payload: {role: type === 'accept' ? 'reviewer' : 'implementer', batch: batchId, session: 's-1', commits: {repo: `commit-${sequence}`}}
    };
}

function writeEvent(path: string, value: DurableEvent, newline = true): number {
    const offset = readFileSync(path).byteLength;
    appendFileSync(path, JSON.stringify(value) + (newline ? '\n' : ''));
    return offset;
}

function fixture(): {root: string; journal: string; db: string} {
    const root = mkdtempSync(join(tmpdir(), 'wt-ca03-'));
    return {root, journal: join(root, 'events.jsonl'), db: join(root, 'runtime.sqlite')};
}

describe('JournalIndex', () => {
    it('incrementally appends, checkpoints, verifies, and projects through typed reads', async () => {
        const paths = fixture();
        writeFileSync(paths.journal, '');
        const index = await JournalIndex.open(paths.db, paths.journal);
        const reader = await openJournalReader(paths.db);
        try {
            for (let sequence = 0; sequence < 3; sequence += 1) {
                const value = event(sequence, sequence === 2 ? 'accept' : 'handoff');
                const offset = writeEvent(paths.journal, value);
                await index.appendEvents([value], [offset]);
                expect(await index.latestSequence()).toBe(sequence);
                expect(await reader.database.count('journal_event')).toBe(sequence + 1);
            }
            expect((await index.getCheckpoint()).lastSequence).toBe(2);
            expect(await index.verifyCheckpoint()).toBeTrue();
            expect(await reader.database.count('journal_event')).toBe(3);
            await reader.close();
            const projection = new JournalProjection(index);
            expect((await projection.projectBatchStatus('CA-03')).accepts).toEqual(['event-2']);
            expect((await projection.projectLaneSummary()).countsByType).toEqual({accept: 1, handoff: 2});
        } finally {
            await reader.close().catch(() => undefined);
            await index.close();
            rmSync(paths.root, {recursive: true, force: true});
        }
    });

    it('rejects duplicate event IDs without committing a second row or checkpoint', async () => {
        const eventTable = JOURNAL_INDEX_SCHEMA.find((table) => table.name === 'journal_event');
        const eventIdColumn = eventTable?.columns.find((column) => column.name === 'event_id');
        const eventIdIndex = eventTable?.indexes?.find((index) => index.columns.length === 1 && index.columns[0] === 'event_id');
        expect(eventIdColumn?.notNull).toBeTrue();
        expect(eventIdIndex?.unique).toBeTrue();

        const paths = fixture();
        writeFileSync(paths.journal, '');
        const index = await JournalIndex.open(paths.db, paths.journal);
        const first = event(0);
        const firstOffset = writeEvent(paths.journal, first);
        await index.appendEvents([first], [firstOffset]);
        const duplicate = {...event(1), eventId: first.eventId};
        const duplicateOffset = writeEvent(paths.journal, duplicate);
        try {
            await expectAsync(index.appendEvents([duplicate], [duplicateOffset])).toBeRejectedWithError(/UNIQUE|constraint|corrupt/i);
        } finally {
            await index.close();
        }

        const reader = await openJournalReader(paths.db);
        try {
            expect(await reader.database.count('journal_event')).toBe(1);
            expect(await reader.database.getByPrimaryKey('journal_event', 1)).toBeUndefined();
            const checkpoint = await reader.database.getByPrimaryKey('journal_checkpoint', 1);
            expect(Number(checkpoint?.last_sequence)).toBe(0);
            expect(checkpoint?.last_event_id).toBe(first.eventId);
        } finally {
            await reader.close();
            rmSync(paths.root, {recursive: true, force: true});
        }
    });

    it('fails closed after SQLite bytes are corrupted, then rebuilds equivalent state', async () => {
        const paths = fixture();
        writeFileSync(paths.journal, '');
        const index = await JournalIndex.open(paths.db, paths.journal);
        try {
            const first = event(0);
            const offset = writeEvent(paths.journal, first);
            await index.appendEvents([first], [offset]);
            expect(await index.readEvent(0)).not.toBeNull();
            const expectedEvents = (await index.readEvents(0, 10)).items;
            const expectedCheckpoint = await index.getCheckpoint();
            await index.close();
            writeFileSync(paths.db, Buffer.from('corrupt-runtime-sqlite'));
            const corrupted = await JournalIndex.open(paths.db, paths.journal);
            try {
                await expectAsync(corrupted.readEvent(0)).toBeRejectedWithError(JournalError, /unusable|corrupt|integrity/i);
                await expectAsync(corrupted.readLatestEvent()).toBeRejectedWithError(JournalError, /unusable|corrupt/i);
                await expectAsync(corrupted.detectCorruption()).toBeResolvedTo({ok: false, usable: false, details: ['index was previously marked unusable']});
                await corrupted.rebuildIndex();
                expect(await corrupted.readEvents(0, 10).then((page) => page.items)).toEqual(expectedEvents);
                expect(await corrupted.getCheckpoint()).toEqual(expectedCheckpoint);
                expect(await corrupted.verifyCheckpoint()).toBeTrue();
            } finally {
                await corrupted.close().catch(() => undefined);
            }
        } finally {
            await index.close().catch(() => undefined);
            rmSync(paths.root, {recursive: true, force: true});
        }
    });

    it('blocks a sequence gap and all later appends until staged rebuild', async () => {
        const paths = fixture();
        writeFileSync(paths.journal, '');
        const index = await JournalIndex.open(paths.db, paths.journal);
        try {
            const first = event(0);
            writeEvent(paths.journal, first);
            await index.appendEvents([first], [0]);
            const gap = event(2);
            const gapOffset = writeEvent(paths.journal, gap);
            await expectAsync(index.appendEvents([gap], [gapOffset])).toBeRejectedWithError(JournalError, /sequence/);
            const next = event(1);
            const nextOffset = writeEvent(paths.journal, next);
            await expectAsync(index.appendEvents([next], [nextOffset])).toBeRejectedWithError(JournalError, /rebuild/);
        } finally {
            await index.close();
            rmSync(paths.root, {recursive: true, force: true});
        }
    });

    it('detects a partial tail, rebuilds only the complete prefix, and preserves source bytes', async () => {
        const paths = fixture();
        writeFileSync(paths.journal, '');
        const index = await JournalIndex.open(paths.db, paths.journal);
        const first = event(0);
        writeEvent(paths.journal, first);
        await index.appendEvents([first], [0]);
        appendFileSync(paths.journal, '{"schemaVersion":1');
        const before = readFileSync(paths.journal);
        await expectAsync(index.appendEvents([event(1)], [before.byteLength])).toBeRejectedWithError(JournalError, /incomplete/);
        await index.rebuildIndex();
        expect(await index.latestSequence()).toBe(0);
        expect(readFileSync(paths.journal)).toEqual(before);
        await index.close();
        rmSync(paths.root, {recursive: true, force: true});
    });

    it('rejects malformed authoritative records without mutating the derived index', async () => {
        const paths = fixture();
        writeFileSync(paths.journal, '');
        const index = await JournalIndex.open(paths.db, paths.journal);
        try {
            const first = event(0);
            const offset = writeEvent(paths.journal, first);
            await index.appendEvents([first], [offset]);
            appendFileSync(paths.journal, '{not-json}\n');
            await expectAsync(index.appendEvents([event(1)], [offset + JSON.stringify(first).length + 1])).toBeRejectedWithError(JournalError, /valid JSON/i);
            expect(await index.latestSequence()).toBe(0);
        } finally {
            await index.close();
            rmSync(paths.root, {recursive: true, force: true});
        }
    });

    it('retries a failed rebuild idempotently and preserves authoritative bytes', async () => {
        const paths = fixture();
        const interrupted = join(paths.root, 'interrupted.jsonl');
        writeFileSync(paths.journal, '');
        const first = event(0);
        writeEvent(paths.journal, first);
        const before = readFileSync(paths.journal);
        const index = await JournalIndex.open(paths.db, paths.journal);
        try {
            await expectAsync(index.rebuildIndex(interrupted)).toBeRejectedWithError(JournalError, /does not exist/i);
            await index.rebuildIndex();
            const firstState = await index.getCheckpoint();
            await index.rebuildIndex();
            expect(await index.getCheckpoint()).toEqual(firstState);
            expect(readFileSync(paths.journal)).toEqual(before);
            expect(await index.verifyCheckpoint()).toBeTrue();
        } finally {
            await index.close();
            rmSync(paths.root, {recursive: true, force: true});
        }
    });

    it('retries staged rebuild after a publication-lock interruption', async () => {
        const paths = fixture();
        writeFileSync(paths.journal, '');
        const first = event(0);
        writeEvent(paths.journal, first);
        const index = await JournalIndex.open(paths.db, paths.journal);
        await index.close();
        const blocker = await openJournalStore(paths.db);
        try {
            await expectAsync(index.rebuildIndex(paths.journal, 25)).toBeRejected();
        } finally {
            await blocker.close();
        }
        try {
            await index.rebuildIndex();
            expect(await index.verifyCheckpoint()).toBeTrue();
        } finally {
            await index.close().catch(() => undefined);
            rmSync(paths.root, {recursive: true, force: true});
        }
    });

    it('refuses an unbounded batch projection and computes dependency-aware ready sets', async () => {
        const paths = fixture();
        writeFileSync(paths.journal, '');
        const index = await JournalIndex.open(paths.db, paths.journal);
        try {
            const events = Array.from({length: 201}, (_, sequence) => event(sequence));
            const offsets = events.map((value) => writeEvent(paths.journal, value));
            await index.appendEvents(events, offsets);
            const projection = new JournalProjection(index);
            await expectAsync(projection.projectBatchStatus('CA-03')).toBeRejectedWithError(JournalError, /bounded/i);
            await expectAsync(projection.projectReadySet(['CA-01'], [
                {id: 'CA-01', dependsOn: []}, {id: 'CA-02', dependsOn: ['CA-01']}, {id: 'CA-03', dependsOn: ['CA-99']}
            ])).toBeResolvedTo({pendingBatchIds: ['CA-02', 'CA-03'], readyBatchIds: ['CA-02'], blockedBatchIds: ['CA-03']});
        } finally {
            await index.close();
            rmSync(paths.root, {recursive: true, force: true});
        }
    });

    it('rebuilds a missing derived database from the authoritative journal', async () => {
        const paths = fixture();
        writeFileSync(paths.journal, '');
        for (let sequence = 0; sequence < 2; sequence += 1) writeEvent(paths.journal, event(sequence));
        const original = await JournalIndex.open(paths.db, paths.journal);
        await original.rebuildIndex();
        await original.close();
        rmSync(paths.db);
        const rebuilt = await JournalIndex.open(paths.db, paths.journal);
        try {
            await rebuilt.triggerStagedRebuild();
            expect(await rebuilt.latestSequence()).toBe(1);
            expect(existsSync(paths.db)).toBeTrue();
        } finally {
            await rebuilt.close();
            rmSync(paths.root, {recursive: true, force: true});
        }
    });
});
