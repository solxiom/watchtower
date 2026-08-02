import {existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import type {WatchtowerError} from '../../src/contracts/index.js';
import {createCursorHostAdapter, resolveHostAdapter, resolveKnowledgeRoot} from '../../src/foundation/index.js';
import type {ResolvedKnowledgePack} from '../../src/foundation/index.js';
import {createKnowledgePackFixture, destinationInventory, directoryHosts} from './skillInstallFixtures.js';

describe('resolveKnowledgeRoot', function () {
    it('fails closed when WATCHTOWER_DATA_HOME has no knowledge version directory', function () {
        const fixture = createKnowledgePackFixture({omitManifest: true});
        try { expectCode(() => resolveKnowledgeRoot(fixture.dataHome), 'ERR_MISSING_DEPENDENCY'); }
        finally { fixture.remove(); }
    });

    it('resolves the single valid versioned pack and its manifest', function () {
        const fixture = createKnowledgePackFixture();
        try {
            const pack = resolveKnowledgeRoot(fixture.dataHome);
            expect(pack.version).toBe(fixture.version);
            expect(pack.root).toBe(fixture.packRoot);
            expect(pack.manifest.assets.map((asset) => asset.path).sort()).toEqual([
                'AGENTS.md', 'guides/README.md', 'guides/example.md', 'skill/AGENTS.md', 'skill/SKILL.md'
            ]);
        } finally { fixture.remove(); }
    });
});

describe('resolveHostAdapter', function () {
    it('rejects an unknown host with ERR_INVALID_ARGUMENT', function () {
        expectCode(() => resolveHostAdapter('unsupported-host'), 'ERR_INVALID_ARGUMENT');
    });

    it('resolves each supported v1 host', function () {
        expect(resolveHostAdapter('codex').host).toBe('codex');
        expect(resolveHostAdapter('cursor').host).toBe('cursor');
        expect(resolveHostAdapter('claude').host).toBe('claude');
    });
});

for (const host of directoryHosts) {
    describe(`${host.name} host adapter`, function () {
        it('previews the destination, source files, and empty overwrite set before any write', function () {
            const fixture = createKnowledgePackFixture();
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const preview = host.create(fixture.home).preview(pack, 'full');
                expect(preview.destination).toBe(join(fixture.home, ...host.segments));
                expect(preview.files.map((file) => file.sourcePath).sort()).toEqual([
                    'AGENTS.md', 'guides/README.md', 'guides/example.md', 'skill/AGENTS.md', 'skill/SKILL.md'
                ]);
                expect(preview.filesToOverwrite).toEqual([]);
                expect(preview.destinationExists).toBeFalse();
                expect(existsSync(preview.destination)).toBeFalse();
            } finally { fixture.remove(); }
        });

        it('detects an existing conflicting file in preview without writing', function () {
            const fixture = createKnowledgePackFixture();
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const destination = join(fixture.home, ...host.segments);
                mkdirSync(destination, {recursive: true});
                writeFileSync(join(destination, 'AGENTS.md'), 'stale\n');
                const preview = host.create(fixture.home).preview(pack, 'full');
                expect(preview.destinationExists).toBeTrue();
                expect(preview.filesToOverwrite).toEqual(['AGENTS.md']);
                expect(readFileSync(join(destination, 'AGENTS.md'), 'utf8')).toBe('stale\n');
            } finally { fixture.remove(); }
        });

        it('preview reports an existing destination as a collision even when no selected file overlaps it', function () {
            const fixture = createKnowledgePackFixture();
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const destination = join(fixture.home, ...host.segments);
                mkdirSync(destination, {recursive: true});
                writeFileSync(join(destination, 'operator-notes.txt'), 'unrelated\n');
                const preview = host.create(fixture.home).preview(pack, 'full');
                expect(preview.destinationExists).toBeTrue();
                expect(preview.filesToOverwrite).toEqual([]);
            } finally { fixture.remove(); }
        });

        it('fails closed on an existing destination whose only content is unrelated to the selected scope', function () {
            const fixture = createKnowledgePackFixture();
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const adapter = host.create(fixture.home);
                const destination = join(fixture.home, ...host.segments);
                mkdirSync(destination, {recursive: true});
                writeFileSync(join(destination, 'operator-notes.txt'), 'unrelated\n');
                const before = destinationInventory(destination);
                expectCode(() => adapter.install(pack, 'full', {replace: false}), 'ERR_CONFIRMATION_REQUIRED');
                expect(destinationInventory(destination)).toEqual(before);
                expect(existsSync(join(destination, 'AGENTS.md'))).toBeFalse();
                const result = adapter.install(pack, 'full', {replace: true});
                expect([...result.filesWritten].sort()).toEqual([
                    'AGENTS.md', 'guides/README.md', 'guides/example.md', 'skill/AGENTS.md', 'skill/SKILL.md'
                ]);
                expect(readFileSync(join(destination, 'operator-notes.txt'), 'utf8')).toBe('unrelated\n');
            } finally { fixture.remove(); }
        });

        it('validates every selected byte before any destination write, leaving zero partial installation on a later lane-state violation', function () {
            const fixture = createKnowledgePackFixture({
                assetContents: {
                    'AGENTS.md': '# agents\n', 'skill/AGENTS.md': '# skill agents\n',
                    'guides/README.md': '# guides\n', 'guides/example.md': '# example guide\n',
                    'skill/SKILL.md': 'LANE_ID="poisoned"\n'
                }
            });
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const adapter = host.create(fixture.home);
                const destination = join(fixture.home, ...host.segments);
                expect(existsSync(destination)).toBeFalse();
                expectCode(() => adapter.install(pack, 'full', {replace: false}), 'ERR_UNSAFE_MUTATION');
                // Before/after byte inventory: the destination must not exist at all — not even the
                // alphabetically-earlier, individually-clean assets ("AGENTS.md", "guides/*") may land.
                expect(existsSync(destination)).toBeFalse();
                expect(existsSync(join(fixture.home, host.segments[0], host.segments[1]))).withContext(
                    'no staging remnant beneath the host base directory'
                ).toBeFalse();
            } finally { fixture.remove(); }
        });

        it('refuses to install over an existing destination without replace, then installs and records the version with replace', function () {
            const fixture = createKnowledgePackFixture();
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const adapter = host.create(fixture.home);
                const destination = join(fixture.home, ...host.segments);
                mkdirSync(destination, {recursive: true});
                writeFileSync(join(destination, 'AGENTS.md'), 'stale\n');
                expectCode(() => adapter.install(pack, 'full', {replace: false}), 'ERR_CONFIRMATION_REQUIRED');
                expect(readFileSync(join(destination, 'AGENTS.md'), 'utf8')).toBe('stale\n');
                const result = adapter.install(pack, 'full', {replace: true});
                expect([...result.filesWritten].sort()).toEqual([
                    'AGENTS.md', 'guides/README.md', 'guides/example.md', 'skill/AGENTS.md', 'skill/SKILL.md'
                ]);
                expect(result.hostNotification).toBe('unverified');
                expect(readFileSync(join(destination, 'AGENTS.md'), 'utf8')).toBe('# agents\n');
                expect(adapter.getInstalledVersion()).toBe(fixture.version);
            } finally { fixture.remove(); }
        });

        it('installs a fresh destination without requiring replace and applies scope filtering', function () {
            const fixture = createKnowledgePackFixture();
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const adapter = host.create(fixture.home);
                const skillOnly = adapter.install(pack, 'skill-only', {replace: false});
                expect([...skillOnly.filesWritten].sort()).toEqual(['skill/AGENTS.md', 'skill/SKILL.md']);
                expect(existsSync(join(skillOnly.destination, 'guides', 'README.md'))).toBeFalse();
            } finally { fixture.remove(); }
        });

        it('refuses a destination that escapes its known host base directory', function () {
            const fixture = createKnowledgePackFixture();
            try {
                const escapedBase = join(fixture.root, 'outside-home');
                mkdirSync(escapedBase, {recursive: true});
                mkdirSync(join(fixture.home, host.segments[0]), {recursive: true});
                rmSync(join(fixture.home, host.segments[0]), {recursive: true, force: true});
                symlinkSync(escapedBase, join(fixture.home, host.segments[0]));
                expectCode(() => host.create(fixture.home), 'ERR_PATH_ESCAPE');
            } finally { fixture.remove(); }
        });

        it('refuses to install content carrying a lane-state marker', function () {
            const fixture = createKnowledgePackFixture({
                assetContents: {'AGENTS.md': '# agents\n', 'skill/SKILL.md': 'LANE_ID="poisoned"\n'}
            });
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const adapter = host.create(fixture.home);
                expectCode(() => adapter.install(pack, 'full', {replace: false}), 'ERR_UNSAFE_MUTATION');
            } finally { fixture.remove(); }
        });

        it('leaves an existing installation byte-identical when a replace attempt is rejected for lane state', function () {
            const fixture = createKnowledgePackFixture({
                assetContents: {
                    'AGENTS.md': '# agents\n', 'skill/AGENTS.md': '# skill agents\n',
                    'guides/README.md': '# guides\n', 'guides/example.md': '# example guide\n',
                    'skill/SKILL.md': 'LANE_ID="poisoned"\n'
                }
            });
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const adapter = host.create(fixture.home);
                const destination = join(fixture.home, ...host.segments);
                mkdirSync(destination, {recursive: true});
                writeFileSync(join(destination, 'AGENTS.md'), 'previously-installed\n');
                const before = destinationInventory(destination);
                expectCode(() => adapter.install(pack, 'full', {replace: true}), 'ERR_UNSAFE_MUTATION');
                expect(destinationInventory(destination)).toEqual(before);
                expect(readFileSync(join(destination, 'AGENTS.md'), 'utf8')).toBe('previously-installed\n');
            } finally { fixture.remove(); }
        });

        it('fails closed with ERR_MANAGED_CONFLICT on a later selected-path topology conflict during replace, leaving the destination byte-identical and no staging/backup remnant', function () {
            const fixture = createKnowledgePackFixture();
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const adapter = host.create(fixture.home);
                const destination = join(fixture.home, ...host.segments);
                mkdirSync(destination, {recursive: true});
                // "AGENTS.md" sorts lexically before "guides/README.md", so the commit boundary must
                // discover this conflict on a later path than the one it would otherwise write first.
                writeFileSync(join(destination, 'AGENTS.md'), 'previously-installed\n');
                writeFileSync(join(destination, 'guides'), 'blocking regular file, not a directory\n');
                const before = destinationInventory(destination);
                expectCode(() => adapter.install(pack, 'full', {replace: true}), 'ERR_MANAGED_CONFLICT');
                expect(destinationInventory(destination)).toEqual(before);
                expect(readFileSync(join(destination, 'AGENTS.md'), 'utf8')).toBe('previously-installed\n');
                expect(readFileSync(join(destination, 'guides'), 'utf8')).toBe('blocking regular file, not a directory\n');
                // No `.staging-*` or `.previous-*` sibling left behind in the host base directory.
                const siblingEntries = readdirSync(join(fixture.home, host.segments[0], host.segments[1]));
                expect(siblingEntries).toEqual(['watchtower-coordinator']);
            } finally { fixture.remove(); }
        });

        it('fails closed on a corrupted (checksum-mismatched) asset', function () {
            const fixture = createKnowledgePackFixture({tamperAssetAfterManifest: 'AGENTS.md'});
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                expectCode(() => host.create(fixture.home).install(pack, 'full', {replace: false}), 'ERR_INTEGRITY_FAILURE');
            } finally { fixture.remove(); }
        });

        it('fails closed on a symlinked source asset', function () {
            const fixture = createKnowledgePackFixture({symlinkAsset: 'AGENTS.md'});
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                expectCode(() => host.create(fixture.home).install(pack, 'full', {replace: false}), 'ERR_INTEGRITY_FAILURE');
            } finally { fixture.remove(); }
        });
    });
}

describe('cursor host adapter', function () {
    it('concatenates scoped assets into a single .cursorrules file with a version header', function () {
        const fixture = createKnowledgePackFixture();
        try {
            const pack: ResolvedKnowledgePack = resolveKnowledgeRoot(fixture.dataHome);
            const adapter = createCursorHostAdapter(fixture.projectRoot);
            const preview = adapter.preview(pack, 'guides-only');
            expect(preview.destination).toBe(join(fixture.projectRoot, '.cursorrules'));
            expect(preview.files.map((file) => file.sourcePath).sort()).toEqual(['guides/README.md', 'guides/example.md']);
            const result = adapter.install(pack, 'guides-only', {replace: false});
            const written = readFileSync(result.destination, 'utf8');
            expect(written).toContain(`# watchtower-knowledge-version: ${fixture.version}`);
            expect(written).toContain('# guides');
            expect(written).toContain('# example guide');
            expect(written).not.toContain('# skill');
            expect(adapter.getInstalledVersion()).toBe(fixture.version);
        } finally { fixture.remove(); }
    });

    it('refuses to overwrite an existing rule file without replace', function () {
        const fixture = createKnowledgePackFixture();
        try {
            const pack = resolveKnowledgeRoot(fixture.dataHome);
            const adapter = createCursorHostAdapter(fixture.projectRoot);
            writeFileSync(join(fixture.projectRoot, '.cursorrules'), 'existing rules\n');
            expectCode(() => adapter.install(pack, 'full', {replace: false}), 'ERR_CONFIRMATION_REQUIRED');
            expect(readFileSync(join(fixture.projectRoot, '.cursorrules'), 'utf8')).toBe('existing rules\n');
        } finally { fixture.remove(); }
    });

    it('refuses content carrying a lane-state marker, writing no destination file', function () {
        const fixture = createKnowledgePackFixture({
            assetContents: {'AGENTS.md': '# agents\n', 'guides/README.md': 'TMUX_PREFIX="wt"\n'}
        });
        try {
            const pack = resolveKnowledgeRoot(fixture.dataHome);
            const destination = join(fixture.projectRoot, '.cursorrules');
            expectCode(() => createCursorHostAdapter(fixture.projectRoot).install(pack, 'guides-only', {replace: false}),
                'ERR_UNSAFE_MUTATION');
            expect(existsSync(destination)).toBeFalse();
        } finally { fixture.remove(); }
    });

    it('fails closed with a registered managed-conflict reason when destination is a directory', function () {
        const fixture = createKnowledgePackFixture();
        try {
            const pack = resolveKnowledgeRoot(fixture.dataHome);
            const destination = join(fixture.projectRoot, '.cursorrules');
            mkdirSync(destination, {recursive: true});
            writeFileSync(join(destination, 'nested.txt'), 'nested\n');
            const before = destinationInventory(destination);
            expectCode(() => createCursorHostAdapter(fixture.projectRoot).preview(pack, 'full'), 'ERR_MANAGED_CONFLICT');
            expect(destinationInventory(destination)).toEqual(before);
            expectCode(() => createCursorHostAdapter(fixture.projectRoot).install(pack, 'full', {replace: true}), 'ERR_MANAGED_CONFLICT');
            expect(destinationInventory(destination)).toEqual(before);
        } finally { fixture.remove(); }
    });
});

function expectCode(action: () => unknown, code: string): void {
    try { action(); fail(`expected ${code}`); } catch (error) { expect((error as WatchtowerError).code).toBe(code); }
}
