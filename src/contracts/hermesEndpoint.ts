import type {DecisionProposal} from './proposals.js';

export const HERMES_ENDPOINT_REASONS = [
    'HERMES_INVALID_REQUEST', 'HERMES_NOT_INSTALLED', 'HERMES_IDENTITY_INVALID',
    'HERMES_IDENTITY_STALE', 'HERMES_ENVIRONMENT_INVALID', 'HERMES_MODEL_UNSUPPORTED',
    'HERMES_CATALOG_INVALID', 'HERMES_TIMEOUT_UNENFORCED', 'HERMES_PROCESS_GROUP_UNENFORCED',
    'HERMES_WRITE_ACCESS_UNENFORCED', 'HERMES_RESULT_SCHEMA_INVALID', 'HERMES_OUTPUT_INVALID',
    'HERMES_OUTPUT_TOO_LARGE', 'HERMES_FAILED', 'HERMES_CANCELLED', 'HERMES_UNAVAILABLE'
] as const;

export type HermesEndpointReason = typeof HERMES_ENDPOINT_REASONS[number];
export type HermesEndpointStatus = 'available' | 'not-installed' | 'unavailable';
export type HermesDigest = `sha256:${string}`;

export interface HermesInstallationIdentity {
    readonly executablePath: string;
    readonly executableDigest: HermesDigest;
    readonly installRoot: string;
    readonly configRoot: string;
    readonly dataRoot: string;
    readonly version: string;
    readonly environment: Readonly<Record<string, string>>;
}

export interface HermesCatalogEvidence {
    readonly fingerprint: HermesDigest;
    readonly model: string;
    readonly supportedModels: readonly string[];
    readonly capabilityEvidenceVersion: string;
    readonly current: boolean;
}

export interface HermesEndpointOptions {
    readonly process: HermesProcessPort;
    readonly adapterVersion: string;
    readonly installation: HermesInstallationIdentity;
    readonly catalog: HermesCatalogEvidence;
    readonly maxOutputBytes?: number;
    readonly maxInputBytes?: number;
}

export interface HermesProcessRequest {
    readonly executable: string;
    readonly args: readonly string[];
    readonly cwd: string;
    readonly environment: Readonly<Record<string, string>>;
    readonly input: string;
    readonly cancellation?: AbortSignal;
    readonly timeoutMs: number;
    readonly processGroup: boolean;
    readonly writeDeniedRoots: readonly string[];
}

export interface HermesProcessEnforcement {
    readonly timeout: boolean;
    readonly processGroupCancellation: boolean;
    readonly writeDenied: boolean;
}

export interface HermesProcessResult {
    readonly disposition: 'exited' | 'cancelled' | 'unavailable' | 'failed';
    readonly exitCode: number | null;
    readonly signal: string | null;
    readonly stdout: string;
    readonly stderr: string;
    readonly enforcement: HermesProcessEnforcement;
}

export interface HermesProcessPort {
    invoke(request: HermesProcessRequest): Promise<HermesProcessResult>;
}

export interface HermesProbeRequest {
    readonly cwd: string;
    readonly cancellation?: AbortSignal;
}

export interface HermesEndpointIdentity {
    readonly executablePath: string;
    readonly executableDigest: HermesDigest;
    readonly version: string;
    readonly adapterVersion: string;
    readonly catalogFingerprint: HermesDigest;
    readonly model: string;
    readonly capabilityEvidenceVersion: string;
    readonly fingerprint: HermesDigest;
}

export interface HermesProbeResult {
    readonly status: HermesEndpointStatus;
    readonly reason?: HermesEndpointReason;
    readonly identity?: HermesEndpointIdentity;
}

export interface HermesInvokeRequest extends HermesProbeRequest {
    readonly envelope: unknown;
}

export interface HermesInvokeSuccess {
    readonly outcome: 'completed';
    readonly result: DecisionProposal;
    readonly identity: HermesEndpointIdentity;
}

export interface HermesInvokeFailure {
    readonly outcome: 'failed' | 'cancelled';
    readonly reason: HermesEndpointReason;
    readonly diagnostic: string;
    readonly identity?: HermesEndpointIdentity;
}

export type HermesInvokeResult = HermesInvokeSuccess | HermesInvokeFailure;
