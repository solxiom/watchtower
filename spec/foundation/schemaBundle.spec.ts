import {loadV1SchemaBundle} from '../../src/foundation/schemaComposition/schemaBundle.js';

const ID = 'https://nirvana.dev/watchtower/spec/v1.schema.json';

function schema(value: unknown): string {
    return JSON.stringify(value);
}

describe('v1 schema runtime-asset boundary', function () {
    it('accepts only the RM-13 aggregate identity with both envelope definitions', function () {
        const result = loadV1SchemaBundle(() => schema({
            $id: ID, $defs: {commandResult: {}, commandError: {}}
        }));

        expect(result.ok).toBeTrue();
    });

    it('maps unreadable, malformed, wrong-id, and missing-definition assets to integrity failures', function () {
        const invalidReaders = [
            () => { throw new Error('unreadable'); },
            () => '{',
            () => schema({$id: 'https://example.invalid/schema', $defs: {commandResult: {}, commandError: {}}}),
            () => schema({$id: ID, $defs: {commandResult: {}}})
        ];

        for (const reader of invalidReaders) {
            const result = loadV1SchemaBundle(reader);
            expect(result.ok).toBeFalse();
            if (result.ok === false) expect(result.error.code).toBe('ERR_INTEGRITY_FAILURE');
        }
    });
});
