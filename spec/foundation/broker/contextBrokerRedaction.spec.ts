import {BrokerError} from '../../../src/foundation/broker/index.js';
import {digestContent, enforceByteLimit, estimateTokens, redactJsonValue, verifyExpectedDigest} from '../../../src/foundation/broker/index.js';

describe('redactJsonValue', function () {
    it('replaces a top-level sensitive-keyed value with the redaction marker', function () {
        const result = redactJsonValue({apiToken: 'sk-live-12345', title: 'Batch One'});
        expect(result.redacted).toBeTrue();
        expect(result.redactedKeys).toEqual(['apiToken']);
        expect((result.content as Record<string, unknown>).apiToken).toBe('[REDACTED]');
        expect((result.content as Record<string, unknown>).title).toBe('Batch One');
    });

    it('redacts at any nesting depth, inside both objects and arrays, while recursing through container keys that are not themselves sensitive', function () {
        const result = redactJsonValue({
            batch: {id: 'B1', auth: {password: 'hunter2', hint: 'ok'}},
            items: [{secretKey: 'x'}, {name: 'y'}]
        });
        const content = result.content as {batch: {auth: {password: string; hint: string}}; items: Array<Record<string, unknown>>};
        expect(content.batch.auth.password).toBe('[REDACTED]');
        expect(content.batch.auth.hint).toBe('ok');
        expect(content.items[0].secretKey).toBe('[REDACTED]');
        expect(content.items[1].name).toBe('y');
        expect([...result.redactedKeys].sort()).toEqual(['password', 'secretKey']);
    });

    it('redacts a whole sub-tree when the container key itself is sensitive-named, rather than only its leaves', function () {
        const result = redactJsonValue({credentials: {password: 'hunter2', apiToken: 'x'}, title: 'ok'});
        const content = result.content as {credentials: string; title: string};
        expect(content.credentials).toBe('[REDACTED]');
        expect(content.title).toBe('ok');
        expect(result.redactedKeys).toEqual(['credentials']);
    });

    it('reports redacted: false and an empty key list when nothing matches', function () {
        const result = redactJsonValue({id: 'B1', title: 'Batch One', requirements: ['REQ-1']});
        expect(result.redacted).toBeFalse();
        expect(result.redactedKeys).toEqual([]);
        expect(result.content as unknown).toEqual({id: 'B1', title: 'Batch One', requirements: ['REQ-1']});
    });

    it('is case-insensitive and matches partial key names, mirroring the shared sensitive-key contract', function () {
        const result = redactJsonValue({GITHUB_TOKEN: 'ghp_x', Password: 'p', displayName: 'v'});
        expect([...result.redactedKeys].sort()).toEqual(['GITHUB_TOKEN', 'Password']);
        expect((result.content as Record<string, unknown>).displayName).toBe('v');
    });

    it('matches a partial key name too, since "Key" alone is part of the shared pattern', function () {
        const result = redactJsonValue({normalKey: 'v'});
        expect(result.redactedKeys).toEqual(['normalKey']);
        expect((result.content as Record<string, unknown>).normalKey).toBe('[REDACTED]');
    });

    it('never mutates its input', function () {
        const input: {token: string; nested: {keep: number}} = {token: 'x', nested: {keep: 1}};
        const result = redactJsonValue(input);
        expect(input.token).toBe('x');
        expect(result.content as unknown).not.toBe(input);
    });

    it('passes through non-object primitives and arrays of primitives unchanged', function () {
        expect(redactJsonValue('plain string').content as unknown).toBe('plain string');
        expect(redactJsonValue(42).content as unknown).toBe(42);
        expect(redactJsonValue(null).content as unknown).toBeNull();
        expect(redactJsonValue([1, 2, 3]).content as unknown).toEqual([1, 2, 3]);
    });
});

describe('contextBrokerRedaction digest/byte-limit/token-estimate', function () {
    it('computes a stable sha256 digest independent of key order', function () {
        const first = digestContent({a: 1, b: 2});
        const second = digestContent({b: 2, a: 1});
        expect(first.digest).toBe(second.digest);
        expect(first.digest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    });

    it('computes a digest over the content it is given — callers must digest already-redacted content for the digest to reflect what is returned', function () {
        const raw = digestContent({secret: 'value'});
        const redacted = digestContent(redactJsonValue({secret: 'value'}).content);
        expect(raw.digest).not.toBe(redacted.digest);
    });

    it('computes a different digest and byte length for different content', function () {
        const small = digestContent({a: 1});
        const large = digestContent({a: 1, b: 'x'.repeat(500)});
        expect(small.digest).not.toBe(large.digest);
        expect(large.byteLength).toBeGreaterThan(small.byteLength);
    });

    it('passes silently when content is within the byte ceiling', function () {
        expect(() => enforceByteLimit('ref', 10, 100)).not.toThrow();
    });

    it('fails closed with BROKER_HARD_LIMIT_EXCEEDED rather than truncating, when content exceeds the byte ceiling', function () {
        try {
            enforceByteLimit('ref', 101, 100);
            fail('expected BrokerError');
        } catch (error) {
            expect(error).toBeInstanceOf(BrokerError);
            expect((error as InstanceType<typeof BrokerError>).reason).toBe('BROKER_HARD_LIMIT_EXCEEDED');
        }
    });

    it('rejects a non-positive maxBytes as malformed input', function () {
        expect(() => enforceByteLimit('ref', 1, 0)).toThrowError(BrokerError);
        expect(() => enforceByteLimit('ref', 1, -5)).toThrowError(BrokerError);
    });

    it('accepts a matching expected digest and rejects a mismatched one', function () {
        const {digest} = digestContent({a: 1});
        expect(() => verifyExpectedDigest('ref', digest, digest)).not.toThrow();
        expect(() => verifyExpectedDigest('ref', ('sha256:' + '0'.repeat(64)) as `sha256:${string}`, digest))
            .toThrowMatching((error: unknown) => error instanceof BrokerError && error.reason === 'BROKER_DIGEST_MISMATCH');
    });

    it('skips digest verification entirely when the caller supplied no expected digest', function () {
        const {digest} = digestContent({a: 1});
        expect(() => verifyExpectedDigest('ref', undefined, digest)).not.toThrow();
    });

    it('estimates tokens as a conservative deterministic function of byte length', function () {
        expect(estimateTokens(0)).toBe(0);
        expect(estimateTokens(4)).toBe(1);
        expect(estimateTokens(5)).toBe(2);
    });
});
