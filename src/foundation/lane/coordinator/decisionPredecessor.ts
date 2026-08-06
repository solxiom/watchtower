import type {EnvelopeDigest, PackIndexProvenance} from '../../../contracts/decision.js';
import {envelopeFailure} from './decisionEnvelopeErrors.js';

const DIGEST = /^sha256:[0-9a-f]{64}$/u;

interface AcceptanceProvenance {
    readonly repository: string;
    readonly path: string;
    readonly digest: EnvelopeDigest;
    readonly verdict: 'accept';
    readonly reviewerSessionId: string;
}

export interface AcceptanceReference {
    readonly repository: string;
    readonly path: string;
    readonly digest: EnvelopeDigest;
}

interface AcceptanceRecord extends AcceptanceReference {
    readonly schemaVersion: 1;
    readonly committed: true;
    readonly verdict: 'accept';
    readonly reviewerRole: 'reviewer';
    readonly independent: true;
    readonly reviewerSessionId: string;
    readonly subjectKind: 'index' | 'projection';
    readonly subjectId: string;
    readonly subjectRevision: number;
    readonly subjectDigest: EnvelopeDigest;
    readonly packSealId: string;
    readonly journalIdentity: string | null;
}

interface IndexEvidence {
    readonly state: 'accepted';
    readonly indexId: string;
    readonly laneId: string;
    readonly revision: number;
    readonly packIndex: PackIndexProvenance;
    readonly acceptance: AcceptanceProvenance;
}

interface ProjectionEvidence {
    readonly state: 'accepted';
    readonly laneId: string;
    readonly revision: number;
    readonly journalIdentity: string;
    readonly checkpointDigest: EnvelopeDigest;
    readonly acceptance: AcceptanceProvenance;
}

export interface CurrentPredecessorState {
    readonly index: {
        readonly state: 'accepted';
        readonly indexId: string;
        readonly laneId: string;
        readonly revision: number;
        readonly packIndex: PackIndexProvenance;
        readonly acceptance: AcceptanceReference;
    };
    readonly projections: {
        readonly state: 'accepted';
        readonly laneId: string;
        readonly revision: number;
        readonly journalIdentity: string;
        readonly checkpointDigest: EnvelopeDigest;
        readonly acceptance: AcceptanceReference;
    };
}

export interface ValidPredecessorEvidence {
    readonly index: IndexEvidence;
    readonly projections: ProjectionEvidence;
}

export function validateAuthoritativePredecessors(
    evidence: ValidPredecessorEvidence,
    current: CurrentPredecessorState,
    records: readonly unknown[],
    expectedLaneId: string
): void {
    if (records.length !== 2) fail('predecessorEvidence.acceptance', 'both CA-02 and CA-03 acceptance records are required');
    const indexRecord = validateAcceptanceRecord(records[0], evidence.index.acceptance, 'CA-02', 'index');
    const projectionRecord = validateAcceptanceRecord(records[1], evidence.projections.acceptance, 'CA-03', 'projection');
    if (!sameReference(evidence.index.acceptance, current.index.acceptance) || !sameReference(evidence.projections.acceptance, current.projections.acceptance)) {
        fail('predecessorEvidence.acceptance', 'acceptance reference is not bound to current state');
    }
    if (current.index.laneId !== expectedLaneId || current.projections.laneId !== expectedLaneId || current.index.state !== 'accepted' || current.projections.state !== 'accepted') {
        fail('predecessorEvidence.current', 'current predecessor state is stale, corrupt, or not accepted');
    }
    if (!samePackIndex(evidence.index.packIndex, current.index.packIndex) || evidence.index.indexId !== current.index.indexId || evidence.index.revision !== current.index.revision) {
        fail('predecessorEvidence.current.index', 'index identity or revision is stale');
    }
    if (evidence.projections.revision !== current.projections.revision || evidence.projections.journalIdentity !== current.projections.journalIdentity || evidence.projections.checkpointDigest !== current.projections.checkpointDigest) {
        fail('predecessorEvidence.current.projections', 'journal identity, checkpoint, or revision is stale');
    }
    if (indexRecord.reviewerSessionId !== evidence.index.acceptance.reviewerSessionId || projectionRecord.reviewerSessionId !== evidence.projections.acceptance.reviewerSessionId) {
        fail('predecessorEvidence.acceptance', 'resolved acceptance record reviewer session does not match evidence');
    }
    if (indexRecord.reviewerSessionId !== projectionRecord.reviewerSessionId || indexRecord.subjectRevision !== current.index.revision || projectionRecord.subjectRevision !== current.projections.revision) {
        fail('predecessorEvidence.acceptance', 'acceptance record is not bound to current predecessor revisions');
    }
    if (indexRecord.subjectId !== current.index.indexId || indexRecord.subjectDigest !== current.index.packIndex.manifestDigest || indexRecord.packSealId !== current.index.packIndex.packSealId || indexRecord.journalIdentity !== null) {
        fail('predecessorEvidence.acceptance.CA-02', 'index acceptance record provenance does not match current index');
    }
    if (projectionRecord.subjectId !== current.projections.journalIdentity || projectionRecord.subjectDigest !== current.projections.checkpointDigest || projectionRecord.journalIdentity !== current.projections.journalIdentity || projectionRecord.packSealId !== current.index.packIndex.packSealId) {
        fail('predecessorEvidence.acceptance.CA-03', 'projection acceptance record provenance does not match current journal');
    }
}

export function validateCurrentState(value: unknown, expectedLaneId: string): CurrentPredecessorState {
    const root = object(value, 'predecessorEvidence.current');
    exact(root, ['index', 'projections'], 'predecessorEvidence.current');
    const index = object(root.index, 'predecessorEvidence.current.index');
    exact(index, ['state', 'indexId', 'laneId', 'revision', 'packIndex', 'acceptance'], 'predecessorEvidence.current.index');
    const projections = object(root.projections, 'predecessorEvidence.current.projections');
    exact(projections, ['state', 'laneId', 'revision', 'journalIdentity', 'checkpointDigest', 'acceptance'], 'predecessorEvidence.current.projections');
    if (index.state !== 'accepted' || projections.state !== 'accepted') fail('predecessorEvidence.current', 'current predecessor state is stale, corrupt, or not accepted');
    assertLane(index.laneId, expectedLaneId, 'predecessorEvidence.current.index.laneId');
    assertLane(projections.laneId, expectedLaneId, 'predecessorEvidence.current.projections.laneId');
    text(index.indexId, 'predecessorEvidence.current.index.indexId'); positive(index.revision, 'predecessorEvidence.current.index.revision');
    const packIndex = validatePackIndex(index.packIndex);
    const indexAcceptance = validateReference(index.acceptance, 'predecessorEvidence.current.index.acceptance');
    positive(projections.revision, 'predecessorEvidence.current.projections.revision'); text(projections.journalIdentity, 'predecessorEvidence.current.projections.journalIdentity'); digest(projections.checkpointDigest, 'predecessorEvidence.current.projections.checkpointDigest');
    const projectionAcceptance = validateReference(projections.acceptance, 'predecessorEvidence.current.projections.acceptance');
    return {index: {state: 'accepted', indexId: index.indexId as string, laneId: index.laneId as string, revision: index.revision as number, packIndex, acceptance: indexAcceptance}, projections: {state: 'accepted', laneId: projections.laneId as string, revision: projections.revision as number, journalIdentity: projections.journalIdentity as string, checkpointDigest: projections.checkpointDigest as EnvelopeDigest, acceptance: projectionAcceptance}};
}

/** Resolves and validates authoritative CA-02/CA-03 evidence; literals are never accepted as authority. */
export function validatePredecessorEvidence(value: unknown, expectedLaneId: string): ValidPredecessorEvidence {
    const root = object(value, 'predecessorEvidence');
    exact(root, ['index', 'projections'], 'predecessorEvidence');
    const index = object(root.index, 'predecessorEvidence.index');
    exact(index, ['state', 'indexId', 'laneId', 'revision', 'packIndex', 'acceptance'], 'predecessorEvidence.index');
    if (index.state !== 'accepted') fail('predecessorEvidence.index.state', 'index is stale, corrupt, or not accepted');
    text(index.indexId, 'predecessorEvidence.index.indexId'); assertLane(index.laneId, expectedLaneId, 'predecessorEvidence.index.laneId'); positive(index.revision, 'predecessorEvidence.index.revision');
    const packIndex = validatePackIndex(index.packIndex);
    const indexAcceptance = validateAcceptance(index.acceptance, 'predecessorEvidence.index.acceptance');
    const projections = object(root.projections, 'predecessorEvidence.projections');
    exact(projections, ['state', 'laneId', 'revision', 'journalIdentity', 'checkpointDigest', 'acceptance'], 'predecessorEvidence.projections');
    if (projections.state !== 'accepted') fail('predecessorEvidence.projections.state', 'projection is stale, corrupt, or not accepted');
    assertLane(projections.laneId, expectedLaneId, 'predecessorEvidence.projections.laneId'); positive(projections.revision, 'predecessorEvidence.projections.revision');
    text(projections.journalIdentity, 'predecessorEvidence.projections.journalIdentity'); digest(projections.checkpointDigest, 'predecessorEvidence.projections.checkpointDigest');
    const projectionAcceptance = validateAcceptance(projections.acceptance, 'predecessorEvidence.projections.acceptance');
    if (indexAcceptance.reviewerSessionId !== projectionAcceptance.reviewerSessionId) fail('predecessorEvidence.acceptance', 'CA-02 and CA-03 evidence provenance does not agree');
    return {index: {state: 'accepted', indexId: index.indexId as string, laneId: index.laneId as string, revision: index.revision as number, packIndex, acceptance: indexAcceptance}, projections: {state: 'accepted', laneId: projections.laneId as string, revision: projections.revision as number, journalIdentity: projections.journalIdentity as string, checkpointDigest: projections.checkpointDigest as EnvelopeDigest, acceptance: projectionAcceptance}};
}

function validatePackIndex(value: unknown): PackIndexProvenance {
    const pack = object(value, 'predecessorEvidence.index.packIndex');
    exact(pack, ['packSealId', 'manifestDigest', 'compilerVersion'], 'predecessorEvidence.index.packIndex');
    text(pack.packSealId, 'predecessorEvidence.index.packIndex.packSealId'); digest(pack.manifestDigest, 'predecessorEvidence.index.packIndex.manifestDigest'); text(pack.compilerVersion, 'predecessorEvidence.index.packIndex.compilerVersion');
    return {packSealId: pack.packSealId as string, manifestDigest: pack.manifestDigest as EnvelopeDigest, compilerVersion: pack.compilerVersion as string};
}

function validateAcceptance(value: unknown, subject: string): AcceptanceProvenance {
    const acceptance = object(value, subject); exact(acceptance, ['repository', 'path', 'digest', 'verdict', 'reviewerSessionId'], subject);
    text(acceptance.repository, `${subject}.repository`); text(acceptance.path, `${subject}.path`); digest(acceptance.digest, `${subject}.digest`);
    if (acceptance.verdict !== 'accept') fail(`${subject}.verdict`, 'acceptance provenance is not an accepted reviewer record'); text(acceptance.reviewerSessionId, `${subject}.reviewerSessionId`);
    return {repository: acceptance.repository as string, path: acceptance.path as string, digest: acceptance.digest as EnvelopeDigest, verdict: 'accept', reviewerSessionId: acceptance.reviewerSessionId as string};
}

function validateAcceptanceRecord(value: unknown, reference: AcceptanceReference, subject: string, expectedKind: AcceptanceRecord['subjectKind']): AcceptanceRecord {
    const record = object(value, `predecessorEvidence.${subject}.acceptanceRecord`);
    exact(record, ['schemaVersion', 'repository', 'path', 'digest', 'committed', 'verdict', 'reviewerRole', 'independent', 'reviewerSessionId', 'subjectKind', 'subjectId', 'subjectRevision', 'subjectDigest', 'packSealId', 'journalIdentity'], `predecessorEvidence.${subject}.acceptanceRecord`);
    const resolved = validateReferenceFields(record, `predecessorEvidence.${subject}.acceptanceRecord`);
    if (!sameReference(resolved, reference)) fail(`predecessorEvidence.${subject}.acceptanceRecord`, 'resolved acceptance record does not match the evidence reference');
    if (record.schemaVersion !== 1 || record.committed !== true || record.verdict !== 'accept' || record.reviewerRole !== 'reviewer' || record.independent !== true) fail(`predecessorEvidence.${subject}.acceptanceRecord`, 'acceptance record is not a committed independent reviewer acceptance');
    text(record.reviewerSessionId, `predecessorEvidence.${subject}.acceptanceRecord.reviewerSessionId`); if (record.subjectKind !== expectedKind) fail(`predecessorEvidence.${subject}.acceptanceRecord.subjectKind`, `acceptance subject must be ${expectedKind}`);
    text(record.subjectId, `predecessorEvidence.${subject}.acceptanceRecord.subjectId`); positive(record.subjectRevision, `predecessorEvidence.${subject}.acceptanceRecord.subjectRevision`); digest(record.subjectDigest, `predecessorEvidence.${subject}.acceptanceRecord.subjectDigest`); text(record.packSealId, `predecessorEvidence.${subject}.acceptanceRecord.packSealId`);
    if (record.journalIdentity !== null) text(record.journalIdentity, `predecessorEvidence.${subject}.acceptanceRecord.journalIdentity`);
    return {...resolved, schemaVersion: 1, committed: true, verdict: 'accept', reviewerRole: 'reviewer', independent: true, reviewerSessionId: record.reviewerSessionId as string, subjectKind: record.subjectKind as 'index' | 'projection', subjectId: record.subjectId as string, subjectRevision: record.subjectRevision as number, subjectDigest: record.subjectDigest as EnvelopeDigest, packSealId: record.packSealId as string, journalIdentity: record.journalIdentity as string | null};
}

function validateReference(value: unknown, subject: string): AcceptanceReference {
    const reference = object(value, subject); exact(reference, ['repository', 'path', 'digest'], subject); text(reference.repository, `${subject}.repository`); text(reference.path, `${subject}.path`); digest(reference.digest, `${subject}.digest`);
    return {repository: reference.repository as string, path: reference.path as string, digest: reference.digest as EnvelopeDigest};
}

function validateReferenceFields(reference: Record<string, unknown>, subject: string): AcceptanceReference {
    text(reference.repository, `${subject}.repository`); text(reference.path, `${subject}.path`); digest(reference.digest, `${subject}.digest`);
    return {repository: reference.repository as string, path: reference.path as string, digest: reference.digest as EnvelopeDigest};
}

function sameReference(left: AcceptanceReference, right: AcceptanceReference): boolean { return left.repository === right.repository && left.path === right.path && left.digest === right.digest; }
function samePackIndex(left: PackIndexProvenance, right: PackIndexProvenance): boolean { return left.packSealId === right.packSealId && left.manifestDigest === right.manifestDigest && left.compilerVersion === right.compilerVersion; }

function assertLane(value: unknown, expected: string, subject: string): void { text(value, subject); if (value !== expected) fail(subject, 'predecessor identity belongs to another lane'); }
function positive(value: unknown, subject: string): void { if (!Number.isSafeInteger(value) || Number(value) < 1) fail(subject, 'revision must be a positive safe integer'); }
function digest(value: unknown, subject: string): void { if (typeof value !== 'string' || !DIGEST.test(value)) fail(subject, 'must be a sha256 digest'); }
function text(value: unknown, subject: string): void { if (typeof value !== 'string' || value.length === 0 || value.length > 512 || /[\u0000-\u001f\u007f]/u.test(value)) fail(subject, 'must be bounded text'); }
function object(value: unknown, subject: string): Record<string, unknown> { if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(subject, 'must be an object'); return value as Record<string, unknown>; }
function exact(value: Record<string, unknown>, keys: readonly string[], subject: string): void { const actual = Object.keys(value).sort(); const expected = [...keys].sort(); if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail(subject, 'contains missing, extra, or unsupported members'); }
function fail(subject: string, message: string): never { envelopeFailure('ENVELOPE_BUILD_FAILED', subject, message); }
