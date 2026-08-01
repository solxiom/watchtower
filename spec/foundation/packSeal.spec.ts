import {
    classifyDrift,
    computeDocumentDigest,
    computeSealId,
    fileDigest,
    sortSealedFiles
} from '../../src/foundation/index.js';
import type {DriftObservations, PackClaimPath, SealedFile} from '../../src/contracts/index.js';

const encoder = new TextEncoder();

function sealed(path: string, body: string): SealedFile {
    const bytes = encoder.encode(body);
    return {path, sha256: fileDigest(bytes), bytes: bytes.byteLength};
}

const files = sortSealedFiles([sealed('b.md', 'beta'), sealed('a.md', 'alpha')]);
const sealInput = {packId: 'p', manifestDigest: fileDigest(encoder.encode('m')),
    acceptanceDigest: fileDigest(encoder.encode('c')), sourceBaselines: {repo: {revision: 'abc1234', dirty: false}}, files};

describe('PackSeal — RFC 8785 reproduction', function () {
    it('is byte-identical across runs and independent of file input order', function () {
        expect(computeSealId(sealInput)).toBe(computeSealId(sealInput));
        const reordered = {...sealInput, files: [...files].reverse()};
        expect(computeSealId(reordered)).toBe(computeSealId(sealInput));
    });

    it('changes when any sealed digest, document digest, or identity changes', function () {
        const baseline = computeSealId(sealInput);
        expect(computeSealId({...sealInput, packId: 'q'})).not.toBe(baseline);
        expect(computeSealId({...sealInput, manifestDigest: fileDigest(encoder.encode('m2'))})).not.toBe(baseline);
        expect(computeSealId({...sealInput, files: [...files, sealed('c.md', 'gamma')]})).not.toBe(baseline);
    });

    it('derives a canonical document digest independent of key order', function () {
        expect(computeDocumentDigest({a: 1, b: 2})).toBe(computeDocumentDigest({b: 2, a: 1}));
        expect(computeDocumentDigest({a: 1})).not.toBe(computeDocumentDigest({a: 2}));
    });
});

function observations(overrides: Partial<DriftObservations>): DriftObservations {
    return {packRepository: 'nirvana', enumerationFailed: false, gitUnavailable: false, sealedFiles: [], extraEntries: [],
        acceptedInputs: [], claimPaths: [], baselines: [], ...overrides};
}

const claim: PackClaimPath = {repository: 'nirvana', path: 'src/**', writable: true};

describe('classifyDrift — closed §3.5 reason matrix', function () {
    it('passes a clean tree with no findings', function () {
        const clean = observations({sealedFiles: [{file: sealed('a.md', 'alpha'),
            presence: 'tracked', currentSha256: sealed('a.md', 'alpha').sha256, committedMatches: true}]});
        expect(classifyDrift(clean)).toEqual({ok: true, findings: []});
    });

    it('flags PACK_BYTES_CHANGED for altered or uncommitted sealed bytes', function () {
        const record = sealed('a.md', 'alpha');
        const altered = classifyDrift(observations({sealedFiles: [{file: record,
            presence: 'tracked', currentSha256: fileDigest(encoder.encode('changed')), committedMatches: true}]}));
        expect(altered.ok).toBe(false);
        expect(altered.findings[0].code).toBe('PACK_BYTES_CHANGED');
        const uncommitted = classifyDrift(observations({sealedFiles: [{file: record,
            presence: 'tracked', currentSha256: record.sha256, committedMatches: false}]}));
        expect(uncommitted.findings[0].code).toBe('PACK_BYTES_CHANGED');
    });

    it('fails closed when pack-root enumeration fails', function () {
        const result = classifyDrift(observations({enumerationFailed: true}));
        expect(result.ok).toBe(false);
        expect(result.findings[0].code).toBe('PACK_FILESET_CHANGED');
    });

    it('fails closed when a Git query is unavailable', function () {
        const result = classifyDrift(observations({gitUnavailable: true}));
        expect(result.ok).toBe(false);
        expect(result.findings.some((finding) => finding.code === 'PACK_FILESET_CHANGED')).toBe(true);
    });

    it('flags PACK_FILESET_CHANGED for non-tracked sealed files and extra entries', function () {
        for (const presence of ['untracked', 'ignored', 'symlink', 'absent'] as const) {
            const result = classifyDrift(observations({sealedFiles: [{file: sealed('a.md', 'alpha'),
                presence, currentSha256: null, committedMatches: false}]}));
            expect(result.findings[0].code).toBe('PACK_FILESET_CHANGED');
        }
        const extra = classifyDrift(observations({extraEntries: [{path: 'stray.md'}]}));
        expect(extra.findings[0].code).toBe('PACK_FILESET_CHANGED');
    });

    it('flags ACCEPTED_INPUT_CHANGED when an accepted input digest differs or is missing', function () {
        const input = {repository: 'nirvana', path: 'docs/x.md', sha256: fileDigest(encoder.encode('x')) as `sha256:${string}`,
            acceptanceRef: 'review-batches/B1.md'};
        const changed = classifyDrift(observations({acceptedInputs: [{input, currentSha256: fileDigest(encoder.encode('y'))}]}));
        expect(changed.findings[0].code).toBe('ACCEPTED_INPUT_CHANGED');
        const missing = classifyDrift(observations({acceptedInputs: [{input, currentSha256: null}]}));
        expect(missing.findings[0].code).toBe('ACCEPTED_INPUT_CHANGED');
    });

    it('classifies normalized glob claims as critical with accepted RM-08 semantics', function () {
        const critical = classifyDrift(observations({claimPaths: [claim],
            baselines: [{repository: 'nirvana', available: true, readOnly: false, proofOptional: false,
                changedPaths: ['src/foundation/PackSeal.ts']}]}));
        expect(critical.findings[0]).toEqual({code: 'SOURCE_BASELINE_CRITICAL', severity: 'fail',
            repository: 'nirvana', path: 'src/foundation/PackSeal.ts'});
        const suffixGlob = classifyDrift(observations({claimPaths: [{repository: 'nirvana', path: '*.ts', writable: false}],
            baselines: [{repository: 'nirvana', available: true, readOnly: false, proofOptional: false,
                changedPaths: ['index.ts']}]}));
        expect(suffixGlob.findings[0].code).toBe('SOURCE_BASELINE_CRITICAL');
    });

    it('flags a disjoint changed path as an unrelated warning', function () {
        const unrelated = classifyDrift(observations({claimPaths: [claim],
            baselines: [{repository: 'nirvana', available: true, readOnly: false, proofOptional: false,
                changedPaths: ['README.md']}]}));
        expect(unrelated.ok).toBe(true);
        expect(unrelated.findings[0].code).toBe('SOURCE_BASELINE_UNRELATED');
        expect(unrelated.findings[0].severity).toBe('warn');
    });

    it('excludes accepted-input paths from unrelated baseline drift', function () {
        const input = {repository: 'nirvana', path: 'docs/x.md', sha256: fileDigest(encoder.encode('x')) as `sha256:${string}`,
            acceptanceRef: 'review-batches/B1.md'};
        const result = classifyDrift(observations({acceptedInputs: [{input, currentSha256: input.sha256}],
            baselines: [{repository: 'nirvana', available: true, readOnly: false, proofOptional: false,
                changedPaths: ['docs/x.md']}]}));
        expect(result.findings.some((finding) => finding.code === 'SOURCE_BASELINE_UNRELATED')).toBe(false);
    });

    it('fails on an unavailable baseline unless the repository is read-only with optional proof', function () {
        const hard = classifyDrift(observations({baselines: [{repository: 'nirvana', available: false,
            readOnly: false, proofOptional: false, changedPaths: []}]}));
        expect(hard.ok).toBe(false);
        expect(hard.findings[0]).toEqual({code: 'SOURCE_BASELINE_UNAVAILABLE', severity: 'fail', repository: 'nirvana', path: ''});
        const exempt = classifyDrift(observations({baselines: [{repository: 'nirvana', available: false,
            readOnly: true, proofOptional: true, changedPaths: []}]}));
        expect(exempt.ok).toBe(true);
        expect(exempt.findings[0].severity).toBe('warn');
    });
});
