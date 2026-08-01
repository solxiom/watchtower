import {
    computeDocumentDigest,
    computeSealId,
    fileDigest,
    gitUnavailable,
    gitValue,
    loadPackSchemaValidators,
    sortSealedFiles
} from '../../../src/foundation/index.js';
import type {
    GitOutcome,
    PackAcceptanceEvidence,
    PackConsumerContext,
    PackConsumerDeps,
    PackEntry,
    PackEvidenceInspector,
    PackFileSystem,
    PackGitInspector,
    PackSchemaValidators,
    PackSessionIdentity,
    PackTreeEntry,
    PathKind
} from '../../../src/foundation/index.js';
import type {SealedFile, WorkerEventRecord} from '../../../src/contracts/index.js';

const encoder = new TextEncoder();
export const PACK_REPOSITORY_ROOT = '/repo';
export const PACK_ROOT = '/repo/pack';
export const HEAD_COMMIT = 'f'.repeat(40);
export const REVIEWED_COMMIT = 'a'.repeat(40);
export const BASELINE_REVISION = 'b'.repeat(40);
export const AUTHOR_LANE_ID = '9d0ee3d2-8833-4fb7-b112-8438f04f57d2';
export const REVIEWER_LANE_ID = '1c2d3e4f-5678-4abc-9def-0123456789ab';
export const AUTHOR_SESSION_ID = 'session-author-1';
export const REVIEW_SESSION_ID = 'session-review-1';
export const ACCEPTED_INPUT_PATH = 'docs/spec/source-input.md';
export const ACCEPTED_INPUT_ACCEPTANCE_REF = 'docs/spec/source-input.acceptance.json';
export const ACCEPTED_INPUT_REPOSITORY = 'nirvana';
const ACCEPTED_INPUT_BYTES = new TextEncoder().encode('# accepted input\n');
export const ACCEPTED_INPUT_SHA256 = fileDigest(ACCEPTED_INPUT_BYTES);

const DEFAULT_SESSIONS: Record<string, PackSessionIdentity> = {
    [AUTHOR_SESSION_ID]: {sessionId: AUTHOR_SESSION_ID, laneId: AUTHOR_LANE_ID, role: 'author'},
    [REVIEW_SESSION_ID]: {sessionId: REVIEW_SESSION_ID, laneId: REVIEWER_LANE_ID, role: 'reviewer'}
};

const MARKDOWN_FILES = ['requirements-traceability.md', 'implementation-map.md',
    'implementation-quality-and-agent-rules.md', 'implementation-roadmap.md', 'implementation-tracker.md',
    'work-batches/B1.md', 'review-batches/B1.md'] as const;
const ACCEPTANCE_FILE = 'pack-acceptance.json';

export interface PackFixture {
    readonly context: PackConsumerContext;
    readonly files: Map<string, Uint8Array>;
    readonly entries: PackEntry[];
    readonly manifest: Record<string, unknown>;
    readonly lock: Record<string, unknown>;
    readonly acceptance: Record<string, unknown>;
    readonly candidatePaths: string[];
}

export interface PackFixtureOverrides {
    readonly manifest?: Record<string, unknown>;
    readonly acceptance?: Record<string, unknown>;
}

/** Builds a fully consistent, schema-valid, sealed implementation pack in memory. */
export function buildPackFixture(overrides: PackFixtureOverrides = {}): PackFixture {
    const acceptedInputBytes = ACCEPTED_INPUT_BYTES;
    const manifest = {...buildManifest(ACCEPTED_INPUT_SHA256), ...overrides.manifest};
    const manifestDigest = computeDocumentDigest(manifest);
    const acceptance = {...buildAcceptance(manifestDigest), ...overrides.acceptance};
    const acceptanceDigest = computeDocumentDigest(acceptance);
    const documentBytes = new Map<string, Uint8Array>([
        ['implementation-pack.json', encoder.encode(JSON.stringify(manifest))],
        [ACCEPTANCE_FILE, encoder.encode(JSON.stringify(acceptance))],
        ...MARKDOWN_FILES.map((path) => [path, encoder.encode(`# ${path}\n`)] as const)
    ]);
    const sealedFiles = sortSealedFiles([...documentBytes].map(([path, bytes]) => sealedFile(path, bytes)));
    const sealId = computeSealId({packId: manifest.packId as string, manifestDigest, acceptanceDigest,
        sourceBaselines: manifest.sourceBaselines as never, files: sealedFiles});
    const lock = buildLock(manifest.packId as string, sealId, manifestDigest, acceptanceDigest,
        manifest.sourceBaselines as Record<string, unknown>, sealedFiles);
    documentBytes.set('implementation-pack.lock.json', encoder.encode(JSON.stringify(lock)));
    return assemble(manifest, lock, acceptance, documentBytes, acceptedInputBytes);
}

function assemble(
    manifest: Record<string, unknown>, lock: Record<string, unknown>, acceptance: Record<string, unknown>,
    documentBytes: Map<string, Uint8Array>, acceptedInputBytes: Uint8Array
): PackFixture {
    const files = new Map<string, Uint8Array>();
    for (const [path, bytes] of documentBytes) files.set(`${PACK_ROOT}/${path}`, bytes);
    files.set(`${PACK_REPOSITORY_ROOT}/${ACCEPTED_INPUT_PATH}`, acceptedInputBytes);
    files.set(`${PACK_REPOSITORY_ROOT}/${ACCEPTED_INPUT_ACCEPTANCE_REF}`, encoder.encode('{"verdict":"accept"}\n'));
    const candidatePaths = [...documentBytes.keys()]
        .filter((path) => path !== ACCEPTANCE_FILE && path !== 'implementation-pack.lock.json')
        .map((path) => `pack/${path}`);
    return {
        context: {packRoot: PACK_ROOT, packRepositoryRoot: PACK_REPOSITORY_ROOT, headCommit: HEAD_COMMIT,
            sources: [{repository: 'nirvana', repositoryRoot: PACK_REPOSITORY_ROOT, readOnly: false, proofOptional: false}]},
        files, entries: buildEntries([...documentBytes.keys()]), manifest, lock, acceptance, candidatePaths};
}

function buildEntries(paths: readonly string[]): PackEntry[] {
    const directories = new Set<string>();
    const entries: PackEntry[] = [];
    for (const path of paths) {
        const slash = path.indexOf('/');
        if (slash !== -1) directories.add(path.slice(0, slash));
        entries.push({path, kind: 'file'});
    }
    return [...[...directories].map((path) => ({path, kind: 'directory' as const})), ...entries];
}

function sealedFile(path: string, bytes: Uint8Array): SealedFile {
    return {path, sha256: fileDigest(bytes), bytes: bytes.byteLength};
}

function buildManifest(acceptedInputDigest: string): Record<string, unknown> {
    return {
        schemaVersion: 1, packId: 'watchtower-v1', initiativeId: 'watchtower-v1',
        authoredByLaneId: AUTHOR_LANE_ID,
        kind: 'implementation', status: 'accepted',
        packRepository: 'nirvana', repositories: [{id: 'nirvana', role: 'primary', access: 'write'}],
        sourceBaselines: {nirvana: {revision: BASELINE_REVISION, dirty: false}},
        acceptedInputs: [{repository: 'nirvana', path: ACCEPTED_INPUT_PATH,
            sha256: acceptedInputDigest, acceptanceRef: ACCEPTED_INPUT_ACCEPTANCE_REF}],
        artifacts: {readme: 'implementation-map.md', traceability: 'requirements-traceability.md',
            implementationMap: 'implementation-map.md', qualityRules: 'implementation-quality-and-agent-rules.md',
            roadmap: 'implementation-roadmap.md', tracker: 'implementation-tracker.md',
            acceptance: 'pack-acceptance.json', seal: 'implementation-pack.lock.json'},
        requirements: [{id: 'REQ-1', repository: 'nirvana', source: 'requirements-traceability.md',
            workBatches: ['B1'], reviewBatches: ['B1']}],
        batches: [{id: 'B1', title: 'Batch one', dependsOn: [], primaryRepository: 'nirvana',
            workBrief: 'work-batches/B1.md', reviewBrief: 'review-batches/B1.md', requirements: ['REQ-1'],
            repositories: [{id: 'nirvana', access: 'write', paths: ['src/**'], claimMode: 'exclusive-write'}],
            implementationReasoning: 'R5', reviewReasoning: 'R5', workload: 'large', proofClasses: ['unit']}]
    };
}

function buildAcceptance(manifestDigest: string): Record<string, unknown> {
    return {
        schemaVersion: 1, packId: 'watchtower-v1', verdict: 'accept', reviewerId: 'reviewer-1',
        reviewSessionId: REVIEW_SESSION_ID, acceptedManifestDigest: manifestDigest,
        findings: [{id: 'F-1', severity: 'critical', disposition: 'closed'}],
        reviewedCommit: REVIEWED_COMMIT, acceptedAt: '2026-07-31T12:00:00Z'
    };
}

function buildLock(
    packId: string, sealId: string, manifestDigest: string, acceptanceDigest: string,
    sourceBaselines: Record<string, unknown>, files: readonly SealedFile[]
): Record<string, unknown> {
    return {schemaVersion: 1, packId, sealId, manifestDigest, acceptanceDigest, sourceBaselines,
        files: files.map((file) => ({path: file.path, sha256: file.sha256, bytes: file.bytes})),
        generatedAt: '2026-07-31T12:05:00Z'};
}

/** In-memory filesystem adapter backed by the fixture's absolute-path byte map. */
export function fakeFileSystem(fixture: PackFixture): PackFileSystem {
    return {
        readFile(absolutePath: string): Uint8Array {
            const bytes = fixture.files.get(absolutePath);
            if (bytes === undefined) throw Object.assign(new Error(`ENOENT ${absolutePath}`), {code: 'ENOENT'});
            return bytes;
        },
        listEntries: () => fixture.entries,
        authorizeContained: (root, relativePath, kind: PathKind) => {
            if (kind === 'directory') {
                const base = relativePath === '.' ? root : `${root}/${relativePath}`;
                return [...fixture.files.keys()].some((path) => path.startsWith(`${base}/`)) ? 'ok' : 'missing';
            }
            return fixture.files.has(`${root}/${relativePath}`) ? 'ok' : 'missing';
        }
    };
}

/** A predicate double result: a definite boolean, or `'unavailable'` for a Git failure. */
export type FakeGitBoolean = boolean | 'unavailable';

export interface FakeGitOptions {
    readonly tracked?: (path: string) => FakeGitBoolean;
    readonly ignored?: (path: string) => FakeGitBoolean;
    readonly committedMatches?: (path: string) => FakeGitBoolean;
    readonly ancestor?: (ancestor: string, descendant: string) => FakeGitBoolean;
    readonly changedPaths?: (revision: string) => readonly string[] | null;
    readonly treeFiles?: (commit: string, prefix: string) => readonly PackTreeEntry[] | null;
    readonly blobId?: (ref: string, path: string) => string | null;
}

function outcome(value: FakeGitBoolean): GitOutcome<boolean> {
    return value === 'unavailable' ? gitUnavailable() : gitValue(value);
}

/** Configurable async read-only Git double; defaults describe a clean, committed pack. */
export function fakeGit(fixture: PackFixture, options: FakeGitOptions = {}): PackGitInspector {
    const tree = fixture.candidatePaths.map((path) => ({path, symlink: false}));
    return {
        isTracked: (_root, path) => Promise.resolve(outcome((options.tracked ?? (() => true))(path))),
        isIgnored: (_root, path) => Promise.resolve(outcome((options.ignored ?? (() => false))(path))),
        committedMatches: (_root, path) => Promise.resolve(outcome((options.committedMatches ?? (() => true))(path))),
        isAncestor: (_root, ancestor, descendant) =>
            Promise.resolve(outcome((options.ancestor ?? ((a, b) => a === REVIEWED_COMMIT && b === HEAD_COMMIT))(ancestor, descendant))),
        changedPathsSince: (_root, revision) => Promise.resolve((options.changedPaths ?? (() => []))(revision)),
        treeFiles: (_root, commit, prefix) => Promise.resolve((options.treeFiles ?? (() => tree))(commit, prefix)),
        blobId: (_root, ref, path) => Promise.resolve((options.blobId ?? ((_ref, target) => `oid-${target}`))(ref, path))
    };
}

/** Default durable accepted-review evidence bound to the fixture's accepted input. */
function defaultAcceptanceEvidence(root: string, relativePath: string): PackAcceptanceEvidence | null {
    return root === PACK_REPOSITORY_ROOT && relativePath === ACCEPTED_INPUT_ACCEPTANCE_REF
        ? {verdict: 'accept', repository: ACCEPTED_INPUT_REPOSITORY, inputPath: ACCEPTED_INPUT_PATH,
            inputSha256: ACCEPTED_INPUT_SHA256, reviewSessionId: REVIEW_SESSION_ID} : null;
}

/** Current-main pack review chain: one author, one primary acceptance, and one independent superseding acceptance. */
export function packReviewEvents(): readonly WorkerEventRecord[] {
    const author: WorkerEventRecord = {schemaVersion: 1, eventId: 'pack-author-event', type: 'handoff', sequence: 0,
        at: '2026-07-31T11:00:00Z', laneId: AUTHOR_LANE_ID, producer: 'author-1', correlationId: 'pack-review:watchtower-v1',
        causationId: null, policyVersion: 'v1', payload: {role: 'implementer', batch: 'watchtower-v1', session: AUTHOR_SESSION_ID}};
    const review: WorkerEventRecord = {schemaVersion: 1, eventId: 'pack-review-event', type: 'accept', sequence: 1,
        at: '2026-07-31T12:00:00Z', laneId: AUTHOR_LANE_ID, producer: 'reviewer-1', correlationId: author.correlationId,
        causationId: author.eventId, policyVersion: author.policyVersion,
        payload: {role: 'reviewer', batch: 'watchtower-v1', session: REVIEW_SESSION_ID}};
    const superseding: WorkerEventRecord = {schemaVersion: 1, eventId: 'accepted-review-event', type: 'accept', sequence: 2,
        at: '2026-07-31T13:00:00Z', laneId: AUTHOR_LANE_ID, producer: 'reviewer-2', correlationId: author.correlationId,
        causationId: author.eventId, policyVersion: author.policyVersion,
        payload: {role: 'reviewer', batch: 'watchtower-v1', session: 'session-review-2'}};
    return [author, review, superseding];
}

/** Durable event/session/evidence double with a valid current-main review chain by default. */
export function fakeEvidence(
    resolve?: (id: string) => PackSessionIdentity | null,
    acceptance?: (root: string, relativePath: string) => PackAcceptanceEvidence | null,
    events?: (authoredByLaneId: string) => readonly WorkerEventRecord[] | null
): PackEvidenceInspector {
    return {
        resolveSession: resolve ?? ((id) => DEFAULT_SESSIONS[id] ?? null),
        resolveAcceptanceEvidence: acceptance ?? defaultAcceptanceEvidence,
        resolveReviewEvents: events ?? ((laneId) => laneId === AUTHOR_LANE_ID ? packReviewEvents() : null)
    };
}

export function deps(fixture: PackFixture, git = fakeGit(fixture), evidence = fakeEvidence()): PackConsumerDeps {
    return {fs: fakeFileSystem(fixture), git, validators: realValidators(), evidence};
}

/** Real ajv-compiled validators from the staged RM-13 schema bundle. */
export function realValidators(): PackSchemaValidators {
    const result = loadPackSchemaValidators();
    if (result.ok === false) throw new Error(`schema validators unavailable: ${result.error.message}`);
    return result.validators;
}
