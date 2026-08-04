import {cmd} from '@nirvana/base/terminal';
import {chmodSync, lstatSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import type {WorkerEventRecord} from '../../src/contracts/index.js';
import {parseJsonlStream} from '../../src/foundation/parsing/index.js';
import {StatusPackAcceptanceAuthority} from '../../src/foundation/StatusPackAcceptanceAuthority.js';
import {StatusProjection} from '../../src/foundation/StatusProjection.js';
import {compareRfc3339DateTimes, isRfc3339DateTime} from '../../src/foundation/rfc3339DateTime.js';
import type {PackAcceptanceRecord, PackManifestRecord} from '../../src/foundation/statusPackTypes.js';
import {createLane, createReadCommandFixture} from './readCommandFixtures.js';

describe('RM-12 correction 05 regressions', function () {
    it('rejects historical pack and accepted-input Git symlink modes', async function () {
        const packFixture = createReadCommandFixture();
        try {
            createLane(packFixture, {lifecycle: 'paused', reviewedSymlinkPath: 'work-batches/WB-1.md'});
            expect((await projection().project(query(packFixture))).packIntegrity.status).not.toBe('valid');
        } finally { packFixture.remove(); }

        const inputFixture = createReadCommandFixture();
        try {
            const input = join(inputFixture.controlHome, 'accepted-input.md');
            rmSync(input); symlinkSync('accepted-symlink-target', input);
            git(inputFixture.controlHome, ['add', 'accepted-input.md']);
            git(inputFixture.controlHome, ['commit', '-m', 'symlink-accepted-input']);
            git(inputFixture.controlHome, ['config', 'core.symlinks', 'false']);
            rmSync(input); git(inputFixture.controlHome, ['checkout-index', '-f', '--', 'accepted-input.md']);
            expect(lstatSync(input).isFile()).toBeTrue();
            createLane(inputFixture, {lifecycle: 'paused'});
            expect((await projection().project(query(inputFixture))).packIntegrity.status).not.toBe('valid');
        } finally { inputFixture.remove(); }

        const currentPack = createReadCommandFixture();
        try {
            createLane(currentPack, {lifecycle: 'paused'});
            const brief = join(currentPack.controlHome,
                'docs/spec/implementation/test-pack/work-batches/WB-1.md');
            const bytes = readFileSync(brief, 'utf8');
            rmSync(brief); symlinkSync(bytes, brief);
            git(currentPack.controlHome, ['add', 'docs/spec/implementation/test-pack/work-batches/WB-1.md']);
            git(currentPack.controlHome, ['commit', '-m', 'symlink-current-pack-entry']);
            git(currentPack.controlHome, ['config', 'core.symlinks', 'false']);
            rmSync(brief); git(currentPack.controlHome, ['checkout-index', '-f', '--',
                'docs/spec/implementation/test-pack/work-batches/WB-1.md']);
            expect(lstatSync(brief).isFile()).toBeTrue();
            expect((await projection().project(query(currentPack))).packIntegrity.status).not.toBe('valid');
        } finally { currentPack.remove(); }
    });

    it('rejects sealed packs whose declared artifact or batch brief is missing', async function () {
        for (const path of ['README.md', 'work-batches/WB-1.md', 'review-batches/RB-1.md']) {
            const fixture = createReadCommandFixture();
            try {
                createLane(fixture, {lifecycle: 'paused', missingPackPath: path});
                const result = await projection().project(query(fixture));
                expect(result.packIntegrity.status).withContext(path).toBe('invalid');
                expect(result.health.status).withContext(path).toBe('invalid');
            } finally { fixture.remove(); }
        }
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {lifecycle: 'paused', requirementBatchId: 'missing-batch'});
            expect((await projection().project(query(fixture))).packIntegrity.status).toBe('invalid');
        } finally { fixture.remove(); }
    });

    it('admits leap seconds only at offset-normalized UTC month ends', function () {
        expect(isRfc3339DateTime('2026-08-01T12:34:60Z')).toBeFalse();
        expect(isRfc3339DateTime('1990-12-30T23:59:60Z')).toBeFalse();
        expect(isRfc3339DateTime('1990-12-31T23:58:60Z')).toBeFalse();
        expect(isRfc3339DateTime('1990-12-31T23:59:60Z')).toBeTrue();
        expect(isRfc3339DateTime('1991-01-01T00:59:60+01:00')).toBeTrue();
        expect(compareRfc3339DateTimes('1991-01-01T00:59:60+01:00',
            '1991-01-01T00:00:00Z')).toBe(-1);

        const invalid = event('author', 'handoff', 'implementer', 'author-session', 0,
            '2026-08-01T12:34:60Z', null);
        expect(parseJsonlStream(`${JSON.stringify(invalid)}\n`).records).toEqual([]);
        const author = event('author', 'handoff', 'implementer', 'author-session', 0,
            '1991-01-01T00:59:60+01:00', null);
        const review = event('review', 'accept', 'reviewer', 'review-session', 1,
            '1991-01-01T00:00:00Z', author.eventId);
        expect(new StatusPackAcceptanceAuthority().valid(manifest, acceptance, [author, review])).toBeTrue();
        expect(new StatusPackAcceptanceAuthority().valid(manifest, acceptance, [review, author])).toBeFalse();
    });

    it('bounds malformed, missing, unreadable, and escaping adjacent-lane bindings', async function () {
        for (const state of ['malformed', 'missing', 'unreadable', 'escape'] as const) {
            const fixture = createReadCommandFixture();
            try {
                createLane(fixture, {lifecycle: 'paused'});
                const adjacent = createLane(fixture, {slug: 'lane-b', laneId: OTHER_LANE, lifecycle: 'paused'});
                const bindings = join(adjacent, 'repositories.local.json');
                if (state === 'malformed') writeFileSync(bindings, '{}\n');
                if (state === 'missing') rmSync(bindings);
                if (state === 'unreadable') chmodSync(bindings, 0);
                if (state === 'escape') {
                    const outside = join(fixture.root, 'outside-bindings.json');
                    writeFileSync(outside, '{}\n'); rmSync(bindings); symlinkSync(outside, bindings);
                }
                const result = await projection().project({...query(fixture), lane: 'lane-a'});
                expect(result.health.warnings.map(item => String(item.code))).withContext(state)
                    .toContain('CONFLICT_OBSERVATION_INCOMPLETE');
                expect(result.health.status).withContext(state).toBe('attention');
            } finally { fixture.remove(); }
        }
    });
});

type Fixture = ReturnType<typeof createReadCommandFixture>;
const LANE = '11111111-1111-4111-8111-111111111111';
const OTHER_LANE = '22222222-2222-4222-8222-222222222222';
const manifest: PackManifestRecord = {value: {}, packId: 'test-pack', packRepository: 'main', authoredByLaneId: LANE,
    repositories: [], sourceBaselines: {}, baselines: {}, acceptedInputs: [], writablePaths: [], proofInputs: []};
const acceptance: PackAcceptanceRecord = {value: {}, packId: 'test-pack', acceptedManifestDigest: 'sha256:unused',
    reviewedCommit: 'unused', reviewerId: 'reviewer', reviewSessionId: 'review-session', findings: []};

function projection(): StatusProjection {
    return new StatusProjection({now: () => new Date('2026-08-01T10:05:00Z'), runtime: qualifiedRuntime,
        proofConflicts: {inspect: () => ({available: true, conflicts: []})},
        tmuxObserver: () => ({async listSessionNames() { return []; }})});
}
function query(fixture: Fixture) {
    return {cwd: fixture.controlHome, environment: {WATCHTOWER_DATA_HOME: fixture.dataHome, PATH: '/usr/bin'}};
}
function git(cwd: string, args: string[]): void {
    cmd.execSync({command: 'git', args, options: {cwd, stdio: ['ignore', 'pipe', 'pipe']}});
}
function event(eventId: string, type: 'handoff' | 'accept', role: 'implementer' | 'reviewer',
    session: string, sequence: number, at: string, causationId: string | null): WorkerEventRecord {
    return {schemaVersion: 1, eventId, type, sequence, at, laneId: LANE, producer: role === 'reviewer' ? 'reviewer' : 'author',
        correlationId: 'pack-correlation', causationId, policyVersion: 'v1', payload: {role, batch: 'test-pack', session}};
}
const qualifiedRuntime = {observe(configured: string | null) { return {qualification: 'valid' as const,
    configured, installed: configured, available: configured !== null,
    availableVersions: configured === null ? [] : [configured]}; }};
