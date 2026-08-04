import {appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {JournalError, type DurableEvent} from '../../src/contracts/index.js';
import {JournalIndex} from '../../src/foundation/index/runtime/JournalIndex.js';
import {JournalProjection} from '../../src/foundation/index/runtime/JournalProjection.js';
import {openJournalReader} from '../../src/foundation/index/runtime/JournalWal.js';

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
        try {
            for (let sequence = 0; sequence < 3; sequence += 1) {
                const value = event(sequence, sequence === 2 ? 'accept' : 'handoff');
                const offset = writeEvent(paths.journal, value);
                await index.appendEvents([value], [offset]);
                expect(await index.latestSequence()).toBe(sequence);
            }
            expect((await index.getCheckpoint()).lastSequence).toBe(2);
            expect(await index.verifyCheckpoint()).toBeTrue();
            const reader = await openJournalReader(paths.db);
            expect(await reader.database.count('journal_event')).toBe(3);
            await reader.close();
            const projection = new JournalProjection(index);
            expect((await projection.projectBatchStatus('CA-03')).accepts).toEqual(['event-2']);
            expect((await projection.projectLaneSummary()).totalEvents).toBe(3);
        } finally {
            await index.close();
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
