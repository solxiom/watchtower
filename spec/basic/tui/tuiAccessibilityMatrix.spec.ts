import {
    PROMOTED_TUI_PTY_MATRIX, qualifyTuiCacheEntry, qualifyTuiPtyTuple, reconcileTuiPtyMatrix, retainPreferenceBackups,
    TUI_CATALOG_DIMENSIONS, TUI_MIGRATION_LIMITS, TUI_VISUAL_CATALOG_STATES, type TuiCacheEntryIdentity
} from '../../../src/contracts/tuiAccessibility.js';
import {PROMOTED_TUI_NATIVE_INTEGRITY, PROMOTED_TUI_TARGET, TUI_ADAPTER_CONTRACT_REVISION} from '../../../src/contracts/tuiAdapter.js';
import {DEFAULT_TUI_PREFERENCES, loadTuiPreferences} from '../../../src/presentation/tui/TuiPreferences.js';
import {TuiLayoutResolver} from '../../../src/presentation/tui/TuiLayoutResolver.js';
import {promotedTuples, unpromotedTuples} from '../../support/tuiPty/ptyMatrixFixtures.js';

const ca18Targets = [{...PROMOTED_TUI_TARGET, artifactIntegrity: PROMOTED_TUI_NATIVE_INTEGRITY}];
const identity: TuiCacheEntryIdentity = {cliVersion: '1.0.0', rendererContractRevision: TUI_ADAPTER_CONTRACT_REVISION, cacheSchemaVersion: 1, sourceDigest: 'sha256:abc'};

describe('CA-23 promoted matrix, catalog, and migration contracts', () => {
    it('reconciles the promoted PTY matrix with the CA-18 supported targets without reducing or widening it', () => {
        const reconciliation = reconcileTuiPtyMatrix(ca18Targets);
        expect(reconciliation.consistent).toBeTrue();
        expect(reconciliation.uncoveredTargets).toEqual([]);
        expect(reconciliation.widenedTuples).toEqual([]);
        expect([...reconciliation.invocations].sort()).toEqual(['local', 'ssh', 'ssh+tmux', 'tmux']);
        expect(reconcileTuiPtyMatrix([...ca18Targets, {os: 'linux', cpu: 'arm64', libc: 'glibc', nativePackage: '@opentui/core-linux-arm64', artifactIntegrity: PROMOTED_TUI_NATIVE_INTEGRITY}]).uncoveredTargets).toEqual(['linux/arm64/glibc']);
        expect(reconcileTuiPtyMatrix([]).widenedTuples.length).toBe(PROMOTED_TUI_PTY_MATRIX.length);
    });

    it('covers every required invocation mode at both installation paths', () => {
        for (const invocation of ['local', 'tmux', 'ssh', 'ssh+tmux'] as const) {
            for (const installPath of ['source', 'global-install'] as const) {
                expect(promotedTuples().some((item) => item.invocation === invocation && item.installPath === installPath)).withContext(`${invocation}/${installPath}`).toBeTrue();
            }
        }
        expect(promotedTuples().every((item) => item.nodeVersion === '26.4.0' && item.nativeIntegrity === PROMOTED_TUI_NATIVE_INTEGRITY && item.locale.endsWith('UTF-8'))).toBeTrue();
    });

    it('fails every unpromoted tuple closed with the same typed reason and no implicit repair', () => {
        for (const fixture of unpromotedTuples()) {
            const qualification = qualifyTuiPtyTuple(fixture.value);
            expect(qualification.promoted).withContext(fixture.name).toBeFalse();
            if (qualification.promoted) continue;
            expect(qualification.reason).toBe('TERMINAL_TARGET_UNPROMOTED');
            expect(qualification.fetchesArtifacts).toBeFalse();
            expect(qualification.nonTuiCommandsPreserved).toBeTrue();
            expect(qualification.remediation).toContain('wt coordinator ask');
        }
        for (const tuple of promotedTuples()) expect(qualifyTuiPtyTuple({...tuple}).promoted).toBeTrue();
    });

    it('declares every catalog state at each declared dimension and resolves the matching layout mode', () => {
        const resolver = new TuiLayoutResolver();
        expect(new Set(TUI_VISUAL_CATALOG_STATES).size).toBe(TUI_VISUAL_CATALOG_STATES.length);
        expect(TUI_VISUAL_CATALOG_STATES.length).toBeGreaterThanOrEqual(36);
        expect(resolver.resolve(TUI_CATALOG_DIMENSIONS.wide, DEFAULT_TUI_PREFERENCES).mode).toBe('wide');
        expect(resolver.resolve(TUI_CATALOG_DIMENSIONS.standard, DEFAULT_TUI_PREFERENCES).mode).toBe('standard');
        expect(resolver.resolve(TUI_CATALOG_DIMENSIONS.narrow, DEFAULT_TUI_PREFERENCES).mode).toBe('narrow');
        for (const required of ['no-color', 'high-contrast', 'reduced-motion', 'accessible-append-only', 'unicode-stress', 'unusable-dimension-recovery', 'renderer-failure-restored'] as const) {
            expect(TUI_VISUAL_CATALOG_STATES).toContain(required);
        }
    });

    it('keeps preference loading transactional and forward compatible', () => {
        const migrated = loadTuiPreferences({schemaVersion: 0, theme: 'light', futureFlag: {nested: true}});
        expect(migrated.migrated).toBeTrue();
        expect(migrated.preferences.theme).toBe('light');
        expect(migrated.preservedUnknownKeys.futureFlag).toEqual({nested: true});
        expect(migrated.diagnostics.map((item) => item.code)).toContain('unknown-key');
        const newer = loadTuiPreferences({schemaVersion: 2, theme: 'light'});
        expect(newer.preferences).toEqual(DEFAULT_TUI_PREFERENCES);
        expect(newer.diagnostics.map((item) => item.code)).toEqual(['unsupported-version']);
        const unsafe = loadTuiPreferences({schemaVersion: 1, theme: 'neon', inspectorWidthRatio: 9});
        expect(unsafe.preferences).toEqual(DEFAULT_TUI_PREFERENCES);
        expect(unsafe.preferences.accessible).toBeFalse();
    });

    it('retains at most three preference backups for at most thirty days', () => {
        const now = 30 * 86400000 * 4;
        const backups = [
            {id: 'newest', createdAtMs: now - 1000}, {id: 'second', createdAtMs: now - 86400000},
            {id: 'third', createdAtMs: now - 2 * 86400000}, {id: 'fourth', createdAtMs: now - 3 * 86400000},
            {id: 'expired', createdAtMs: now - 31 * 86400000}
        ];
        const retention = retainPreferenceBackups(backups, now);
        expect(retention.retained).toEqual(['newest', 'second', 'third']);
        expect(retention.pruned).toEqual(['fourth', 'expired']);
        expect(retention.retained.length).toBeLessThanOrEqual(TUI_MIGRATION_LIMITS.maxPreferenceBackups);
        expect(retainPreferenceBackups([], now).retained).toEqual([]);
    });

    it('ignores an incompatible derived cache entry instead of repairing or deleting durable state', () => {
        expect(qualifyTuiCacheEntry({...identity}, identity)).toEqual({usable: true, rebuildsLazily: true, deletesDurableState: false});
        const cases = [
            {candidate: {...identity, cacheSchemaVersion: 2}, reason: 'schema-unsupported'},
            {candidate: {...identity, cliVersion: '1.1.0'}, reason: 'identity-mismatch'},
            {candidate: {...identity, rendererContractRevision: 'tui-adapter/v2'}, reason: 'identity-mismatch'},
            {candidate: {...identity, sourceDigest: 'sha256:def'}, reason: 'digest-mismatch'},
            {candidate: {...identity, sourceDigest: 7}, reason: 'corrupt'},
            {candidate: 'not-an-entry', reason: 'corrupt'},
            {candidate: null, reason: 'corrupt'}
        ];
        for (const item of cases) {
            const decision = qualifyTuiCacheEntry(item.candidate, identity);
            expect(decision.usable).withContext(item.reason).toBeFalse();
            expect(decision.reason).toBe(item.reason as typeof decision.reason);
            expect(decision.rebuildsLazily).toBeTrue();
            expect(decision.deletesDurableState).toBeFalse();
        }
        expect(TUI_MIGRATION_LIMITS.maxDerivedCacheBytes).toBe(67108864);
    });
});
