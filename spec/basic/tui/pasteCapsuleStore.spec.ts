import {PasteCapsuleStore} from '../../../src/presentation/tui/PasteCapsuleStore.js';
import {CONVERSATION_LIMITS, utf8Bytes} from '../../../src/contracts/tuiConversation.js';

describe('CA-20 paste capsule store', () => {
    it('captures a reversible capsule whose placeholder carries counts only', () => {
        const store = new PasteCapsuleStore();
        const payload = 'line one\nline two\n'.repeat(50);
        const capsule = store.capture(payload);
        expect(capsule.reversible).toBeTrue();
        expect(capsule.truncated).toBeFalse();
        expect(capsule.bytes).toBe(utf8Bytes(payload));
        expect(capsule.lines).toBe(101);
        expect(utf8Bytes(capsule.preview)).toBeLessThanOrEqual(CONVERSATION_LIMITS.maxExcerptBytes);

        const placeholder = store.placeholder(capsule);
        expect(placeholder).toBe(`⟦paste-1: 101 lines, ${capsule.bytes} bytes⟧`);
        expect(placeholder).not.toContain('line one');
        expect(store.payload('paste-1')).toBe(payload);
        expect(store.expand(`before ${placeholder} after`)).toBe(`before ${payload} after`);
    });

    it('never retains an over-limit payload and marks the capsule irreversible', () => {
        const store = new PasteCapsuleStore();
        const huge = 'z'.repeat(CONVERSATION_LIMITS.maxPasteBytes + 1);
        const capsule = store.capture(huge);
        expect(capsule.truncated).toBeTrue();
        expect(capsule.reversible).toBeFalse();
        expect(store.payload(capsule.capsuleId)).toBeNull();
        expect(store.retainedBytes()).toBe(0);
        expect(store.expand(store.placeholder(capsule))).toBe(store.placeholder(capsule));
        expect(store.placeholder(capsule)).not.toContain('zzz');
    });

    it('keeps total retained payload bytes inside the declared budget', () => {
        const store = new PasteCapsuleStore(1000);
        const first = store.capture('a'.repeat(600));
        const second = store.capture('b'.repeat(600));
        expect(store.retainedBytes()).toBeLessThanOrEqual(1000);
        expect(store.payload(first.capsuleId)).toBeNull();
        expect(store.payload(second.capsuleId)).toBe('b'.repeat(600));
        expect(store.capsules().find((capsule) => capsule.capsuleId === first.capsuleId)?.reversible).toBeFalse();
        expect(store.capsules().length).toBe(2);
    });

    it('never retains a payload above a lowered budget and ignores a malformed one', () => {
        const lowered = new PasteCapsuleStore(500);
        const capsule = lowered.capture('a'.repeat(900));
        expect(capsule.reversible).toBeFalse();
        expect(capsule.truncated).toBeTrue();
        expect(lowered.payload(capsule.capsuleId)).toBeNull();
        expect(lowered.retainedBytes()).toBe(0);
        expect(lowered.retainedBytes()).toBeLessThanOrEqual(500);

        const malformed = new PasteCapsuleStore(Number.NaN);
        const big = malformed.capture('b'.repeat(CONVERSATION_LIMITS.maxPasteBytes + 1));
        expect(big.reversible).toBeFalse();
        expect(malformed.retainedBytes()).toBeLessThanOrEqual(CONVERSATION_LIMITS.maxPasteBytes);
        const fits = malformed.capture('c'.repeat(1000));
        expect(fits.reversible).toBeTrue();
    });

    it('forgets one payload and clears every payload at the privacy boundary', () => {
        const store = new PasteCapsuleStore();
        const capsule = store.capture('c'.repeat(800));
        store.forget(capsule.capsuleId);
        expect(store.payload(capsule.capsuleId)).toBeNull();
        expect(store.capsules()[0].reversible).toBeFalse();
        expect(store.capsules()[0].bytes).toBe(800);

        store.capture('d'.repeat(800));
        expect(store.retainedBytes()).toBe(800);
        store.clear();
        expect(store.capsules()).toEqual([]);
        expect(store.retainedBytes()).toBe(0);
    });
});
