/**
 * `wt coordinator resolution show|sync-check` are read-only
 * (`specification-resolution.md` §9): they project durable bytes and never
 * write, rebase, or release a hold.
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import type {LaneManifestV1} from '../../../src/contracts/index.js';
import type {DiscoveredLane} from '../../../src/foundation/discovery/index.js';
import {nodeEffectFileSystem} from '../../../src/foundation/effect/nodeEffectFileSystem.js';
import {
    SpecificationResolutionReadService, type LaneLookupPort
} from '../../../src/foundation/lane/coordinator/mutation/SpecificationResolutionReadService.js';
import {laneDigest, makeLaneDir, removeLaneDir} from './support/mutationFixtures.js';

const DIGEST = `sha256:${'a'.repeat(64)}`;
const COMMIT = '0'.repeat(40);

function laneFor(laneDir: string): DiscoveredLane {
    const manifest: LaneManifestV1 = {
        schemaVersion: 1, laneId: 'lane-1', kind: 'implementation', slug: 'lane', initiativeId: 'init-1',
        controlHomeRepository: 'main', laneDir: '.watchtower/lanes/lane',
        repositories: [{id: 'main', role: 'primary', access: 'write'}]
    };
    return {laneId: 'lane-1', slug: 'lane', initiativeId: 'init-1', kind: 'implementation',
        controlHome: laneDir, laneDir, manifest, lifecycle: 'active'};
}

function serviceFor(laneDir: string): SpecificationResolutionReadService {
    const discovery: LaneLookupPort = {discover: () => ({lanes: [laneFor(laneDir)]})};
    return new SpecificationResolutionReadService({discovery, effectFiles: nodeEffectFileSystem});
}

function writeBlocker(laneDir: string, blockerId: string, overrides: Record<string, unknown> = {}): void {
    const dir = join(laneDir, 'coordinator', 'specification-blockers');
    mkdirSync(dir, {recursive: true});
    writeFileSync(join(dir, `${blockerId}.json`), JSON.stringify({
        schemaVersion: 1, blockerId, laneId: 'lane-1', packId: 'pack-1', packSeal: DIGEST, batchId: 'CA-25',
        classification: 'NORMATIVE_CONTRADICTION', blockerKind: 'contradiction', status: 'held',
        conflicts: [
            {reference: 'docs/spec/v1.md#10.3', digest: DIGEST, authorityRank: 1},
            {reference: 'docs/spec/coordinator-automation.md#19', digest: DIGEST, authorityRank: 2}
        ],
        affectedBatchIds: ['CA-25'], reportedAt: '2026-08-06T12:00:00Z', ...overrides
    }));
}

function writeActiveRevision(laneDir: string, blockerId: string, pending: readonly string[], overrides: Record<string, unknown> = {}): void {
    const dir = join(laneDir, 'coordinator', 'revision');
    mkdirSync(dir, {recursive: true});
    writeFileSync(join(dir, 'active-revision.json'), JSON.stringify({
        schemaVersion: 1, laneId: 'lane-1', activeSeal: DIGEST, supersedesSeal: null, blockerId,
        requiredCommit: COMMIT, activatedAt: '2026-08-06T12:00:00Z', worktreeSyncRequired: [...pending], ...overrides
    }));
}

/**
 * A valid blocker document as raw text, with named members replaced by literal
 * JSON source. `JSON.stringify` cannot express a repeated member name, so the
 * duplicate-member cases have to be written as bytes.
 */
function rawBlocker(blockerId: string, members: Record<string, string>): string {
    const source: Record<string, string> = {
        schemaVersion: '1', blockerId: `"${blockerId}"`, laneId: '"lane-1"', packId: '"pack-1"',
        packSeal: `"${DIGEST}"`, batchId: '"CA-25"', classification: '"NORMATIVE_CONTRADICTION"',
        blockerKind: '"contradiction"', status: '"held"',
        conflicts: `[{"reference": "docs/spec/v1.md#10.3", "digest": "${DIGEST}", "authorityRank": 1},
            {"reference": "docs/spec/coordinator-automation.md#19", "digest": "${DIGEST}", "authorityRank": 2}]`,
        affectedBatchIds: '["CA-25"]', reportedAt: '"2026-08-06T12:00:00Z"', ...members
    };
    return `{${Object.entries(source).map(([key, value]) => `"${key}": ${value}`).join(', ')}}`;
}

/** Raw bytes, so a spec can present members `JSON.stringify` cannot produce. */
function writeRawBlocker(laneDir: string, blockerId: string, text: string): void {
    const dir = join(laneDir, 'coordinator', 'specification-blockers');
    mkdirSync(dir, {recursive: true});
    writeFileSync(join(dir, `${blockerId}.json`), text);
}

function reasonOf(value: unknown): unknown {
    return (value as Record<string, unknown>).reason;
}

describe('specification-resolution read projections (CA-25)', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('projects the bounded durable blocker record and writes nothing', () => {
        writeBlocker(laneDir, 'blocker-1');
        const before = laneDigest(laneDir);
        const result = serviceFor(laneDir).show({cwd: laneDir}, 'blocker-1') as Record<string, unknown>;
        expect(result.operation).toBe('coordinator.resolution.show');
        const data = result.data as Record<string, unknown>;
        expect(data.blockerId).toBe('blocker-1');
        expect(data.status).toBe('held');
        expect((data.conflicts as unknown[]).length).toBe(2);
        expect(laneDigest(laneDir)).toEqual(before);
    });

    it('refuses a traversal identifier before touching the filesystem', () => {
        expect(serviceFor(laneDir).show({cwd: laneDir}, '../outside') as Record<string, unknown>)
            .toEqual({ok: false, reason: 'COORDINATOR_ARGUMENT_INVALID', path: '../outside'});
    });

    it('refuses a record carrying an unsupported member or a single conflict', () => {
        writeBlocker(laneDir, 'blocker-extra', {unexpected: true});
        expect((serviceFor(laneDir).show({cwd: laneDir}, 'blocker-extra') as Record<string, unknown>).reason)
            .toBe('COORDINATOR_SCHEMA_MISMATCH');
        writeBlocker(laneDir, 'blocker-thin', {conflicts: [{reference: 'docs/spec/v1.md', digest: DIGEST, authorityRank: 1}]});
        expect((serviceFor(laneDir).show({cwd: laneDir}, 'blocker-thin') as Record<string, unknown>).reason)
            .toBe('COORDINATOR_SCHEMA_MISMATCH');
    });

    it('refuses a blocker record belonging to another lane', () => {
        writeBlocker(laneDir, 'blocker-wrong-lane', {laneId: 'lane-2'});
        const before = laneDigest(laneDir);
        expect(reasonOf(serviceFor(laneDir).show({cwd: laneDir}, 'blocker-wrong-lane'))).toBe('COORDINATOR_SCHEMA_MISMATCH');
        expect(laneDigest(laneDir)).toEqual(before);
    });

    it('refuses seal, conflict, and impact digests that are not the v1 digest', () => {
        writeBlocker(laneDir, 'blocker-seal', {packSeal: 'sha256:short'});
        expect(reasonOf(serviceFor(laneDir).show({cwd: laneDir}, 'blocker-seal'))).toBe('COORDINATOR_SCHEMA_MISMATCH');
        writeBlocker(laneDir, 'blocker-conflict', {conflicts: [
            {reference: 'docs/spec/v1.md#10.3', digest: DIGEST, authorityRank: 1},
            {reference: 'docs/spec/coordinator-automation.md#19', digest: `sha256:${'A'.repeat(64)}`, authorityRank: 2}
        ]});
        expect(reasonOf(serviceFor(laneDir).show({cwd: laneDir}, 'blocker-conflict'))).toBe('COORDINATOR_SCHEMA_MISMATCH');
        writeBlocker(laneDir, 'blocker-impact', {impactDigest: 'not-a-digest'});
        expect(reasonOf(serviceFor(laneDir).show({cwd: laneDir}, 'blocker-impact'))).toBe('COORDINATOR_SCHEMA_MISMATCH');
    });

    it('refuses a reportedAt that is not the declared RFC 3339 date-time', () => {
        writeBlocker(laneDir, 'blocker-clock', {reportedAt: '2026-08-06 12:00:00'});
        expect(reasonOf(serviceFor(laneDir).show({cwd: laneDir}, 'blocker-clock'))).toBe('COORDINATOR_SCHEMA_MISMATCH');
        writeBlocker(laneDir, 'blocker-month', {reportedAt: '2026-13-06T12:00:00Z'});
        expect(reasonOf(serviceFor(laneDir).show({cwd: laneDir}, 'blocker-month'))).toBe('COORDINATOR_SCHEMA_MISMATCH');
    });

    it('fails closed on a repeated member whose surviving value is invalid', () => {
        writeRawBlocker(laneDir, 'blocker-duplicate', rawBlocker('blocker-duplicate',
            {packSeal: `"${DIGEST}", "packSeal": "sha256:not-a-digest"`}));
        expect(reasonOf(serviceFor(laneDir).show({cwd: laneDir}, 'blocker-duplicate'))).toBe('COORDINATOR_JSON_INVALID');
        writeRawBlocker(laneDir, 'blocker-broken', '{"schemaVersion": 1,}');
        expect(reasonOf(serviceFor(laneDir).show({cwd: laneDir}, 'blocker-broken'))).toBe('COORDINATOR_JSON_INVALID');
    });

    it('refuses a repeated member even when both values are valid and distinct', () => {
        // `JSON.parse` keeps only the last name, so this record would otherwise
        // project `closed` and hide that the bytes also claim `held`.
        writeRawBlocker(laneDir, 'blocker-two-status', rawBlocker('blocker-two-status',
            {status: '"held", "status": "closed"'}));
        const before = laneDigest(laneDir);
        expect(reasonOf(serviceFor(laneDir).show({cwd: laneDir}, 'blocker-two-status'))).toBe('COORDINATOR_JSON_INVALID');
        expect(laneDigest(laneDir)).toEqual(before);
        // Identical repeated values are refused on the same ground: the writer
        // never wrote one unambiguous document.
        writeRawBlocker(laneDir, 'blocker-same-status', rawBlocker('blocker-same-status',
            {status: '"held", "status": "held"'}));
        expect(reasonOf(serviceFor(laneDir).show({cwd: laneDir}, 'blocker-same-status'))).toBe('COORDINATOR_JSON_INVALID');
    });

    it('refuses a repeated member nested inside a conflict entry', () => {
        writeRawBlocker(laneDir, 'blocker-nested', rawBlocker('blocker-nested', {conflicts:
            `[{"reference": "docs/spec/v1.md#10.3", "digest": "${DIGEST}", "authorityRank": 1, "authorityRank": 2},
              {"reference": "docs/spec/coordinator-automation.md#19", "digest": "${DIGEST}", "authorityRank": 3}]`}));
        expect(reasonOf(serviceFor(laneDir).show({cwd: laneDir}, 'blocker-nested'))).toBe('COORDINATOR_JSON_INVALID');
    });

    it('still admits a record whose distinct members merely repeat a value', () => {
        // The fence is on repeated *names*; two members sharing one digest value
        // are an ordinary record and must still project.
        writeBlocker(laneDir, 'blocker-shared-value', {impactDigest: DIGEST});
        const data = (serviceFor(laneDir).show({cwd: laneDir}, 'blocker-shared-value') as Record<string, unknown>)
            .data as Record<string, unknown>;
        expect(data.impactDigest).toBe(DIGEST);
        expect(data.packSeal).toBe(DIGEST);
    });

    it('reads synchronization from the admitted revision rather than deciding it', () => {
        writeActiveRevision(laneDir, 'blocker-1', ['wt-1']);
        const before = laneDigest(laneDir);
        const stale = (serviceFor(laneDir).syncCheck({cwd: laneDir}, 'blocker-1', 'wt-1') as Record<string, unknown>).data as Record<string, unknown>;
        expect(stale.status).toBe('stale');
        expect(stale.satisfied).toBeFalse();
        expect(stale.requiredCommit).toBe(COMMIT);
        const clean = (serviceFor(laneDir).syncCheck({cwd: laneDir}, 'blocker-1', 'wt-2') as Record<string, unknown>).data as Record<string, unknown>;
        expect(clean.status).toBe('synchronized');
        expect(laneDigest(laneDir)).toEqual(before);
    });

    it('refuses a sync check for a blocker the active revision does not name', () => {
        writeActiveRevision(laneDir, 'blocker-1', []);
        expect((serviceFor(laneDir).syncCheck({cwd: laneDir}, 'blocker-9', 'wt-1') as Record<string, unknown>).reason)
            .toBe('COORDINATOR_ARGUMENT_INVALID');
    });

    it('refuses an active revision recorded for another lane', () => {
        writeActiveRevision(laneDir, 'blocker-1', ['wt-1'], {laneId: 'lane-2'});
        const before = laneDigest(laneDir);
        expect(reasonOf(serviceFor(laneDir).syncCheck({cwd: laneDir}, 'blocker-1', 'wt-1'))).toBe('COORDINATOR_SCHEMA_MISMATCH');
        expect(laneDigest(laneDir)).toEqual(before);
    });

    it('refuses a corrupt active-revision pointer instead of reporting synchronized', () => {
        mkdirSync(join(laneDir, 'coordinator', 'revision'), {recursive: true});
        writeFileSync(join(laneDir, 'coordinator', 'revision', 'active-revision.json'), '{"schemaVersion": 1,}');
        expect(reasonOf(serviceFor(laneDir).syncCheck({cwd: laneDir}, 'blocker-1', 'wt-1'))).toBe('COORDINATOR_SCHEMA_MISMATCH');
    });

    it('reports an unavailable revision instead of assuming a worktree is current', () => {
        expect((serviceFor(laneDir).syncCheck({cwd: laneDir}, 'blocker-1', 'wt-1') as Record<string, unknown>).reason)
            .toBe('COORDINATOR_CYCLE_UNAVAILABLE');
    });
});
