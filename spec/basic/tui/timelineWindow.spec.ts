import {TimelineWindow} from '../../../src/presentation/tui/TimelineWindow.js';
import type {ConversationItem, ConversationPage, ConversationTombstoneItem} from '../../../src/contracts/tuiConversation.js';

function turn(sequence: number): ConversationItem {
    return {
        kind: 'turn', itemId: `t${sequence}`, sequence, turnId: `turn-${sequence}`, operatorSessionId: 'opsess-1',
        role: sequence % 2 === 0 ? 'operator' : 'watchtower', state: 'complete', decisionClass: 'M0',
        routingRuleId: null, endpointId: null, snapshotRevision: 4, stale: false, completedAt: '2026-08-10T00:00:00.000Z',
        excerpt: `body ${sequence}`, excerptBytes: 8, originalBytes: 8, incomplete: false,
        inputTokens: null, outputTokens: null, telemetryQuality: 'unavailable'
    };
}

function page(from: number, count: number, overrides: Partial<ConversationPage> = {}): ConversationPage {
    const items = Array.from({length: count}, (_unused, index) => turn(from + index));
    return {
        items, direction: 'older', pageSize: 25, olderCursor: 'older-1', newerCursor: 'newer-1',
        revision: 1, truncated: false, atOldestEdge: false, atLiveEdge: false, ...overrides
    };
}

const tombstone: ConversationTombstoneItem = {kind: 'tombstone', itemId: 'tomb-1', sequence: 12, removedTurns: 3, reason: 'compaction'};

describe('CA-20 timeline window virtualization', () => {
    it('handles empty, single, and large retained timelines within a viewport-proportional bound', () => {
        const empty = new TimelineWindow(10);
        expect(empty.visible()).toEqual([]);
        expect(empty.state().anchorItemId).toBeNull();
        expect(empty.oldest()).toBeNull();

        const single = new TimelineWindow(10);
        single.reduce({type: 'load', page: page(1, 1, {atOldestEdge: true, atLiveEdge: true})});
        expect(single.visible().length).toBe(1);
        expect(single.state().anchorItemId).toBe('t1');

        const large = new TimelineWindow(10);
        for (let batch = 0; batch < 40; batch += 1) large.reduce({type: 'load', page: page(1 + batch * 25, 25)});
        const state = large.state();
        expect(state.retainedCap).toBe(30);
        expect(state.retained).toBeLessThanOrEqual(state.retainedCap);
        expect(large.visible().length).toBe(10);
    });

    it('keeps the anchored item fixed across prepend, resize, and reflow', () => {
        const window = new TimelineWindow(10);
        window.reduce({type: 'load', page: page(100, 25)});
        window.reduce({type: 'anchor', itemId: 't110'});
        const before = window.visible().map((item) => item.itemId);
        expect(before[0]).toBe('t110');

        window.reduce({type: 'load', page: page(75, 25)});
        expect(window.state().anchorItemId).toBe('t110');
        expect(window.visible().map((item) => item.itemId)).toEqual(before);

        window.reduce({type: 'viewport', rows: 6});
        expect(window.state().anchorItemId).toBe('t110');
        expect(window.visible()[0].itemId).toBe('t110');
        expect(window.visible().length).toBe(6);
        expect(window.state().retained).toBeLessThanOrEqual(window.state().retainedCap);

        window.reduce({type: 'viewport', rows: 12});
        expect(window.visible()[0].itemId).toBe('t110');
    });

    it('preserves both edge flags from an initial older page that is already live', () => {
        const window = new TimelineWindow(10);
        window.reduce({type: 'load', page: page(1, 4, {atOldestEdge: true, atLiveEdge: true})});
        expect(window.state().atLiveEdge).toBeTrue();
        expect(window.state().atOldestEdge).toBeTrue();
        expect(window.state().followLive).toBeTrue();
    });

    it('follows the live edge only while anchored to it and preserves a scrolled anchor', () => {
        const window = new TimelineWindow(5);
        window.reduce({type: 'load', page: page(1, 10, {atLiveEdge: true})});
        expect(window.state().followLive).toBeTrue();
        expect(window.visible().map((item) => item.itemId)).toEqual(['t6', 't7', 't8', 't9', 't10']);

        window.reduce({type: 'load', page: page(11, 3, {direction: 'newer', atLiveEdge: true})});
        expect(window.state().anchorItemId).toBe('t13');

        window.reduce({type: 'scroll', delta: -6});
        expect(window.state().followLive).toBeFalse();
        const anchored = window.state().anchorItemId;
        window.reduce({type: 'load', page: page(14, 3, {direction: 'newer', atLiveEdge: true})});
        expect(window.state().anchorItemId).toBe(anchored);
    });

    it('re-anchors onto the compaction tombstone and drops a superseded page revision', () => {
        const window = new TimelineWindow(8);
        window.reduce({type: 'load', page: page(10, 8, {revision: 4})});
        window.reduce({type: 'anchor', itemId: 't12'});
        window.reduce({type: 'compact', removedItemIds: ['t11', 't12', 't13'], tombstone});
        expect(window.state().anchorItemId).toBe('tomb-1');
        expect(window.visible().some((item) => item.itemId === 'tomb-1')).toBeTrue();
        expect(window.visible().some((item) => item.itemId === 't12')).toBeFalse();

        const retained = window.state().retained;
        window.reduce({type: 'load', page: page(200, 4, {revision: 3})});
        expect(window.state().retained).toBe(retained);
        expect(window.state().revision).toBe(4);

        window.reduce({type: 'load', page: page(200, 4, {revision: 5})});
        expect(window.state().revision).toBe(5);
    });

    it('ignores duplicate items, unknown anchors, and out-of-range scrolls', () => {
        const window = new TimelineWindow(4);
        window.reduce({type: 'load', page: page(1, 4)});
        window.reduce({type: 'load', page: page(1, 4)});
        expect(window.state().retained).toBe(4);
        window.reduce({type: 'anchor', itemId: 'missing'});
        expect(window.state().anchorItemId).toBe('t4');
        window.reduce({type: 'scroll', delta: -999});
        expect(window.state().anchorItemId).toBe('t1');
        window.reduce({type: 'scroll', delta: 999});
        expect(window.state().anchorItemId).toBe('t4');
        expect(window.newest()?.itemId).toBe('t4');
    });
});
