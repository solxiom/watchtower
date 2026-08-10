import {parseExplicitReference, ReferencePicker, referenceToken} from '../../../src/presentation/tui/ReferencePicker.js';
import {ConversationError} from '../../../src/contracts/tuiConversation.js';
import type {ExplicitReference, ReferenceResolution, ReferenceResolutionPort} from '../../../src/contracts/tuiConversation.js';

const resolution = (reference: ExplicitReference, overrides: Partial<ReferenceResolution> = {}): ReferenceResolution => ({
    reference, title: `title ${reference.value}`, excerpt: 'excerpt', excerptBytes: 7,
    revision: 3, stale: false, authorized: true, transitive: false, ...overrides
});

class FakeResolver implements ReferenceResolutionPort {
    readonly seen: ExplicitReference[] = [];
    constructor(private readonly answer: (reference: ExplicitReference) => ReferenceResolution | ConversationError | Error) {}
    async resolve(reference: ExplicitReference, _signal: AbortSignal): Promise<ReferenceResolution> {
        this.seen.push(reference);
        const answer = this.answer(reference);
        if (answer instanceof Error) throw answer;
        return answer;
    }
}

const signal = (): AbortSignal => new AbortController().signal;
const failureOf = async (work: Promise<unknown>): Promise<ConversationError> => (await work.catch((cause: unknown) => cause)) as ConversationError;

describe('CA-20 reference picker', () => {
    it('accepts exactly the normative @ grammar and round-trips its operator token', async () => {
        const resolver = new FakeResolver((reference) => resolution(reference));
        const picker = new ReferencePicker(resolver);
        const forms: readonly [string, string][] = [
            ['@batch:B14', 'batch'], ['@event:evt-772', 'event'], ['@finding:B14:F3', 'finding'],
            ['@req:REQ-42', 'requirement'], ['@turn:3', 'turn'], ['@session:opsess-9b2e:turn:5', 'session'],
            ['@file:docs/spec/v1.md', 'file']
        ];
        for (const [raw, refKind] of forms) {
            const resolved = await picker.resolve(raw, signal());
            expect(resolved.reference.refKind).withContext(raw).toBe(refKind as never);
            expect(resolved.reference.raw).toBe(raw);
            expect(picker.insertion(resolved)).withContext(raw).toBe(raw);
            expect(referenceToken(resolved.reference)).toBe(raw);
            expect(picker.insertion(resolved)).not.toContain('excerpt');
        }
        expect(resolver.seen.length).toBe(7);
    });

    it('rejects the unprefixed form and every malformed value shape', () => {
        const cases: readonly string[] = [
            'batch:B14', '@batch', '@batch:', '@:B14', '@requirement:REQ-42', '@finding:B14',
            '@turn:0', '@turn:abc', '@session:opsess-9b2e', '@session:opsess-9b2e:turn:x', '@nope:CA-20'
        ];
        for (const raw of cases) {
            const parsed = parseExplicitReference(raw);
            expect(parsed instanceof ConversationError).withContext(raw).toBeTrue();
            expect((parsed as ConversationError).reason).withContext(raw).toBe('REFERENCE_SYNTAX_INVALID');
        }
        expect(parseExplicitReference('@finding:B14:F3')).toEqual({refKind: 'finding', value: 'B14:F3', raw: '@finding:B14:F3'} as never);
    });

    it('refuses traversal, absolute, backslash, control, and over-long references before the resolver runs', async () => {
        const resolver = new FakeResolver((reference) => resolution(reference));
        const picker = new ReferencePicker(resolver);
        const attacks: readonly [string, string][] = [
            ['@file:../../etc/shadow', 'REFERENCE_PATH_ESCAPE'],
            ['@file:/etc/shadow', 'REFERENCE_PATH_ESCAPE'],
            ['@file:..\\..\\secrets', 'REFERENCE_PATH_ESCAPE'],
            ['@file:docs/../../out', 'REFERENCE_PATH_ESCAPE'],
            ['@file:docs//v1.md', 'REFERENCE_SYNTAX_INVALID'],
            [`@file:${'a/'.repeat(300)}b`, 'REFERENCE_PATH_ESCAPE'],
            ['@batch:CA-20 evil', 'REFERENCE_SYNTAX_INVALID'],
            [`@batch:${'x'.repeat(400)}`, 'REFERENCE_SYNTAX_INVALID']
        ];
        for (const [raw, reason] of attacks) {
            const failure = await failureOf(picker.resolve(raw, signal()));
            expect(failure).withContext(raw).toBeInstanceOf(ConversationError);
            expect(failure.reason).withContext(raw).toBe(reason as never);
        }
        expect(resolver.seen).toEqual([]);
    });

    it('maps every resolver refusal to its typed reason and never presents unauthorized content', async () => {
        const refusals: readonly string[] = [
            'REFERENCE_DENIED', 'REFERENCE_SECRET_DENIED', 'REFERENCE_UNCOMMITTED', 'REFERENCE_PATH_ESCAPE', 'REFERENCE_NOT_FOUND'
        ];
        for (const thrown of refusals) {
            const picker = new ReferencePicker(new FakeResolver((reference) => new ConversationError(thrown as never, reference.raw, 'refused')));
            const failure = await failureOf(picker.resolve('@file:docs/spec/v1.md', signal()));
            expect(failure.reason).withContext(thrown).toBe(thrown as never);
        }
        const opaque = new ReferencePicker(new FakeResolver(() => new Error('ENOENT: no such file')));
        const failure = await failureOf(opaque.resolve('@file:docs/missing.md', signal()));
        expect(failure).toBeInstanceOf(ConversationError);
        expect(failure.reason).toBe('REFERENCE_NOT_FOUND');
        expect(failure.message).not.toContain('ENOENT');
    });

    it('refuses a malformed resolver result with a typed reason instead of a dereference error', async () => {
        const reference = {refKind: 'batch', value: 'CA-20', raw: '@batch:CA-20'};
        const complete = {reference, title: 'x', excerpt: 'x', excerptBytes: 1, revision: 1, stale: false, authorized: true, transitive: false};
        const malformed: readonly unknown[] = [
            null, 'resolution', 42, {}, {reference: null}, {reference: {}},
            {...complete, title: 1}, {...complete, excerpt: null}, {...complete, stale: 'no'},
            {...complete, revision: -1}, {...complete, revision: 'one'}, {...complete, excerptBytes: 'many'},
            {...complete, reference: {...reference, value: 'CA-21'}}
        ];
        for (const result of malformed) {
            const picker = new ReferencePicker(new FakeResolver(() => result as never));
            const failure = await failureOf(picker.resolve('@batch:CA-20', signal()));
            expect(failure).withContext(JSON.stringify(result)).toBeInstanceOf(ConversationError);
            expect(failure.reason).withContext(JSON.stringify(result)).toBe('REFERENCE_DENIED');
        }
    });

    it('rejects an unauthorized flag, a transitive capsule, and an over-limit excerpt', async () => {
        const unauthorized = new ReferencePicker(new FakeResolver((reference) => resolution(reference, {authorized: false as never})));
        await expectAsync(unauthorized.resolve('@batch:CA-20', signal())).toBeRejectedWithError(ConversationError, /not authorized/);

        const transitive = new ReferencePicker(new FakeResolver((reference) => resolution(reference, {transitive: true as never})));
        await expectAsync(transitive.resolve('@turn:1', signal())).toBeRejectedWithError(ConversationError, /never transitive/);

        const huge = new ReferencePicker(new FakeResolver((reference) => resolution(reference, {excerptBytes: 65537})));
        await expectAsync(huge.resolve('@file:docs/spec/v1.md', signal())).toBeRejectedWithError(ConversationError, /at most 65536 bytes/);
    });

    it('treats a malformed lowered excerpt limit as the hard maximum', async () => {
        const picker = new ReferencePicker(new FakeResolver((reference) => resolution(reference, {excerptBytes: 65537})), Number.NaN);
        await expectAsync(picker.resolve('@batch:CA-20', signal())).toBeRejectedWithError(ConversationError, /at most 65536 bytes/);
        const inside = new ReferencePicker(new FakeResolver((reference) => resolution(reference, {excerptBytes: 65536})), Number.NaN);
        expect((await inside.resolve('@batch:CA-20', signal())).excerptBytes).toBe(65536);
    });

    it('refuses ambiguity and emptiness instead of electing a candidate', async () => {
        const picker = new ReferencePicker(new FakeResolver((reference) => resolution(reference)));
        await expectAsync(picker.pickOne(['@batch:CA-20', '@batch:CA-21'], signal())).toBeRejectedWithError(ConversationError, /exactly one/);
        await expectAsync(picker.pickOne([' ', ''], signal())).toBeRejectedWithError(ConversationError, /No candidate/);
        const single = await picker.pickOne(['@batch:CA-20', '@batch:CA-20 '], signal());
        expect(single.reference.value).toBe('CA-20');

        const cancelled = new AbortController();
        cancelled.abort();
        await expectAsync(picker.resolve('@batch:CA-20', cancelled.signal)).toBeRejectedWithError(ConversationError, /cancelled/);
    });
});
