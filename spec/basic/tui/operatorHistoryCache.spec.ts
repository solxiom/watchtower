import {existsSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {OperatorHistoryCache} from '../../../src/foundation/presentation/OperatorHistoryCache.js';
import {CONVERSATION_LIMITS} from '../../../src/contracts/tuiConversation.js';
import type {ComposerDraftIdentity} from '../../../src/contracts/tuiConversation.js';

const identity: ComposerDraftIdentity = {laneId: 'lane-1', operatorSessionId: 'opsess-1', attachmentOwner: 'kavan'};
const sibling: ComposerDraftIdentity = {laneId: 'lane-1', operatorSessionId: 'opsess-2', attachmentOwner: 'kavan'};
const otherLane: ComposerDraftIdentity = {laneId: 'lane-2', operatorSessionId: 'opsess-9', attachmentOwner: 'kavan'};
const draftFile = (root: string, who: ComposerDraftIdentity): string => join(root, 'ui-drafts', 'v1', who.laneId, who.operatorSessionId, `${who.attachmentOwner}.json`);
const temporaryRoot = (): string => mkdtempSync(join(tmpdir(), 'wt-ca20-'));

describe('CA-20 operator history cache', () => {
    it('keys history to one lane and session so no entry replays into another', () => {
        const root = temporaryRoot();
        try {
            const cache = new OperatorHistoryCache({dataRoot: root});
            cache.remember(identity, 'mine only');
            cache.remember(sibling, 'theirs only');
            expect(cache.retainedHistory(identity)).toEqual(['mine only']);
            expect(cache.retainedHistory(sibling)).toEqual(['theirs only']);
            expect(cache.historySearch(sibling, 'mine')).toEqual([]);
            expect(cache.historyPrevious(sibling)).toBe('theirs only');
            expect(cache.historyPrevious(sibling)).toBeNull();
        } finally { rmSync(root, {recursive: true, force: true}); }
    });

    it('keys history to the attachment owner so one owner never replays another', () => {
        const root = temporaryRoot();
        try {
            const cache = new OperatorHistoryCache({dataRoot: root});
            const other = {...identity, attachmentOwner: 'second-owner'};
            cache.remember(identity, 'owner one text');
            cache.remember(other, 'owner two text');
            expect(cache.retainedHistory(identity)).toEqual(['owner one text']);
            expect(cache.retainedHistory(other)).toEqual(['owner two text']);
            expect(cache.historySearch(other, 'owner one')).toEqual([]);
            expect(cache.historyPrevious(other)).toBe('owner two text');
            expect(cache.historyPrevious(other)).toBeNull();
        } finally { rmSync(root, {recursive: true, force: true}); }
    });

    it('treats a NaN lowered history limit as the hard maximum', () => {
        const root = temporaryRoot();
        try {
            const cache = new OperatorHistoryCache({dataRoot: root, historyEntries: Number.NaN});
            for (let index = 0; index < CONVERSATION_LIMITS.historyEntries + 25; index += 1) cache.remember(identity, `entry ${index}`);
            expect(cache.retainedHistory(identity).length).toBe(CONVERSATION_LIMITS.historyEntries);
        } finally { rmSync(root, {recursive: true, force: true}); }
    });

    it('bounds history by entry count, entry bytes, and age', () => {
        const root = temporaryRoot();
        try {
            let now = Date.parse('2026-08-01T00:00:00.000Z');
            const cache = new OperatorHistoryCache({dataRoot: root, historyEntries: 3, clock: () => new Date(now)});
            for (const text of ['one', 'two', 'three', 'four']) cache.remember(identity, text);
            cache.remember(identity, '   ');
            expect(cache.retainedHistory(identity)).toEqual(['four', 'three', 'two']);

            cache.remember(identity, 'x'.repeat(CONVERSATION_LIMITS.historyEntryBytes + 1));
            expect(cache.retainedHistory(identity).some((entry) => entry.length > CONVERSATION_LIMITS.historyEntryBytes)).toBeFalse();

            expect(cache.historyPrevious(identity)).toBe('four');
            expect(cache.historyPrevious(identity)).toBe('three');
            expect(cache.historyNext(identity)).toBe('four');
            cache.historyReset(identity);
            expect(cache.historyPrevious(identity)).toBe('four');
            expect(cache.historySearch(identity, 't')).toEqual(['three', 'two']);
            expect(cache.historySearch(identity, 'x'.repeat(257))).toEqual([]);
            expect(cache.historySearch(identity, '  ')).toEqual([]);

            now += CONVERSATION_LIMITS.historyTtlMs + 1000;
            expect(cache.retainedHistory(identity)).toEqual([]);
            expect(cache.historySearch(identity, 'four')).toEqual([]);
        } finally { rmSync(root, {recursive: true, force: true}); }
    });

    it('caps total retained history bytes across entries', () => {
        const root = temporaryRoot();
        try {
            const cache = new OperatorHistoryCache({dataRoot: root});
            const chunk = 'y'.repeat(CONVERSATION_LIMITS.historyEntryBytes - 4);
            for (let index = 0; index < 100; index += 1) cache.remember(identity, `${index}${chunk}`);
            const bytes = cache.retainedHistory(identity).reduce((total, entry) => total + entry.length, 0);
            expect(bytes).toBeLessThanOrEqual(CONVERSATION_LIMITS.historyTotalBytes);
            expect(cache.retainedHistory(identity).length).toBeLessThan(100);
        } finally { rmSync(root, {recursive: true, force: true}); }
    });

    it('purges matching history whenever the durable draft is discarded, pruned, or purged', async () => {
        const root = temporaryRoot();
        try {
            let now = Date.parse('2026-08-01T00:00:00.000Z');
            const cache = new OperatorHistoryCache({dataRoot: root, clock: () => new Date(now)});
            await cache.save(identity, 'draft body');
            cache.remember(identity, 'secret question');
            await cache.discard(identity);
            expect(cache.retainedHistory(identity)).toEqual([]);
            expect(existsSync(draftFile(root, identity))).toBeFalse();

            await cache.save(sibling, 'another draft');
            cache.remember(sibling, 'another question');
            cache.remember(otherLane, 'unrelated lane');
            const purged = await cache.purgeLane('lane-1');
            expect(purged.historyPurged).toBe(1);
            expect(cache.retainedHistory(sibling)).toEqual([]);
            expect(cache.retainedHistory(otherLane)).toEqual(['unrelated lane']);
            expect(existsSync(draftFile(root, sibling))).toBeFalse();

            await cache.save(identity, 'expiring draft');
            cache.remember(identity, 'expiring question');
            now += 8 * 24 * 60 * 60 * 1000;
            const pruned = await cache.prune();
            expect(pruned.expired).toBe(1);
            expect(pruned.historyPurged).toBeGreaterThan(0);
            expect(cache.retainedHistory(identity)).toEqual([]);
        } finally { rmSync(root, {recursive: true, force: true}); }
    });

    it('removes drafts and history for a disabled recovery only after explicit confirmation', async () => {
        const root = temporaryRoot();
        try {
            const cache = new OperatorHistoryCache({dataRoot: root});
            await cache.save(identity, 'still here');
            cache.remember(identity, 'still remembered');
            const unconfirmed = await cache.disableRecovery(false);
            expect(unconfirmed.blocked).toBeTrue();
            expect(existsSync(draftFile(root, identity))).toBeTrue();
            expect(cache.retainedHistory(identity)).toEqual(['still remembered']);

            const confirmed = await cache.disableRecovery(true);
            expect(confirmed.remaining).toBe(0);
            expect(confirmed.historyPurged).toBe(1);
            expect(existsSync(draftFile(root, identity))).toBeFalse();
            expect(cache.retainedHistory(identity)).toEqual([]);
        } finally { rmSync(root, {recursive: true, force: true}); }
    });
});
