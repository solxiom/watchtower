import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, realpathSync, statSync} from 'node:fs';
import {isAbsolute, relative} from 'node:path';
import type {
    HermesCatalogEvidence, HermesEndpointIdentity, HermesEndpointOptions,
    HermesEndpointReason, HermesInvokeRequest, HermesInvokeResult, HermesProbeRequest, HermesProbeResult,
    HermesProcessResult, HermesInstallationIdentity
} from '../../../contracts/hermesEndpoint.js';
import type {DecisionProposal} from '../../../contracts/proposals.js';
import {ProposalShapeError} from '../../proposal/proposalErrors.js';
import {validateProposalShape} from '../../proposal/proposalSchema.js';
import {hasDuplicateJsonObjectKey} from '../../schemaComposition/jsonDuplicateKeyDetector.js';

const DEFAULT_MAX_OUTPUT = 256 * 1024;
const DEFAULT_MAX_INPUT = 256 * 1024;
const VERSION = /^hermes(?:[- ]agent)?\s+([0-9][^\s]*)/iu;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const MODE_EXECUTABLE = 0o111;

export class HermesEndpointAdapter {
    private readonly maxOutputBytes: number;
    private readonly maxInputBytes: number;

    constructor(private readonly options: HermesEndpointOptions) {
        this.maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT;
        this.maxInputBytes = options.maxInputBytes ?? DEFAULT_MAX_INPUT;
        if (!positive(this.maxOutputBytes) || !positive(this.maxInputBytes)) throw new Error('Hermes endpoint bounds must be positive safe integers.');
    }

    async probe(request: HermesProbeRequest): Promise<HermesProbeResult> {
        const requestReason = validateCwd(request.cwd);
        if (requestReason !== undefined) return {status: 'unavailable', reason: requestReason};
        const identityReason = inspectInstallation(this.options.installation);
        if (identityReason === 'HERMES_NOT_INSTALLED') return {status: 'not-installed', reason: identityReason};
        if (identityReason !== undefined) return {status: 'unavailable', reason: identityReason};
        const catalogReason = validateCatalog(this.options.catalog);
        if (catalogReason !== undefined) return {status: 'unavailable', reason: catalogReason};
        const result = await this.invokeProcess(['--version'], request.cwd, '', request.cancellation, 10_000);
        if (result.disposition === 'unavailable') return {status: 'not-installed', reason: 'HERMES_NOT_INSTALLED'};
        if (result.disposition === 'cancelled') return {status: 'unavailable', reason: 'HERMES_CANCELLED'};
        const version = parseVersion(result);
        const safetyReason = enforcementReason(result);
        if (safetyReason !== undefined) return {status: 'unavailable', reason: safetyReason};
        if (result.disposition !== 'exited' || result.exitCode !== 0 || version === undefined || version !== this.options.installation.version) return {status: 'unavailable', reason: 'HERMES_IDENTITY_STALE'};
        return {status: 'available', identity: this.identity(version)};
    }

    async invoke(request: HermesInvokeRequest): Promise<HermesInvokeResult> {
        const preflight = this.preflight(request);
        if (preflight !== undefined) return {outcome: 'failed', reason: preflight, diagnostic: 'Hermes request failed preflight validation.'};
        const encoded = safeJson(request.envelope);
        if (encoded === undefined || Buffer.byteLength(encoded, 'utf8') > this.maxInputBytes) return {outcome: 'failed', reason: 'HERMES_INVALID_REQUEST', diagnostic: 'The decision envelope is not bounded JSON.'};
        const probe = await this.probe(request);
        if (probe.status !== 'available' || probe.identity === undefined) return {outcome: 'failed', reason: probe.reason ?? 'HERMES_UNAVAILABLE', diagnostic: 'Hermes is not available or its identity is stale.'};
        const result = await this.invokeProcess(['chat', '--quiet', '--json'], request.cwd, encoded, request.cancellation, 600_000);
        const identity = this.identity(probe.identity.version);
        return this.parseResult(result, identity);
    }

    private preflight(request: HermesInvokeRequest): HermesEndpointReason | undefined {
        const cwdReason = validateCwd(request.cwd);
        if (cwdReason !== undefined) return cwdReason;
        const identityReason = inspectInstallation(this.options.installation);
        if (identityReason !== undefined) return identityReason;
        return validateCatalog(this.options.catalog) ?? validateEnvelope(request.envelope);
    }

    private async invokeProcess(args: readonly string[], cwd: string, input: string, cancellation: AbortSignal | undefined, timeoutMs: number): Promise<HermesProcessResult> {
        return this.options.process.invoke({
            executable: this.options.installation.executablePath, args, cwd,
            environment: this.options.installation.environment, input, cancellation, timeoutMs,
            processGroup: true,
            writeDeniedRoots: [cwd, this.options.installation.installRoot, this.options.installation.configRoot, this.options.installation.dataRoot]
        });
    }

    private parseResult(result: HermesProcessResult, identity: HermesEndpointIdentity): HermesInvokeResult {
        if (!result.enforcement.timeout) return {outcome: 'failed', reason: 'HERMES_TIMEOUT_UNENFORCED', diagnostic: 'The process seam did not enforce the wall-clock bound.', identity};
        if (!result.enforcement.processGroupCancellation) return {outcome: 'failed', reason: 'HERMES_PROCESS_GROUP_UNENFORCED', diagnostic: 'The process seam did not enforce process-group cancellation.', identity};
        if (!result.enforcement.writeDenied) return {outcome: 'failed', reason: 'HERMES_WRITE_ACCESS_UNENFORCED', diagnostic: 'The process seam did not enforce write denial.', identity};
        if (result.disposition === 'cancelled') return {outcome: 'cancelled', reason: 'HERMES_CANCELLED', diagnostic: 'Hermes invocation was cancelled.', identity};
        if (result.disposition !== 'exited' || result.exitCode !== 0) return {outcome: 'failed', reason: 'HERMES_FAILED', diagnostic: redact(result.stderr), identity};
        if (Buffer.byteLength(result.stdout, 'utf8') > this.maxOutputBytes) return {outcome: 'failed', reason: 'HERMES_OUTPUT_TOO_LARGE', diagnostic: 'Hermes output exceeded the configured bound.', identity};
        const proposal = parseProposal(result.stdout);
        return proposal === undefined
            ? {outcome: 'failed', reason: 'HERMES_RESULT_SCHEMA_INVALID', diagnostic: 'Hermes did not return one schema-valid decision proposal.', identity}
            : {outcome: 'completed', result: proposal, identity};
    }

    private identity(version: string): HermesEndpointIdentity {
        const installation = this.options.installation;
        const catalog = this.options.catalog;
        const fingerprint = digest({executable: installation.executableDigest, version, adapter: this.options.adapterVersion, catalog: catalog.fingerprint, model: catalog.model, capability: catalog.capabilityEvidenceVersion});
        return {executablePath: installation.executablePath, executableDigest: installation.executableDigest, version, adapterVersion: this.options.adapterVersion, catalogFingerprint: catalog.fingerprint, model: catalog.model, capabilityEvidenceVersion: catalog.capabilityEvidenceVersion, fingerprint};
    }
}

function inspectInstallation(identity: HermesInstallationIdentity): HermesEndpointReason | undefined {
    if (!validIdentityShape(identity)) return 'HERMES_IDENTITY_INVALID';
    if (!inside(identity.installRoot, identity.executablePath)) return 'HERMES_IDENTITY_INVALID';
    try {
        const executable = realpathSync(identity.executablePath);
        if (executable !== identity.executablePath || !inside(identity.installRoot, executable)) return 'HERMES_IDENTITY_INVALID';
        const executableStat = statSync(executable);
        if (!executableStat.isFile() || (executableStat.mode & MODE_EXECUTABLE) === 0 || digestFile(executable) !== identity.executableDigest) return 'HERMES_IDENTITY_STALE';
        for (const directory of [identity.installRoot, identity.configRoot, identity.dataRoot]) {
            if (realpathSync(directory) !== directory || !statSync(directory).isDirectory()) return 'HERMES_IDENTITY_INVALID';
        }
        if (lstatSync(identity.executablePath).isSymbolicLink()) return 'HERMES_IDENTITY_INVALID';
        return undefined;
    } catch (error: unknown) {
        return errorCode(error) === 'ENOENT' && !exists(identity.executablePath) ? 'HERMES_NOT_INSTALLED' : 'HERMES_IDENTITY_INVALID';
    }
}

function validateCatalog(catalog: HermesCatalogEvidence): HermesEndpointReason | undefined {
    if (!DIGEST.test(catalog.fingerprint) || !catalog.current || catalog.capabilityEvidenceVersion.length === 0 || catalog.model.length === 0) return 'HERMES_CATALOG_INVALID';
    if (!catalog.supportedModels.includes(catalog.model)) return 'HERMES_MODEL_UNSUPPORTED';
    return undefined;
}

function validateEnvelope(value: unknown): HermesEndpointReason | undefined {
    if (!record(value) || value.schemaVersion !== 1) return 'HERMES_INVALID_REQUEST';
    return undefined;
}

function validateCwd(value: string): HermesEndpointReason | undefined {
    try { return isAbsolute(value) && realpathSync(value) === value && statSync(value).isDirectory() ? undefined : 'HERMES_INVALID_REQUEST'; } catch { return 'HERMES_INVALID_REQUEST'; }
}

function validIdentityShape(identity: HermesInstallationIdentity): boolean {
    const paths = [identity.executablePath, identity.installRoot, identity.configRoot, identity.dataRoot];
    return paths.every(path => isAbsolute(path) && !path.includes('..') && !path.includes('\0'))
        && DIGEST.test(identity.executableDigest) && identity.version.length > 0 && validEnvironment(identity.environment)
        && identity.environment.HERMES_HOME === identity.dataRoot
        && ['HOME', 'HERMES_HOME', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME'].every(key => {
            const value = identity.environment[key];
            return value === undefined || isAbsolute(value);
        });
}

function validEnvironment(environment: Readonly<Record<string, string>>): boolean {
    const keys = Object.keys(environment);
    return keys.length > 0 && keys.every(key => ['HOME', 'PATH', 'HERMES_HOME', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME'].includes(key))
        && Object.values(environment).every(value => typeof value === 'string' && value.length > 0 && !value.includes('\0'));
}

function parseProposal(value: string): DecisionProposal | undefined {
    const parsed = parseJson(value);
    if (parsed === undefined || hasDuplicateJsonObjectKey(value)) return undefined;
    try {
        return validateProposalShape(parsed);
    } catch (thrown) {
        if (thrown instanceof ProposalShapeError) return undefined;
        throw thrown;
    }
}

function parseJson(value: string): unknown {
    try { return JSON.parse(value.trim()) as unknown; } catch { return undefined; }
}

function safeJson(value: unknown): string | undefined { try { const result = JSON.stringify(value); return result; } catch { return undefined; } }
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype; }
function digest(value: unknown): `sha256:${string}` { return `sha256:${createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex')}`; }
function digestFile(path: string): `sha256:${string}` { return `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`; }
function inside(root: string, child: string): boolean { const relativePath = relative(root, child); return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath)); }
function exists(path: string): boolean { try { lstatSync(path); return true; } catch { return false; } }
function positive(value: number): boolean { return Number.isSafeInteger(value) && value > 0; }
function parseVersion(result: HermesProcessResult): string | undefined { return VERSION.exec(result.stdout.trim())?.[1]; }
function errorCode(error: unknown): string | undefined { return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' ? error.code : undefined; }
function redact(value: string): string { return value.replace(/(token|key|secret|authorization)=?\s*[^\s,;]+/giu, '$1=[redacted]').slice(0, 4096); }
function enforcementReason(result: HermesProcessResult): HermesEndpointReason | undefined { if (!result.enforcement.timeout) return 'HERMES_TIMEOUT_UNENFORCED'; if (!result.enforcement.processGroupCancellation) return 'HERMES_PROCESS_GROUP_UNENFORCED'; if (!result.enforcement.writeDenied) return 'HERMES_WRITE_ACCESS_UNENFORCED'; return undefined; }
