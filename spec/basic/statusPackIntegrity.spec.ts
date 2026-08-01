import {cmd} from '@nirvana/base/terminal';
import {mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import type {WorkerEventRecord} from '../../src/contracts/index.js';
import {StatusAcceptedInputInspector} from '../../src/foundation/StatusAcceptedInputInspector.js';
import {StatusPackAcceptanceAuthority} from '../../src/foundation/StatusPackAcceptanceAuthority.js';
import {StatusPackIntegrity} from '../../src/foundation/StatusPackIntegrity.js';
import {StatusProjection} from '../../src/foundation/StatusProjection.js';
import {StatusSourceBaselineInspector} from '../../src/foundation/StatusSourceBaselineInspector.js';
import {compareRfc3339DateTimes, isRfc3339DateTime} from '../../src/foundation/rfc3339DateTime.js';
import type {PackAcceptanceRecord, PackManifestRecord} from '../../src/foundation/statusPackTypes.js';
import {
    createLane, createReadCommandFixture, repository, type LaneFixtureOptions
} from './readCommandFixtures.js';

describe('status pack integrity', function () {
    it('rejects optimistic roots, byte/file-set drift, and symlink entries', async function () {
        for (const mutation of ['empty', 'bytes', 'untracked', 'symlink'] as const) {
            const fixture = createReadCommandFixture();
            try {
                createLane(fixture, {lifecycle: 'paused'});
                const pack = join(fixture.controlHome, 'docs/spec/implementation/test-pack');
                if (mutation === 'empty') { rmSync(pack, {recursive: true}); mkdirSync(pack); }
                if (mutation === 'bytes') writeFileSync(join(pack, 'README.md'), 'changed\n');
                if (mutation === 'untracked') writeFileSync(join(pack, 'foreign.md'), 'foreign\n');
                if (mutation === 'symlink') symlinkSync('README.md', join(pack, 'foreign-link'));
                expect((await projection().project(query(fixture))).packIntegrity.status)
                    .withContext(mutation).not.toBe('valid');
            } finally { fixture.remove(); }
        }
    });

    it('requires canonical regular Git-current accepted inputs and sealed acceptance references', async function () {
        for (const mutation of ['same-byte-symlink', 'dirty-index', 'missing-acceptance-ref'] as const) {
            const fixture = createReadCommandFixture();
            try {
                createLane(fixture, {lifecycle: 'paused',
                    ...(mutation === 'missing-acceptance-ref' ? {acceptanceRef: 'review-batches/missing.md'} : {})});
                const input = join(fixture.controlHome, 'accepted-input.md');
                if (mutation === 'same-byte-symlink') {
                    const outside = join(fixture.root, 'same-input.md');
                    writeFileSync(outside, readFileSync(input)); rmSync(input); symlinkSync(outside, input);
                } else if (mutation === 'dirty-index') {
                    writeFileSync(input, 'dirty accepted input\n'); git(fixture.controlHome, ['add', 'accepted-input.md']);
                }
                const result = await projection().project(query(fixture));
                expect(result.packIntegrity.status).withContext(mutation)
                    .toBe(mutation === 'missing-acceptance-ref' ? 'invalid' : 'drift');
                expect(result.health.status).withContext(mutation).toBe('invalid');
            } finally { fixture.remove(); }
        }
    });

    it('classifies critical, unrelated, and unavailable source baselines', async function () {
        for (const state of ['critical', 'unrelated', 'unavailable'] as const) {
            const fixture = createReadCommandFixture();
            try {
                createLane(fixture, {lifecycle: 'paused',
                    ...(state === 'unavailable' ? {baselineRevision: 'deadbeef'} : {})});
                if (state !== 'unavailable') {
                    const path = state === 'critical' ? 'src/claimed.ts' : 'notes/unrelated.md';
                    mkdirSync(join(fixture.controlHome, path.split('/')[0]), {recursive: true});
                    writeFileSync(join(fixture.controlHome, path), `${state}\n`);
                    git(fixture.controlHome, ['add', path]); git(fixture.controlHome, ['commit', '-m', state]);
                }
                const result = await projection().project(query(fixture));
                const codes = result.health.warnings.map(item => item.code);
                if (state === 'unrelated') {
                    expect(result.packIntegrity.status).toBe('valid'); expect(codes).toContain('SOURCE_BASELINE_UNRELATED');
                } else {
                    expect(result.health.status).toBe('invalid'); expect(codes).toContain(state === 'critical' ?
                        'SOURCE_BASELINE_CRITICAL' : 'SOURCE_BASELINE_UNAVAILABLE');
                }
            } finally { fixture.remove(); }
        }
    });

    it('allows only explicitly optional proof-only read baseline unavailability', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {lifecycle: 'paused', repositories: [
                repository('main', fixture.controlHome, 'primary', 'write'),
                repository('secondary', fixture.secondary, 'consumer-proof', 'read')
            ], proofInputs: [{repository: 'secondary', path: 'accepted-input.md', optional: true}]});
            const baselines = new StatusSourceBaselineInspector({async changedPaths(repositoryPath) {
                return repositoryPath === fixture.secondary ? {state: 'unavailable' as const, paths: []} :
                    {state: 'available' as const, paths: []};
            }});
            const pack = new StatusPackIntegrity(undefined, undefined, undefined,
                new StatusAcceptedInputInspector(), baselines);
            const result = await projection(pack).project(query(fixture));
            expect(result.packIntegrity.status).toBe('valid');
            expect(result.health.warnings.map(item => item.code)).toContain('SOURCE_BASELINE_OPTIONAL_UNAVAILABLE');
        } finally { fixture.remove(); }
    });

    it('rejects malformed, escaping, unknown, duplicate, and contradictory proof inputs at both owners', async function () {
        const valid = createReadCommandFixture();
        try {
            mkdirSync(join(valid.controlHome, 'src')); writeFileSync(join(valid.controlHome, 'src/proof.ts'), 'proof\n');
            git(valid.controlHome, ['add', 'src/proof.ts']); git(valid.controlHome, ['commit', '-m', 'proof-input']);
            createLane(valid, {lifecycle: 'paused',
                batchProofInputs: [{repository: 'main', path: 'src/proof.ts', optional: false}]});
            expect((await projection().project(query(valid))).packIntegrity.status).toBe('valid');
            writeFileSync(join(valid.controlHome, 'src/proof.ts'), 'changed proof\n');
            git(valid.controlHome, ['add', 'src/proof.ts']); git(valid.controlHome, ['commit', '-m', 'proof-change']);
            const changed = await projection().project(query(valid));
            expect(changed.packIntegrity.status).toBe('drift');
            expect(changed.health.warnings.map(item => item.code)).toContain('SOURCE_BASELINE_CRITICAL');
        } finally { valid.remove(); }
        const proof = {repository: 'main', path: 'proof/input.md', optional: true};
        const cases: Array<{name: string; options: LaneFixtureOptions}> = [
            {name: 'traversal', options: {proofInputs: [{...proof, path: '../escape'}]}},
            {name: 'absolute', options: {proofInputs: [{...proof, path: '/escape'}]}},
            {name: 'malformed', options: {proofInputs: [{repository: 'main', path: 'proof'} as never]}},
            {name: 'extra', options: {proofInputs: [{...proof, extra: true} as never]}},
            {name: 'unknown-repository', options: {proofInputs: [{...proof, repository: 'missing'}]}},
            {name: 'duplicate', options: {proofInputs: [proof, proof]}},
            {name: 'contradictory', options: {proofInputs: [proof, {...proof, optional: false}]}},
            {name: 'batch-traversal', options: {batchProofInputs: [{...proof, path: '../escape'}]}},
            {name: 'cross-owner-duplicate', options: {proofInputs: [proof], batchProofInputs: [proof]}}
        ];
        for (const item of cases) {
            const fixture = createReadCommandFixture();
            try {
                createLane(fixture, {lifecycle: 'paused', ...item.options});
                const result = await projection().project(query(fixture));
                expect(result.packIntegrity.status).withContext(item.name).toBe('invalid');
                expect(result.health.status).withContext(item.name).toBe('invalid');
            } finally { fixture.remove(); }
        }
    });

    it('requires manifest and batch proof inputs to name exact regular Git paths', async function () {
        for (const owner of ['manifest', 'batch'] as const) for (const state of ['case', 'missing', 'symlink'] as const) {
            const fixture = createReadCommandFixture();
            try {
                if (state !== 'missing') {
                    mkdirSync(join(fixture.controlHome, 'evidence'));
                    if (state === 'symlink') symlinkSync('../accepted-input.md', join(fixture.controlHome, 'evidence/proof.ts'));
                    else writeFileSync(join(fixture.controlHome, 'evidence/proof.ts'), 'proof\n');
                    git(fixture.controlHome, ['add', 'evidence/proof.ts']);
                    git(fixture.controlHome, ['commit', '-m', `${owner}-${state}-proof`]);
                }
                const input = {repository: 'main', path: state === 'case' ? 'EVIDENCE/proof.ts' : 'evidence/proof.ts',
                    optional: false};
                createLane(fixture, {lifecycle: 'paused', ...(owner === 'manifest' ? {proofInputs: [input]} :
                    {batchProofInputs: [input]})});
                const result = await projection().project(query(fixture));
                expect(result.packIntegrity.status).withContext(`${owner}-${state}`).toBe('drift');
                expect(result.health.warnings.map(item => item.code)).withContext(`${owner}-${state}`)
                    .toContain('SOURCE_BASELINE_CRITICAL');
            } finally { fixture.remove(); }
        }
    });

    it('seals nested lock basenames and rejects tracked-set additions after publication', async function () {
        const accepted = createReadCommandFixture();
        try {
            createLane(accepted, {lifecycle: 'paused', nestedPackLock: true});
            expect((await projection().project(query(accepted))).packIntegrity.status).toBe('valid');
        } finally { accepted.remove(); }
        const drifted = createReadCommandFixture();
        try {
            createLane(drifted, {lifecycle: 'paused'});
            const nested = 'docs/spec/implementation/test-pack/work-batches/implementation-pack.lock.json';
            writeFileSync(join(drifted.controlHome, nested), '{"late":true}\n');
            git(drifted.controlHome, ['add', '-f', nested]); git(drifted.controlHome, ['commit', '-m', 'late-lock']);
            expect((await projection().project(query(drifted))).packIntegrity.status).toBe('drift');
        } finally { drifted.remove(); }
    });

    it('requires durable acceptance events and referenced superseding reviews', async function () {
        for (const state of ['missing-events', 'missing-reference', 'unknown-reference'] as const) {
            const fixture = createReadCommandFixture();
            try {
                createLane(fixture, {lifecycle: 'paused', omitReviewAuthority: state === 'missing-events',
                    ...(state === 'missing-events' ? {} : {acceptanceFindings: [{id: 'critical-1',
                        severity: 'critical', disposition: 'superseded', ...(state === 'unknown-reference' ?
                            {acceptedReviewRef: 'missing-review'} : {})}]})});
                expect((await projection().project(query(fixture))).packIntegrity.status).not.toBe('valid');
            } finally { fixture.remove(); }
        }
    });

    it('rejects date-only and impossible pack timestamps', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {lifecycle: 'paused', acceptedAt: '2026-08-01'});
            expect((await projection().project(query(fixture))).packIntegrity.status).toBe('invalid');
            expect(isRfc3339DateTime('2026-08-01')).toBeFalse();
            expect(isRfc3339DateTime('2026-02-29T00:00:00Z')).toBeFalse();
            expect(isRfc3339DateTime('1990-12-31T23:59:60Z')).toBeTrue();
            expect(compareRfc3339DateTimes('1990-12-31T23:59:60Z', '1991-01-01T00:00:00Z')).toBe(-1);
            expect(compareRfc3339DateTimes('1991-01-01T01:00:00+01:00', '1991-01-01T00:00:00Z')).toBe(0);
        } finally { fixture.remove(); }
    });
});

describe('status pack acceptance authority chain', function () {
    it('accepts a unique ordered primary review and same-pack superseding review', function () {
        const chain = reviewChain(); const authority = new StatusPackAcceptanceAuthority();
        expect(authority.valid(manifest, acceptance([]), [chain.author, chain.primary])).toBeTrue();
        expect(authority.valid(manifest, acceptance([{id: 'critical', severity: 'critical',
            disposition: 'superseded', acceptedReviewRef: chain.superseding.eventId}]),
        [chain.author, chain.primary, chain.superseding])).toBeTrue();
    });

    it('rejects cross-pack, unordered, ambiguous, and broken causal review evidence', function () {
        const mutations: Array<{name: string; records: (chain: ReviewChain) => WorkerEventRecord[]}> = [
            {name: 'wrong-pack-ref', records: c => [c.author, c.primary, withPayload(c.superseding, {batch: 'other'})]},
            {name: 'wrong-lane-ref', records: c => [c.author, c.primary, {...c.superseding, laneId: OTHER_LANE}]},
            {name: 'wrong-producer', records: c => [c.author, {...c.primary, producer: 'other-reviewer'}, c.superseding]},
            {name: 'wrong-session', records: c => [c.author,
                withPayload(c.primary, {session: 'other-session'}), c.superseding]},
            {name: 'correlation', records: c => [c.author, {...c.primary, correlationId: 'other'}, c.superseding]},
            {name: 'causation', records: c => [c.author, {...c.primary, causationId: 'other'}, c.superseding]},
            {name: 'duplicate-author', records: c => [c.author, {...c.author, eventId: 'author-2'}, c.primary, c.superseding]},
            {name: 'duplicate-primary', records: c => [c.author, c.primary,
                {...c.primary, eventId: 'review-2'}, c.superseding]},
            {name: 'journal-order', records: c => [c.primary, c.author, c.superseding]},
            {name: 'review-before-author', records: c => [{...c.author, sequence: 2, at: '2026-08-01T10:00:00Z'},
                {...c.primary, sequence: 1, at: '2026-08-01T09:00:00Z'}, c.superseding]},
            {name: 'ref-correlation', records: c => [c.author, c.primary,
                {...c.superseding, correlationId: 'other'}]},
            {name: 'ref-causation', records: c => [c.author, c.primary, {...c.superseding, causationId: 'other'}]}
        ];
        for (const mutation of mutations) {
            const chain = reviewChain();
            expect(new StatusPackAcceptanceAuthority().valid(manifest,
                acceptance([{id: 'critical', severity: 'critical', disposition: 'superseded',
                    acceptedReviewRef: chain.superseding.eventId}]), mutation.records(chain)))
                .withContext(mutation.name).toBeFalse();
        }
    });

    it('orders admitted leap-second review instants consistently', function () {
        const ordered = reviewChain();
        expect(new StatusPackAcceptanceAuthority().valid(manifest, acceptance([]),
            [{...ordered.author, at: '1990-12-31T23:59:60Z'},
                {...ordered.primary, at: '1991-01-01T00:00:00Z'}])).toBeTrue();
        const reversed = reviewChain();
        expect(new StatusPackAcceptanceAuthority().valid(manifest, acceptance([]),
            [{...reversed.author, at: '1991-01-01T00:00:00Z'},
                {...reversed.primary, at: '1990-12-31T23:59:60Z'}])).toBeFalse();
    });
});

type Fixture = ReturnType<typeof createReadCommandFixture>;
type ReviewChain = ReturnType<typeof reviewChain>;
const LANE = '11111111-1111-4111-8111-111111111111';
const OTHER_LANE = '22222222-2222-4222-8222-222222222222';
const manifest = {packId: 'test-pack', authoredByLaneId: LANE} as PackManifestRecord;
function acceptance(findings: PackAcceptanceRecord['findings']): PackAcceptanceRecord {
    return {reviewerId: 'reviewer-1', reviewSessionId: 'review-session-1', findings} as PackAcceptanceRecord;
}
function reviewChain() {
    const author = reviewEvent({eventId: 'author-1', type: 'handoff', sequence: 0, at: '2026-08-01T09:00:00Z',
        producer: 'author-1', causationId: null, role: 'implementer', session: 'author-session'});
    return {author,
        primary: reviewEvent({eventId: 'review-1', type: 'accept', sequence: 1, at: '2026-08-01T10:00:00Z',
            producer: 'reviewer-1', causationId: author.eventId, role: 'reviewer', session: 'review-session-1'}),
        superseding: reviewEvent({eventId: 'review-2', type: 'accept', sequence: 2, at: '2026-08-01T11:00:00Z',
            producer: 'reviewer-2', causationId: author.eventId, role: 'reviewer', session: 'review-session-2'})};
}
interface EventOptions {
    eventId: string; type: 'handoff' | 'accept'; sequence: number; at: string; producer: string;
    causationId: string | null; role: 'implementer' | 'reviewer'; session: string;
}
function reviewEvent(options: EventOptions): WorkerEventRecord {
    return {schemaVersion: 1, eventId: options.eventId, type: options.type, sequence: options.sequence, at: options.at,
        laneId: LANE, producer: options.producer, correlationId: 'pack-correlation', causationId: options.causationId,
        policyVersion: 'v1', payload: {role: options.role, batch: 'test-pack', session: options.session}};
}
function withPayload(event: WorkerEventRecord, changes: Partial<WorkerEventRecord['payload']>): WorkerEventRecord {
    return {...event, payload: {...event.payload, ...changes}};
}
function projection(packIntegrity?: StatusPackIntegrity): StatusProjection {
    return new StatusProjection({now: () => new Date('2026-08-01T10:05:00Z'), runtime: qualifiedRuntime,
        proofConflicts: availableProofConflicts, ...(packIntegrity === undefined ? {} : {packIntegrity}),
        tmuxObserver: () => ({async listSessionNames() { return []; }})});
}
function query(fixture: Fixture) {
    return {cwd: fixture.controlHome, environment: {WATCHTOWER_DATA_HOME: fixture.dataHome, PATH: '/usr/bin'}};
}
const qualifiedRuntime = {observe(configured: string | null) { return {qualification: 'valid' as const,
    configured, installed: configured, available: configured !== null,
    availableVersions: configured === null ? [] : [configured]}; }};
const availableProofConflicts = {inspect: () => ({available: true, conflicts: []})};
function git(cwd: string, args: string[]): void {
    cmd.execSync({command: 'git', args, options: {cwd, stdio: ['ignore', 'pipe', 'pipe']}});
}
