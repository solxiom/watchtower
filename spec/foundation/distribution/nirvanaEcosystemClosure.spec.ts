import {mkdir, symlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {NirvanaClosureError} from '../../../src/contracts/nirvanaClosure.js';
import {NirvanaClosureFileStore} from '../../../src/foundation/distribution/NirvanaClosureFileStore.js';
import {NirvanaEcosystemClosureResolver} from '../../../src/foundation/distribution/NirvanaEcosystemClosureResolver.js';
import {
    addEscapingComponentLink,
    addVendorDependency,
    makeClosureSandbox,
    writeJson,
    type ClosureSandbox
} from './support/closureFixtures.js';

describe('NirvanaEcosystemClosureResolver', () => {
    const files = new NirvanaClosureFileStore();
    const resolver = new NirvanaEcosystemClosureResolver(files);
    let sandbox: ClosureSandbox;

    beforeEach(async () => {
        sandbox = await makeClosureSandbox();
    });

    afterEach(async () => {
        await sandbox.remove();
    });

    it('resolves the nira-selected version from a portable custom versions root', async () => {
        const closure = await resolver.resolve({projectRoot: sandbox.projectRoot, versionsRoot: sandbox.versionsRoot});

        expect(closure.ecosystemVersion).toBe('1.0.0-alpha');
        expect(closure.versionsRootProvenance).toBe('<custom-versions-root>');
        expect(closure.watchtower.dependencies).toEqual([{name: '@nirvana/base', version: '1.0.0'}]);
        expect(closure.packages.map(item => item.packageData.name)).toEqual(['@nirvana/base']);
        expect(closure.packages[0].sourceSha256).toMatch(/^sha256:[0-9a-f]{64}$/);

        const relocated = await makeClosureSandbox();
        try {
            const second = await resolver.resolve({projectRoot: relocated.projectRoot, versionsRoot: relocated.versionsRoot});
            expect(second.ecosystemManifestSha256).toBe(closure.ecosystemManifestSha256);
        } finally {
            await relocated.remove();
        }
    });

    it('closes and normalizes an ecosystem-contained vendor dependency', async () => {
        await addVendorDependency(sandbox);

        const closure = await resolver.resolve({projectRoot: sandbox.projectRoot, versionsRoot: sandbox.versionsRoot});

        expect(closure.packages.map(item => item.packageData.name)).toEqual(['@nirvana/base', 'renatus']);
        expect(closure.packages[0].bundledDependencies).toEqual([{name: 'renatus', version: '1.1.0'}]);
        expect(closure.packages[0].normalizedDependencies).toEqual({renatus: '1.1.0'});
    });

    it('rejects missing components and package identity mismatches with stable reasons', async () => {
        await writeJson(sandbox.versionRoot, 'ecosystem-manifest.json', {
            version: '1.0.0-alpha',
            components: {}
        });
        await expectReason('MISSING_COMPONENT');

        await writeJson(sandbox.versionRoot, 'ecosystem-manifest.json', {
            version: '1.0.0-alpha',
            components: {base: {packageName: '@nirvana/base', packageVersion: '1.0.0', path: 'components/base'}}
        });
        await writeJson(path.join(sandbox.versionRoot, 'components', 'base'), 'package.json', {
            name: '@nirvana/not-base', version: '1.0.0'
        });
        await expectReason('PACKAGE_IDENTITY_MISMATCH');
    });

    it('rejects wildcard and workspace dependencies before producing closure output', async () => {
        for (const spec of ['*', 'workspace:*']) {
            await writeJson(sandbox.projectRoot, 'package.json', {
                name: 'watchtower', version: '0.1.0', dependencies: {'@nirvana/base': spec}
            });
            await expectReason('UNSAFE_DEPENDENCY_SPEC');
        }
    });

    it('rejects component traversal, source symlinks, and links escaping the ecosystem root', async () => {
        await addEscapingComponentLink(sandbox);
        await expectReason('ECOSYSTEM_ROOT_INVALID');

        const fresh = await makeClosureSandbox();
        await sandbox.remove();
        sandbox = fresh;
        const sourceLink = path.join(sandbox.versionRoot, 'components', 'base', 'linked.js');
        await symlink('/tmp', sourceLink);
        await expectReason('SOURCE_LINK');
    });

    it('rejects stale ecosystem version evidence and corrupt source JSON', async () => {
        await writeJson(sandbox.versionRoot, 'ecosystem-manifest.json', {version: '9.9.9', components: {}});
        await expectReason('ECOSYSTEM_VERSION_MISMATCH');

        await writeFile(path.join(sandbox.versionRoot, 'ecosystem-manifest.json'), '{broken', 'utf8');
        await expectReason('MALFORMED_MANIFEST');
    });

    it('rejects an installed-prefix symlink that resolves to a source tree', async () => {
        const prefix = path.join(sandbox.root, 'prefix');
        await mkdir(prefix);
        await symlink(sandbox.versionRoot, path.join(prefix, 'source-link'), 'dir');

        try {
            await files.assertNoEscapingSymlinks(prefix, [sandbox.versionRoot]);
            fail('Expected installed link validation to fail.');
        } catch (error: unknown) {
            expect(error instanceof NirvanaClosureError).toBeTrue();
            if (error instanceof NirvanaClosureError) expect(error.reason).toBe('INSTALLED_LINK');
        }
    });

    async function expectReason(reason: string): Promise<void> {
        try {
            await resolver.resolve({projectRoot: sandbox.projectRoot, versionsRoot: sandbox.versionsRoot});
            fail('Expected ecosystem closure resolution to fail.');
        } catch (error: unknown) {
            expect(error instanceof NirvanaClosureError).toBeTrue();
            if (error instanceof NirvanaClosureError) expect(error.reason).toBe(reason);
        }
    }
});
