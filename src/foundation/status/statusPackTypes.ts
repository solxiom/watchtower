import type {JsonValue} from '../schemaComposition/schemaCompositionContracts.js';

export interface PackManifestRecord {
    readonly value: JsonValue;
    readonly packId: string;
    readonly packRepository: string;
    readonly authoredByLaneId: string;
    readonly repositories: readonly PackRepositoryRecord[];
    readonly sourceBaselines: JsonValue;
    readonly baselines: Readonly<Record<string, PackSourceBaseline>>;
    readonly acceptedInputs: readonly PackAcceptedInput[];
    readonly writablePaths: readonly PackRepositoryPath[];
    readonly proofInputs: readonly PackProofInput[];
}

export interface PackAcceptanceRecord {
    readonly value: JsonValue;
    readonly packId: string;
    readonly acceptedManifestDigest: string;
    readonly reviewedCommit: string;
    readonly reviewerId: string;
    readonly reviewSessionId: string;
    readonly findings: readonly PackAcceptanceFinding[];
}

export interface PackLockRecord {
    readonly packId: string;
    readonly sealId: string;
    readonly manifestDigest: string;
    readonly acceptanceDigest: string;
    readonly sourceBaselines: JsonValue;
    readonly files: readonly PackFileDigest[];
}

export interface PackFileDigest {readonly path: string; readonly sha256: string; readonly bytes: number;}
export interface PackRepositoryRecord {readonly id: string; readonly access: 'read' | 'write';}
export interface PackSourceBaseline {readonly revision: string; readonly dirty: boolean;}
export interface PackAcceptedInput {
    readonly repository: string; readonly path: string; readonly sha256: string; readonly acceptanceRef: string;
}
export interface PackRepositoryPath {readonly repository: string; readonly path: string;}
export interface PackProofInput extends PackRepositoryPath {readonly optional: boolean;}
export interface PackAcceptanceFinding {
    readonly id: string; readonly severity: 'info' | 'minor' | 'major' | 'critical';
    readonly disposition: 'closed' | 'superseded'; readonly acceptedReviewRef?: string;
}
