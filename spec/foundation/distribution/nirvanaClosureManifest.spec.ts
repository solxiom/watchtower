import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {
    NirvanaClosureError,
    type NirvanaDependencyClosureManifest
} from '../../../src/contracts/nirvanaClosure.js';
import {NirvanaClosureManifestValidator} from '../../../src/foundation/distribution/NirvanaClosureManifestValidator.js';

describe('NirvanaClosureManifestValidator', () => {
    const validator = new NirvanaClosureManifestValidator();
    let source: NirvanaDependencyClosureManifest;

    beforeAll(async () => {
        source = JSON.parse(await readFile(
            path.join(process.cwd(), 'distribution', 'nirvanaDependencyClosure.json'),
            'utf8'
        )) as NirvanaDependencyClosureManifest;
    });

    it('accepts and deeply freezes the exact committed closure', () => {
        const manifest = validator.validate(source);

        expect(manifest.packages.map(item => item.name)).toEqual([
            '@nirvana/b-core',
            '@nirvana/base',
            '@nirvana/builder',
            '@nirvana/commons',
            '@nirvana/framework',
            '@nirvana/t-cache',
            'renatus'
        ]);
        expect(Object.isFrozen(manifest)).toBeTrue();
        expect(Object.isFrozen(manifest.packages[0].artifact)).toBeTrue();
    });

    it('rejects malformed, missing, and extra fields before graph validation', () => {
        const missing = clone(source) as unknown as Record<string, unknown>;
        delete missing.registry;
        expectReason(missing, 'MALFORMED_MANIFEST');

        const extra = clone(source) as unknown as Record<string, unknown>;
        extra.unexpected = true;
        expectReason(extra, 'MALFORMED_MANIFEST');
        expectReason('{not-json}', 'MALFORMED_MANIFEST');
    });

    it('rejects wildcard, range, local, and workspace package edges', () => {
        for (const unsafe of ['*', '^1.0.0', 'file:../base', 'workspace:*']) {
            const manifest = clone(source);
            Object.assign(manifest.watchtower.dependencies[0], {version: unsafe});
            expectReason(manifest, 'UNSAFE_DEPENDENCY_SPEC');
        }
    });

    it('rejects duplicate, mismatched, dangling, and unreachable identities', () => {
        const duplicate = clone(source);
        duplicate.packages[1].name = duplicate.packages[0].name;
        expectReason(duplicate, 'DUPLICATE_PACKAGE');

        const dangling = clone(source);
        dangling.packages[2].dependencies[1].version = '9.9.9';
        expectReason(dangling, 'INCOMPLETE_CLOSURE');

        const unreachable = clone(source);
        Object.assign(unreachable.packages[4], {
            dependencies: unreachable.packages[4].dependencies.filter(item => item.name !== 'renatus')
        });
        expectReason(unreachable, 'INCOMPLETE_CLOSURE');
    });

    it('rejects path traversal, uppercase digests, and undeclared registry channels', () => {
        const traversal = clone(source);
        traversal.packages[0].artifact.file = '../escape.tgz';
        expectReason(traversal, 'MALFORMED_MANIFEST');

        const digest = clone(source);
        digest.packages[0].artifact.sha256 = digest.packages[0].artifact.sha256.toUpperCase();
        expectReason(digest, 'MALFORMED_MANIFEST');

        const registry = clone(source);
        registry.registry.nirvana = 'packed-artifacts' as const;
        (registry.registry as unknown as {nirvana: string}).nirvana = 'public-registry';
        expectReason(registry, 'MALFORMED_MANIFEST');
    });

    function expectReason(value: unknown, reason: string): void {
        try {
            validator.validate(value);
            fail('Expected closure validation to fail.');
        } catch (error: unknown) {
            expect(error instanceof NirvanaClosureError).toBeTrue();
            if (error instanceof NirvanaClosureError) expect(error.reason).toBe(reason);
        }
    }
});

function clone<T>(value: T): T {
    return structuredClone(value);
}
