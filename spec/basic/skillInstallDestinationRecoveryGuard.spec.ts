import {existsSync, lstatSync, mkdirSync, readFileSync, symlinkSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import type {WatchtowerError} from '../../src/contracts/index.js';
import {resolveKnowledgeRoot} from '../../src/foundation/index.js';
import type {HostAdapter, ResolvedKnowledgePack} from '../../src/foundation/index.js';
import {createKnowledgePackFixture, destinationInventory, directoryHosts} from './skillInstallFixtures.js';

/**
 * Correction 08: every wrong `destination` entry type combined with every otherwise-legal
 * transaction-marker state, across every directory-adapter entry point.
 *
 * Before this correction, all three entry points called `recoverInterruptedInstall` *before*
 * `classifyManagedDestination`. A symlink at `destination` therefore counted as "the destination
 * exists" inside `classifyTransactionState`, so a marker naming a real `staging` directory with an
 * absent `previous` matched the legal `abandoned-before-first-rename` shape exactly — and a plain
 * read-only `preview()` recursively deleted that real staging directory and consumed the marker,
 * *then* threw the correct typed error. The typed error was right; the bytes were already gone.
 *
 * The fix is layered: each entry point asserts `destination`'s identity before recovery,
 * `recoverInterruptedInstall` itself asserts it again as the single owner before reading the
 * marker, and `classifyTransactionState` additionally refuses to treat anything but a genuinely
 * absent or real-directory `destination` as a state it may act on. These specs pin all of it by
 * asserting both the exact typed error and byte-identical staging/previous/marker/symlink-target
 * inventories for every combination.
 */
for (const host of directoryHosts) {
    describe(`${host.name} host adapter destination-identity-before-recovery guard`, function () {
        type DestinationKind = 'symlink-contained' | 'symlink-escaping' | 'dangling-symlink' | 'regular-file';
        type MarkerState =
            | 'abandoned-before-first-rename' | 'interrupted-between-renames'
            | 'landed-pending-previous-cleanup' | 'no-marker';

        const destinationKinds: ReadonlyArray<{readonly kind: DestinationKind; readonly expected: string}> = [
            // Reaches the adapter: its real target is still contained beneath the authorized host
            // base, so construction-time `authorizePath` containment cannot see anything wrong.
            {kind: 'symlink-contained', expected: 'ERR_PATH_ESCAPE'},
            {kind: 'symlink-escaping', expected: 'ERR_PATH_ESCAPE'},
            {kind: 'dangling-symlink', expected: 'ERR_PATH_ESCAPE'},
            {kind: 'regular-file', expected: 'ERR_MANAGED_CONFLICT'}
        ];

        // Every marker state that is otherwise legal — i.e. one a real interrupted transaction can
        // produce, which recovery would legitimately act on if `destination` were a real directory.
        const markerStates: readonly MarkerState[] = [
            'abandoned-before-first-rename', 'interrupted-between-renames',
            'landed-pending-previous-cleanup', 'no-marker'
        ];

        const entryPoints: ReadonlyArray<{
            readonly name: string; readonly invoke: (adapter: HostAdapter, pack: ResolvedKnowledgePack) => void;
        }> = [
            {name: 'preview()', invoke: (adapter, pack) => { adapter.preview(pack, 'full'); }},
            {name: 'install()', invoke: (adapter, pack) => { adapter.install(pack, 'full', {replace: true}); }},
            {name: 'getInstalledVersion()', invoke: (adapter) => { adapter.getInstalledVersion(); }}
        ];

        for (const destination of destinationKinds) {
            for (const markerState of markerStates) {
                for (const entryPoint of entryPoints) {
                    it(`fails closed with ${destination.expected} and preserves every transaction byte: destination is a ${destination.kind}, marker state ${markerState}, via ${entryPoint.name}`, function () {
                        const fixture = createKnowledgePackFixture();
                        try {
                            const pack = resolveKnowledgeRoot(fixture.dataHome);
                            const destinationPath = join(fixture.home, ...host.segments);
                            const siblingDir = join(fixture.home, host.segments[0], host.segments[1]);
                            mkdirSync(siblingDir, {recursive: true});

                            const outsideTarget = join(fixture.root, 'outside-symlink-target');
                            mkdirSync(outsideTarget, {recursive: true});
                            writeFileSync(join(outsideTarget, 'secret.txt'), 'outside secret\n');
                            const containedTarget = join(siblingDir, 'other-real-dir');
                            mkdirSync(containedTarget, {recursive: true});
                            writeFileSync(join(containedTarget, 'secret.txt'), 'contained secret\n');

                            mkdirSync(dirname(destinationPath), {recursive: true});
                            makeDestination(destination.kind, destinationPath, containedTarget, outsideTarget, fixture.root);

                            const staging = join(siblingDir, 'watchtower-coordinator.staging-AbCd12');
                            const previous = join(siblingDir, 'watchtower-coordinator.previous-11111111-1111-4111-8111-111111111111');
                            if (markerState === 'abandoned-before-first-rename' || markerState === 'interrupted-between-renames') {
                                mkdirSync(staging, {recursive: true});
                                writeFileSync(join(staging, 'AGENTS.md'), '# staged\n');
                            }
                            if (markerState === 'interrupted-between-renames' || markerState === 'landed-pending-previous-cleanup') {
                                mkdirSync(previous, {recursive: true});
                                writeFileSync(join(previous, 'AGENTS.md'), 'old\n');
                            }
                            const markerPath = `${destinationPath}.install-transaction.json`;
                            const markerContent = `${JSON.stringify({staging, previous})}\n`;
                            if (markerState !== 'no-marker') writeFileSync(markerPath, markerContent);

                            const stagingBefore = destinationInventory(staging);
                            const previousBefore = destinationInventory(previous);
                            const outsideBefore = destinationInventory(outsideTarget);
                            const containedBefore = destinationInventory(containedTarget);

                            // The typed refusal may surface at either of two fail-closed points, and this
                            // matrix asserts the operation as a whole fails closed with every byte preserved
                            // regardless of which one fires: a destination symlink whose real target escapes
                            // the host base, or a dangling one, is rejected at adapter construction by the
                            // pre-existing `resolveKnownDestination` containment check; a *contained*
                            // destination symlink or a plain regular file passes containment and instead
                            // reaches `classifyManagedDestination`, which — being called before recovery — is
                            // the exact correction-08 boundary that must refuse before any recovery mutation.
                            expectCode(() => {
                                const adapter = host.create(fixture.home);
                                entryPoint.invoke(adapter, pack);
                            }, destination.expected);

                            expect(destinationInventory(staging)).withContext('staging byte-identical').toEqual(stagingBefore);
                            expect(destinationInventory(previous)).withContext('previous byte-identical').toEqual(previousBefore);
                            expect(destinationInventory(outsideTarget)).withContext('external symlink target byte-identical').toEqual(outsideBefore);
                            expect(destinationInventory(containedTarget)).withContext('contained symlink target byte-identical').toEqual(containedBefore);
                            if (markerState === 'no-marker') {
                                expect(existsSync(markerPath)).withContext('no marker was created').toBeFalse();
                            } else {
                                expect(existsSync(markerPath)).withContext('marker preserved for diagnosis').toBeTrue();
                                expect(readFileSync(markerPath, 'utf8')).withContext('marker byte-identical').toBe(markerContent);
                            }
                            expect(entryKind(destinationPath)).withContext('destination entry itself unchanged').toBe(destination.kind);
                        } finally { fixture.remove(); }
                    });
                }
            }
        }
    });
}

function makeDestination(
    kind: 'symlink-contained' | 'symlink-escaping' | 'dangling-symlink' | 'regular-file',
    destination: string, containedTarget: string, outsideTarget: string, root: string
): void {
    if (kind === 'symlink-contained') { symlinkSync(containedTarget, destination); return; }
    if (kind === 'symlink-escaping') { symlinkSync(outsideTarget, destination); return; }
    if (kind === 'dangling-symlink') { symlinkSync(join(root, 'nowhere'), destination); return; }
    writeFileSync(destination, 'i am a regular file, not a managed directory\n');
}

/** Re-derives which fixture shape `path` still holds, so "unchanged" is asserted type-aware. */
function entryKind(path: string): string {
    const stat = lstatSync(path);
    if (!stat.isSymbolicLink()) return 'regular-file';
    if (!existsSync(path)) return 'dangling-symlink';
    return readFileSync(join(path, 'secret.txt'), 'utf8') === 'contained secret\n'
        ? 'symlink-contained' : 'symlink-escaping';
}

function expectCode(action: () => unknown, code: string): void {
    try { action(); fail(`expected ${code}`); } catch (error) { expect((error as WatchtowerError).code).toBe(code); }
}
