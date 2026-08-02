import {chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, symlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import type {WatchtowerError} from '../../src/contracts/index.js';
import {resolveKnowledgeRoot} from '../../src/foundation/index.js';
import type {HostAdapter, ResolvedKnowledgePack} from '../../src/foundation/index.js';
import {createKnowledgePackFixture, destinationInventory, directoryHosts} from './skillInstallFixtures.js';

/**
 * The directory-host (Codex/Claude) atomic staged-commit and interruption-recovery transaction
 * boundary — `directoryInstallTransaction.ts` / `directoryInstallRecovery.ts`. Split out of
 * `skill-install.spec.ts` (Correction 06) once that file grew past the test-module size band;
 * this file owns exactly the destination-symlink guard, the interruption/recovery states, and
 * the untrusted-transaction-marker adversarial matrix (escaping, malformed, wrong-name, stale
 * existence pattern, and wrong entry type) for both hosts.
 */
for (const host of directoryHosts) {
    describe(`${host.name} host adapter directory-transaction boundary`, function () {
        it('fails closed with a registered unsafe-mutation reason on a destination symlink, never following it outside the host directory', function () {
            const fixture = createKnowledgePackFixture();
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const adapter = host.create(fixture.home);
                const destination = join(fixture.home, ...host.segments);
                mkdirSync(destination, {recursive: true});
                const outsideSentinel = join(fixture.root, 'outside-sentinel.txt');
                writeFileSync(outsideSentinel, 'sentinel\n');
                symlinkSync(outsideSentinel, join(destination, 'AGENTS.md'));
                const before = destinationInventory(destination);
                let thrown: WatchtowerError | null = null;
                try { adapter.install(pack, 'full', {replace: true}); fail('expected a registered unsafe-mutation reason'); }
                catch (error) { thrown = error as WatchtowerError; }
                expect(['ERR_PATH_ESCAPE', 'ERR_UNSAFE_MUTATION']).toContain(thrown === null ? '' : thrown.code);
                expect(readFileSync(outsideSentinel, 'utf8')).withContext('outside sentinel must never be written').toBe('sentinel\n');
                expect(destinationInventory(destination)).withContext('destination inventory unchanged').toEqual(before);
                const siblingEntries = readdirSync(join(fixture.home, host.segments[0], host.segments[1]));
                expect(siblingEntries).withContext('no staging/backup remnant').toEqual(['watchtower-coordinator']);
            } finally { fixture.remove(); }
        });

        it('deterministically completes a replace transaction interrupted between its two commit renames', function () {
            const fixture = createKnowledgePackFixture();
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const destination = join(fixture.home, ...host.segments);
                const siblingDir = join(fixture.home, host.segments[0], host.segments[1]);
                const staging = join(siblingDir, 'watchtower-coordinator.staging-AbCd12');
                const previous = join(siblingDir, 'watchtower-coordinator.previous-11111111-1111-4111-8111-111111111111');
                mkdirSync(previous, {recursive: true});
                writeFileSync(join(previous, 'AGENTS.md'), 'old\n');
                mkdirSync(staging, {recursive: true});
                writeFileSync(join(staging, 'AGENTS.md'), '# agents\n');
                writeFileSync(join(staging, '.watchtower-version'),
                    `${JSON.stringify({knowledgeVersion: fixture.version, installedAt: '2026-01-01T00:00:00Z'})}\n`);
                writeFileSync(`${destination}.install-transaction.json`, `${JSON.stringify({staging, previous})}\n`);
                expect(existsSync(destination)).toBeFalse();

                const adapter = host.create(fixture.home);
                expectCode(() => adapter.preview(pack, 'full'), 'ERR_INTEGRITY_FAILURE');
                expect(existsSync(staging)).withContext('preview must not mutate staging').toBeTrue();
                expect(existsSync(previous)).withContext('preview must not mutate previous').toBeTrue();
                expect(existsSync(`${destination}.install-transaction.json`)).withContext('preview must not consume marker').toBeTrue();

                adapter.install(pack, 'full', {replace: true});
                expect(existsSync(destination)).toBeTrue();
                expect(readFileSync(join(destination, 'AGENTS.md'), 'utf8')).toBe('# agents\n');
                expect(existsSync(staging)).withContext('staging remnant cleaned up').toBeFalse();
                expect(existsSync(previous)).withContext('previous remnant cleaned up').toBeFalse();
                expect(existsSync(`${destination}.install-transaction.json`)).withContext('marker cleaned up').toBeFalse();
                expect(readdirSync(siblingDir)).toEqual(['watchtower-coordinator']);
            } finally { fixture.remove(); }
        });

        it('discards an abandoned staged attempt and leaves the untouched original in place when interrupted before the first commit rename', function () {
            const fixture = createKnowledgePackFixture();
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const destination = join(fixture.home, ...host.segments);
                const siblingDir = join(fixture.home, host.segments[0], host.segments[1]);
                mkdirSync(destination, {recursive: true});
                writeFileSync(join(destination, 'AGENTS.md'), 'old\n');
                const staging = join(siblingDir, 'watchtower-coordinator.staging-AbCd12');
                const previous = join(siblingDir, 'watchtower-coordinator.previous-11111111-1111-4111-8111-111111111111');
                mkdirSync(staging, {recursive: true});
                writeFileSync(join(staging, 'AGENTS.md'), '# agents\n');
                writeFileSync(`${destination}.install-transaction.json`, `${JSON.stringify({staging, previous})}\n`);

                const adapter = host.create(fixture.home);
                expectCode(() => adapter.preview(pack, 'full'), 'ERR_INTEGRITY_FAILURE');
                expect(readFileSync(join(destination, 'AGENTS.md'), 'utf8')).withContext('preview must not mutate destination').toBe('old\n');
                expect(existsSync(staging)).withContext('preview must not discard staging').toBeTrue();

                adapter.install(pack, 'full', {replace: true});
                expect(readFileSync(join(destination, 'AGENTS.md'), 'utf8')).withContext('install replaces destination after recovery').not.toBe('old\n');
                expect(existsSync(staging)).withContext('abandoned staging discarded').toBeFalse();
                expect(existsSync(`${destination}.install-transaction.json`)).withContext('marker cleaned up').toBeFalse();
                expect(readdirSync(siblingDir)).toEqual(['watchtower-coordinator']);
            } finally { fixture.remove(); }
        });

        it('treats the transaction marker as untrusted input: fails closed on a marker whose staging/previous escape the host base, deleting nothing outside it', function () {
            const fixture = createKnowledgePackFixture();
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const destination = join(fixture.home, ...host.segments);
                mkdirSync(destination, {recursive: true});
                writeFileSync(join(destination, 'AGENTS.md'), 'old\n');
                const outsideVictim = join(fixture.root, 'outside-victim');
                mkdirSync(outsideVictim, {recursive: true});
                writeFileSync(join(outsideVictim, 'sentinel.txt'), 'sentinel\n');
                const outsideBefore = destinationInventory(outsideVictim);
                const destinationBefore = destinationInventory(destination);
                writeFileSync(`${destination}.install-transaction.json`,
                    `${JSON.stringify({staging: outsideVictim, previous: outsideVictim})}\n`);

                const adapter = host.create(fixture.home);
                expectCode(() => adapter.preview(pack, 'full'), 'ERR_INTEGRITY_FAILURE');

                expect(destinationInventory(outsideVictim)).withContext('nothing outside the host base was touched').toEqual(outsideBefore);
                expect(readFileSync(join(outsideVictim, 'sentinel.txt'), 'utf8')).toBe('sentinel\n');
                expect(destinationInventory(destination)).withContext('destination unmutated').toEqual(destinationBefore);
                expect(existsSync(`${destination}.install-transaction.json`)).withContext('the untrustworthy marker is left in place, not silently consumed').toBeTrue();
            } finally { fixture.remove(); }
        });

        it('treats the transaction marker as untrusted input: fails closed on malformed marker JSON without mutating the destination', function () {
            const fixture = createKnowledgePackFixture();
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const destination = join(fixture.home, ...host.segments);
                mkdirSync(destination, {recursive: true});
                writeFileSync(join(destination, 'AGENTS.md'), 'old\n');
                const destinationBefore = destinationInventory(destination);
                writeFileSync(`${destination}.install-transaction.json`, 'not valid json {{{');

                const adapter = host.create(fixture.home);
                expectCode(() => adapter.preview(pack, 'full'), 'ERR_INTEGRITY_FAILURE');
                expect(destinationInventory(destination)).toEqual(destinationBefore);
            } finally { fixture.remove(); }
        });

        it('treats the transaction marker as untrusted input: fails closed on an in-base marker path with the wrong sibling name', function () {
            const fixture = createKnowledgePackFixture();
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const destination = join(fixture.home, ...host.segments);
                const siblingDir = join(fixture.home, host.segments[0], host.segments[1]);
                mkdirSync(destination, {recursive: true});
                writeFileSync(join(destination, 'AGENTS.md'), 'old\n');
                // A sibling of the destination, so it passes containment — but its name does not
                // match the exact `<destination>.staging-XXXXXX` / `.previous-<uuid>` shapes this
                // module itself generates, so it must still be rejected rather than trusted.
                const wrongName = join(siblingDir, 'watchtower-coordinator.not-a-real-transaction-dir');
                mkdirSync(wrongName, {recursive: true});
                writeFileSync(join(wrongName, 'unexpected.txt'), 'unexpected\n');
                const wrongNameBefore = destinationInventory(wrongName);
                const destinationBefore = destinationInventory(destination);
                writeFileSync(`${destination}.install-transaction.json`,
                    `${JSON.stringify({staging: wrongName, previous: wrongName})}\n`);

                const adapter = host.create(fixture.home);
                expectCode(() => adapter.preview(pack, 'full'), 'ERR_INTEGRITY_FAILURE');

                expect(destinationInventory(wrongName)).withContext('the wrong-named sibling directory was not deleted').toEqual(wrongNameBefore);
                expect(destinationInventory(destination)).toEqual(destinationBefore);
            } finally { fixture.remove(); }
        });

        type TransactionEntryKind = 'absent' | 'directory' | 'regular-file' | 'symlink';

        const staleTransactionStates: ReadonlyArray<{
            readonly name: string; readonly destinationPresent: boolean;
            readonly staging: TransactionEntryKind; readonly previous: TransactionEntryKind;
        }> = [
            // Correction 05: existence-pattern stale states (both real directories or absent; no legal shape matches).
            {name: 'both staging and previous absent', destinationPresent: true, staging: 'absent', previous: 'absent'},
            {name: 'only staging absent (destination also absent)', destinationPresent: false, staging: 'absent', previous: 'directory'},
            {name: 'only previous absent (destination also absent)', destinationPresent: false, staging: 'directory', previous: 'absent'},
            {name: 'destination, staging, and previous all present at once', destinationPresent: true, staging: 'directory', previous: 'directory'},
            // Correction 06: a present entry that is validly named/contained but not actually a directory.
            {name: 'staging is a regular file (otherwise an abandoned-before-first-rename shape)', destinationPresent: true, staging: 'regular-file', previous: 'absent'},
            {name: 'staging is a symlink (otherwise an abandoned-before-first-rename shape)', destinationPresent: true, staging: 'symlink', previous: 'absent'},
            {name: 'staging is a regular file with destination absent (must not rename a file into destination)', destinationPresent: false, staging: 'regular-file', previous: 'directory'},
            {name: 'staging is a symlink with destination absent (must not rename a symlink into destination)', destinationPresent: false, staging: 'symlink', previous: 'directory'},
            {name: 'previous is a regular file (otherwise a landed-pending-previous-cleanup shape)', destinationPresent: true, staging: 'absent', previous: 'regular-file'},
            {name: 'previous is a symlink (otherwise a landed-pending-previous-cleanup shape)', destinationPresent: true, staging: 'absent', previous: 'symlink'},
            {name: 'previous is a regular file with destination absent (otherwise an interrupted-between-renames shape)', destinationPresent: false, staging: 'directory', previous: 'regular-file'},
            {name: 'previous is a symlink with destination absent (otherwise an interrupted-between-renames shape)', destinationPresent: false, staging: 'directory', previous: 'symlink'}
        ];

        for (const scenario of staleTransactionStates) {
            it(`fails closed with a preserved byte-identical marker on a validly-named, contained, but stale transaction state: ${scenario.name}`, function () {
                const fixture = createKnowledgePackFixture();
                try {
                    const pack = resolveKnowledgeRoot(fixture.dataHome);
                    const destination = join(fixture.home, ...host.segments);
                    const siblingDir = join(fixture.home, host.segments[0], host.segments[1]);
                    const staging = join(siblingDir, 'watchtower-coordinator.staging-AbCd12');
                    const previous = join(siblingDir, 'watchtower-coordinator.previous-11111111-1111-4111-8111-111111111111');
                    const symlinkTarget = join(fixture.root, 'symlink-target-real-dir');
                    mkdirSync(symlinkTarget, {recursive: true});
                    writeFileSync(join(symlinkTarget, 'unrelated.txt'), 'unrelated\n');
                    mkdirSync(siblingDir, {recursive: true});
                    if (scenario.destinationPresent) {
                        mkdirSync(destination, {recursive: true});
                        writeFileSync(join(destination, 'AGENTS.md'), 'old\n');
                    }
                    makeTransactionEntry(scenario.staging, staging, symlinkTarget);
                    makeTransactionEntry(scenario.previous, previous, symlinkTarget);
                    const markerPath = `${destination}.install-transaction.json`;
                    const markerContent = `${JSON.stringify({staging, previous})}\n`;
                    writeFileSync(markerPath, markerContent);
                    const destinationBefore = destinationInventory(destination);
                    const stagingBefore = entrySnapshot(staging);
                    const previousBefore = entrySnapshot(previous);
                    const symlinkTargetBefore = destinationInventory(symlinkTarget);

                    const adapter = host.create(fixture.home);
                    expectCode(() => adapter.preview(pack, 'full'), 'ERR_INTEGRITY_FAILURE');

                    expect(existsSync(markerPath)).withContext('marker preserved for diagnosis').toBeTrue();
                    expect(readFileSync(markerPath, 'utf8')).withContext('marker byte-identical').toBe(markerContent);
                    expect(destinationInventory(destination)).withContext('destination unchanged').toEqual(destinationBefore);
                    expect(entrySnapshot(staging)).withContext('staging unchanged').toBe(stagingBefore);
                    expect(entrySnapshot(previous)).withContext('previous unchanged').toBe(previousBefore);
                    expect(destinationInventory(symlinkTarget)).withContext('symlink target untouched').toEqual(symlinkTargetBefore);
                } finally { fixture.remove(); }
            });
        }

        const recoveryEntryPoints: ReadonlyArray<{
            readonly name: string; readonly invoke: (adapter: HostAdapter, pack: ResolvedKnowledgePack) => void;
        }> = [
            {name: 'preview()', invoke: (adapter, pack) => { adapter.preview(pack, 'full'); }},
            {name: 'install()', invoke: (adapter, pack) => { adapter.install(pack, 'full', {replace: true}); }},
            {name: 'getInstalledVersion()', invoke: (adapter) => { adapter.getInstalledVersion(); }}
        ];

        for (const entryPoint of recoveryEntryPoints) {
            it(`treats the transaction marker path itself as untrusted: a directory at the marker path fails closed via ${entryPoint.name}`, function () {
                const fixture = createKnowledgePackFixture();
                try {
                    const pack = resolveKnowledgeRoot(fixture.dataHome);
                    const destination = join(fixture.home, ...host.segments);
                    mkdirSync(destination, {recursive: true});
                    writeFileSync(join(destination, 'AGENTS.md'), 'old\n');
                    const markerPath = `${destination}.install-transaction.json`;
                    mkdirSync(markerPath, {recursive: true});
                    writeFileSync(join(markerPath, 'not-a-marker.txt'), 'unrelated\n');
                    const destinationBefore = destinationInventory(destination);
                    const markerBefore = entrySnapshot(markerPath);

                    const adapter = host.create(fixture.home);
                    expectCode(() => entryPoint.invoke(adapter, pack), 'ERR_INTEGRITY_FAILURE');

                    expect(entrySnapshot(markerPath)).withContext('marker path (still a directory) unchanged').toBe(markerBefore);
                    expect(destinationInventory(destination)).withContext('destination unchanged').toEqual(destinationBefore);
                } finally { fixture.remove(); }
            });
        }

        it('treats the transaction marker path itself as untrusted: a symlink at the marker path fails closed, even when it targets a well-formed marker file elsewhere', function () {
            const fixture = createKnowledgePackFixture();
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const destination = join(fixture.home, ...host.segments);
                mkdirSync(destination, {recursive: true});
                writeFileSync(join(destination, 'AGENTS.md'), 'old\n');
                const siblingDir = join(fixture.home, host.segments[0], host.segments[1]);
                mkdirSync(siblingDir, {recursive: true});
                const staging = join(siblingDir, 'watchtower-coordinator.staging-AbCd12');
                const previous = join(siblingDir, 'watchtower-coordinator.previous-11111111-1111-4111-8111-111111111111');
                const realMarkerElsewhere = join(fixture.root, 'real-marker-elsewhere.json');
                const realMarkerContent = `${JSON.stringify({staging, previous})}\n`;
                writeFileSync(realMarkerElsewhere, realMarkerContent);
                const markerPath = `${destination}.install-transaction.json`;
                symlinkSync(realMarkerElsewhere, markerPath);
                const destinationBefore = destinationInventory(destination);

                const adapter = host.create(fixture.home);
                expectCode(() => adapter.preview(pack, 'full'), 'ERR_INTEGRITY_FAILURE');

                expect(entrySnapshot(markerPath)).withContext('marker symlink itself unchanged').toBe(`symlink:${realMarkerElsewhere}`);
                expect(readFileSync(realMarkerElsewhere, 'utf8')).withContext('the real file it points at is untouched').toBe(realMarkerContent);
                expect(destinationInventory(destination)).withContext('destination unchanged').toEqual(destinationBefore);
            } finally { fixture.remove(); }
        });

        it('treats the transaction marker path itself as untrusted: an unreadable marker file fails closed rather than being treated as absent', function () {
            if (typeof process.getuid === 'function' && process.getuid() === 0) {
                pending('root bypasses filesystem permission bits; this scenario cannot be exercised as root');
            }
            const fixture = createKnowledgePackFixture();
            try {
                const pack = resolveKnowledgeRoot(fixture.dataHome);
                const destination = join(fixture.home, ...host.segments);
                mkdirSync(destination, {recursive: true});
                writeFileSync(join(destination, 'AGENTS.md'), 'old\n');
                const markerPath = `${destination}.install-transaction.json`;
                writeFileSync(markerPath, `${JSON.stringify({staging: 'x', previous: 'y'})}\n`);
                chmodSync(markerPath, 0o000);
                const destinationBefore = destinationInventory(destination);

                const adapter = host.create(fixture.home);
                try {
                    expectCode(() => adapter.preview(pack, 'full'), 'ERR_INTEGRITY_FAILURE');
                    expect(destinationInventory(destination)).withContext('destination unchanged').toEqual(destinationBefore);
                } finally {
                    chmodSync(markerPath, 0o644);
                }
            } finally { fixture.remove(); }
        });
    });
}

function expectCode(action: () => unknown, code: string): void {
    try { action(); fail(`expected ${code}`); } catch (error) { expect((error as WatchtowerError).code).toBe(code); }
}

function makeTransactionEntry(kind: 'absent' | 'directory' | 'regular-file' | 'symlink', path: string, symlinkTarget: string): void {
    if (kind === 'absent') return;
    if (kind === 'directory') { mkdirSync(path, {recursive: true}); writeFileSync(join(path, 'AGENTS.md'), 'staged\n'); return; }
    if (kind === 'regular-file') { writeFileSync(path, 'this is a regular file, not a transaction directory\n'); return; }
    symlinkSync(symlinkTarget, path);
}

/** A byte-level snapshot distinguishing absent / directory-tree / regular-file / symlink-target at `path`. */
function entrySnapshot(path: string): string {
    let stat;
    try { stat = lstatSync(path); } catch { return 'absent'; }
    if (stat.isSymbolicLink()) return `symlink:${readlinkSync(path)}`;
    if (stat.isDirectory()) return `dir:${destinationInventory(path).join('|')}`;
    return `file:${readFileSync(path).toString('hex')}`;
}
