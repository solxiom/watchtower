import {existsSync, lstatSync, mkdirSync, readFileSync, symlinkSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import type {WatchtowerError} from '../../src/contracts/index.js';
import {resolveKnowledgeRoot} from '../../src/foundation/index.js';
import type {HostAdapter, ResolvedKnowledgePack} from '../../src/foundation/index.js';
import {createKnowledgePackFixture, destinationInventory, directoryHosts} from './skillInstallFixtures.js';

/**
 * The directory-host (Codex/Claude) `destination` root's own filesystem identity — not entries
 * inside it, which `skillInstallDirectoryTransaction.spec.ts` already covers — as untrusted input.
 * Two independent layers are exercised together here, since a real caller only ever reaches
 * `destination` through both: `resolveKnownDestination`'s existing `authorizePath` containment
 * check (`canonicalPaths.ts`) already rejects a destination symlink whose real target resolves
 * outside the authorized host base, or is dangling, at adapter-construction time. It does **not**
 * reject a destination symlink whose real target is still contained beneath the authorized base —
 * that gap is what `classifyManagedDestination` (`directoryInstallTransaction.ts`), the single
 * `lstat`-based boundary every entry point calls before touching `destination`, closes. All three
 * shapes are proved for every entry point, matching the consolidation gate's demand that
 * `destination` itself have a stated permitted entry type across the full transaction protocol.
 */
for (const host of directoryHosts) {
    describe(`${host.name} host adapter destination-root identity boundary`, function () {
        const entryPoints: ReadonlyArray<{
            readonly name: string; readonly invoke: (adapter: HostAdapter, pack: ResolvedKnowledgePack) => void;
        }> = [
            {name: 'preview()', invoke: (adapter, pack) => { adapter.preview(pack, 'full'); }},
            {name: 'install()', invoke: (adapter, pack) => { adapter.install(pack, 'full', {replace: true}); }},
            {name: 'getInstalledVersion()', invoke: (adapter) => { adapter.getInstalledVersion(); }}
        ];

        for (const entryPoint of entryPoints) {
            it(`fails closed with a registered path-escape reason when destination is a symlink resolving outside the authorized host base, via ${entryPoint.name}`, function () {
                const fixture = createKnowledgePackFixture();
                try {
                    const pack = resolveKnowledgeRoot(fixture.dataHome);
                    const destination = join(fixture.home, ...host.segments);
                    const outsideTarget = join(fixture.root, 'outside-destination-target');
                    mkdirSync(outsideTarget, {recursive: true});
                    writeFileSync(join(outsideTarget, 'secret.txt'), 'secret\n');
                    mkdirSync(dirname(destination), {recursive: true});
                    symlinkSync(outsideTarget, destination);
                    const outsideBefore = destinationInventory(outsideTarget);

                    expectCode(() => entryPoint.invoke(host.create(fixture.home), pack), 'ERR_PATH_ESCAPE');

                    expect(lstatSync(destination).isSymbolicLink()).withContext('destination symlink itself unchanged').toBeTrue();
                    expect(destinationInventory(outsideTarget)).withContext('outside target untouched').toEqual(outsideBefore);
                    expect(readFileSync(join(outsideTarget, 'secret.txt'), 'utf8')).toBe('secret\n');
                } finally { fixture.remove(); }
            });

            it(`fails closed with a registered path-escape reason when destination is a dangling symlink, via ${entryPoint.name}`, function () {
                const fixture = createKnowledgePackFixture();
                try {
                    const pack = resolveKnowledgeRoot(fixture.dataHome);
                    const destination = join(fixture.home, ...host.segments);
                    const nowhere = join(fixture.root, 'nowhere');
                    mkdirSync(dirname(destination), {recursive: true});
                    symlinkSync(nowhere, destination);

                    expectCode(() => entryPoint.invoke(host.create(fixture.home), pack), 'ERR_PATH_ESCAPE');

                    expect(lstatSync(destination).isSymbolicLink()).withContext('dangling destination symlink itself unchanged').toBeTrue();
                    expect(existsSync(nowhere)).withContext('dangling target still does not exist').toBeFalse();
                } finally { fixture.remove(); }
            });

            it(`fails closed with a registered path-escape reason when destination is a symlink whose real target is still contained beneath the authorized host base, via ${entryPoint.name}`, function () {
                const fixture = createKnowledgePackFixture();
                try {
                    const pack = resolveKnowledgeRoot(fixture.dataHome);
                    const destination = join(fixture.home, ...host.segments);
                    // A real target that passes `authorizePath`'s own containment check (its
                    // resolved realpath is still beneath `home`), so `host.create()` itself
                    // succeeds; only `classifyManagedDestination`, called by every entry point
                    // before it touches `destination`, can catch this shape.
                    const containedTarget = join(fixture.home, ...host.segments.slice(0, -1), 'other-real-dir');
                    mkdirSync(containedTarget, {recursive: true});
                    writeFileSync(join(containedTarget, 'secret.txt'), 'secret\n');
                    mkdirSync(dirname(destination), {recursive: true});
                    symlinkSync(containedTarget, destination);
                    const containedBefore = destinationInventory(containedTarget);

                    expectCode(() => entryPoint.invoke(host.create(fixture.home), pack), 'ERR_PATH_ESCAPE');

                    expect(lstatSync(destination).isSymbolicLink()).withContext('destination symlink itself unchanged').toBeTrue();
                    expect(destinationInventory(containedTarget)).withContext('contained symlink target untouched').toEqual(containedBefore);
                    expect(readFileSync(join(containedTarget, 'secret.txt'), 'utf8')).toBe('secret\n');
                } finally { fixture.remove(); }
            });

            it(`fails closed with a registered managed-conflict reason when destination itself is a plain regular file, via ${entryPoint.name}`, function () {
                const fixture = createKnowledgePackFixture();
                try {
                    const pack = resolveKnowledgeRoot(fixture.dataHome);
                    const destination = join(fixture.home, ...host.segments);
                    mkdirSync(dirname(destination), {recursive: true});
                    writeFileSync(destination, 'i am a regular file, not a managed directory\n');

                    expectCode(() => entryPoint.invoke(host.create(fixture.home), pack), 'ERR_MANAGED_CONFLICT');

                    expect(lstatSync(destination).isFile()).withContext('conflicting file untouched').toBeTrue();
                    expect(readFileSync(destination, 'utf8')).toBe('i am a regular file, not a managed directory\n');
                } finally { fixture.remove(); }
            });
        }
    });
}

function expectCode(action: () => unknown, code: string): void {
    try { action(); fail(`expected ${code}`); } catch (error) { expect((error as WatchtowerError).code).toBe(code); }
}
