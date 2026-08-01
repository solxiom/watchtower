import {createHash} from 'node:crypto';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {cmd} from '@nirvana/base/terminal';
import {expectedDecisions, expectedKnowledgeImports, expectedNormalizationEntries, expectedReferences, expectedTemplates, expectedTemplateState} from './ImportRecordExpectations.js';

export const sourceCommit = 'a12be396063c00086509f61ab2b584cbc4a97766';
export const transformId = 'remove-ascii-space-tab-before-lf/v1';
export const recordPath = join(process.cwd(), 'runtime-nvb', 'import-record.json');
const decisionClasses = ['TaskHandler', 'leaf', 'removal', 'temporary-wrapper'] as const;
const rootKeys = [
    'recordVersion', 'purpose', 'source', 'sourceBlobSha1', 'knowledgeImports',
    'knowledgeOutputSha256', 'normalizedKnowledgeImports', 'referenceOnlyDocuments',
    'laneOwnedTemplateDocuments', 'scripts', 'nonScriptTemplateState', 'nextOwner'
];
const sourceKeys = ['repository', 'commit', 'readMethod'];
const decisionKeys = ['classification', 'responsibility', 'laterOwner', 'rationale'];
const temporaryKeys = [...decisionKeys, 'removalOwner', 'expiry'];
const acceptedOwners = new Set([
    'RT-05', 'RT-06', 'UK-04', 'CA-03', 'CA-06', 'CA-07',
    'CA-11', 'CA-12', 'CA-13', 'CA-15', 'CA-22', 'CA-28'
]);

export const expectedPaths = [
    'AGENTS.md', 'README.md', 'agents/coordinator/AGENTS.md', 'agents/coordinator/SKILL.md',
    'agents/coordinator/adapters/README.md', 'agents/coordinator/state-machine.md',
    'bin/init-lane.sh', 'bin/install-coordinator-skill.sh', 'docs/bootstrap-checklist.md',
    'docs/cursor-loop-setup.md', 'docs/guides/README.md',
    'docs/guides/browser-proof-coordinator-playbook.md', 'docs/guides/coordinator-decision-rules.md',
    'docs/guides/durable-worker-events.md', 'docs/guides/lane-watcher-and-closure.md',
    'docs/guides/three-runtime-lessons.md', 'docs/guides/voice-vs-wake-and-piper.md',
    'docs/playbook.md', 'examples/html-tree-updater/README.md', 'examples/route-group-v2/README.md',
    'template/coordinator-tracker.md', 'template/coordinator/account-run-as.sh',
    'template/coordinator/codex-tmux-send.sh', 'template/coordinator/codex-upgrade-model-in-session.sh',
    'template/coordinator/coordinator-agent-brief.md', 'template/coordinator/coordinator-alert.sh',
    'template/coordinator/coordinator-assistant.sh', 'template/coordinator/coordinator-close-batch-sessions.sh',
    'template/coordinator/coordinator-nudge-message.sh', 'template/coordinator/coordinator-policy.md',
    'template/coordinator/coordinator-push-acceptance.sh', 'template/coordinator/coordinator-refresh-tracker.sh',
    'template/coordinator/coordinator-speak.sh', 'template/coordinator/coordinator-step.sh',
    'template/coordinator/coordinator-summarize-pane.sh', 'template/coordinator/coordinator-sync-session.sh',
    'template/coordinator/coordinator-sync-tracker.sh', 'template/coordinator/coordinator-voice-agent-summary.sh',
    'template/coordinator/coordinator-voice-monitor.sh', 'template/coordinator/coordinator-voice-once.sh',
    'template/coordinator/coordinator-watch.sh', 'template/coordinator/coordinator-worker-event.sh',
    'template/coordinator/coordinator-worker-prompt.sh', 'template/coordinator/hermes-local-agent-voice-prompt.md',
    'template/coordinator/implementer-agent-brief.md', 'template/coordinator/launch-implementer-opus.sh',
    'template/coordinator/launch-implementer.sh', 'template/coordinator/launch-reviewer.sh',
    'template/coordinator/model-plan.md', 'template/coordinator/resolve-account-cli.sh',
    'template/coordinator/restart-codex-coordinator.sh', 'template/coordinator/start-codex-coordinator.sh',
    'template/coordinator/start-coordinator-loop.sh', 'template/coordinator/start-voice-monitor.sh'
];

type DecisionClass = typeof decisionClasses[number];
type Decision = {classification: DecisionClass; responsibility: string; laterOwner: string; rationale: string; removalOwner?: string; expiry?: string};
type Normalization = {transformId: string; occurrences: number; outputSha256: string};
type AuditRecord = {
    sourceBlobSha1: Record<string, string>;
    knowledgeImports: string[];
    knowledgeOutputSha256: Record<string, string>;
    normalizedKnowledgeImports: Record<string, Normalization>;
    referenceOnlyDocuments: string[];
    laneOwnedTemplateDocuments: string[];
    scripts: Record<string, Decision>;
};

export class AuditError extends Error {
    constructor(readonly code: string) {
        super(code);
    }
}

function asObject(value: unknown, code: string): Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new AuditError(code);
    return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: string[], code: string): void {
    const actual = Object.keys(value).sort();
    if (actual.length !== keys.length || actual.some((key, index) => key !== [...keys].sort()[index])) throw new AuditError(code);
}

function exactStrings(actual: string[], expected: string[], code: string): void {
    if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) throw new AuditError(code);
}

function exactRootKeys(value: Record<string, unknown>): void {
    if (!Object.prototype.hasOwnProperty.call(value, 'recordVersion')) throw new AuditError('AUDIT_VERSION_INVALID');
    exactKeys(value, rootKeys, 'AUDIT_FIELD_UNSUPPORTED');
}

function nonEmptyString(value: unknown, code: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) throw new AuditError(code);
    return value;
}

function stringArray(value: unknown, code: string): string[] {
    if (!Array.isArray(value)) throw new AuditError(code);
    const result = value.map((item) => nonEmptyString(item, code));
    if (new Set(result).size !== result.length) throw new AuditError(code);
    return result;
}

function digest(value: unknown, code: string): string {
    const result = nonEmptyString(value, code);
    if (!/^sha256:[0-9a-f]{64}$/.test(result)) throw new AuditError(code);
    return result;
}

function parseSource(value: unknown): void {
    const source = asObject(value, 'AUDIT_SOURCE_INVALID');
    exactKeys(source, sourceKeys, 'AUDIT_SOURCE_INVALID');
    if (source.repository !== 'implementation-lane-coordinator' || source.commit !== sourceCommit) throw new AuditError('AUDIT_PROVENANCE_INVALID');
    if (source.readMethod !== 'git object database only; the source working tree was dirty and was not read') throw new AuditError('AUDIT_PROVENANCE_INVALID');
}

function parseBlobMap(value: unknown): Record<string, string> {
    const blobs = asObject(value, 'AUDIT_BLOBS_INVALID');
    exactKeys(blobs, expectedPaths, 'AUDIT_BLOBS_INVALID');
    return Object.fromEntries(Object.entries(blobs).map(([path, hash]) => {
        const result = nonEmptyString(hash, 'AUDIT_BLOBS_INVALID');
        if (!/^[0-9a-f]{40}$/.test(result)) throw new AuditError('AUDIT_BLOBS_INVALID');
        return [path, result];
    }));
}

function parseDecision(value: unknown): Decision {
    const decision = asObject(value, 'AUDIT_SCRIPT_INVALID');
    const classification = nonEmptyString(decision.classification, 'AUDIT_SCRIPT_INVALID');
    if (!decisionClasses.includes(classification as DecisionClass)) throw new AuditError('AUDIT_SCRIPT_INVALID');
    exactKeys(decision, classification === 'temporary-wrapper' ? temporaryKeys : decisionKeys, 'AUDIT_SCRIPT_INVALID');
    const common = {
        classification: classification as DecisionClass,
        responsibility: nonEmptyString(decision.responsibility, 'AUDIT_SCRIPT_INVALID'),
        laterOwner: nonEmptyString(decision.laterOwner, 'AUDIT_SCRIPT_INVALID'),
        rationale: nonEmptyString(decision.rationale, 'AUDIT_SCRIPT_INVALID')
    };
    if (!acceptedOwners.has(common.laterOwner)) throw new AuditError('AUDIT_OWNER_INVALID');
    if (classification !== 'temporary-wrapper') return common;
    const removalOwner = nonEmptyString(decision.removalOwner, 'AUDIT_TEMPORARY_INVALID');
    if (removalOwner !== common.laterOwner || !acceptedOwners.has(removalOwner)) throw new AuditError('AUDIT_OWNER_INVALID');
    return {...common, removalOwner, expiry: nonEmptyString(decision.expiry, 'AUDIT_TEMPORARY_INVALID')};
}

function parseScripts(value: unknown): Record<string, Decision> {
    const scripts = asObject(value, 'AUDIT_SCRIPTS_INVALID');
    exactKeys(scripts, Object.keys(expectedDecisions), 'AUDIT_SCRIPTS_INVALID');
    return Object.fromEntries(Object.entries(scripts).map(([path, decision]) => {
        const parsed = parseDecision(decision);
        const [classification, owner, removalOwner, expiry] = expectedDecisions[path];
        if (parsed.classification !== classification || parsed.laterOwner !== owner || parsed.removalOwner !== removalOwner) throw new AuditError('AUDIT_OWNER_INVALID');
        if (parsed.expiry !== expiry) throw new AuditError('AUDIT_EXPIRY_INVALID');
        return [path, parsed];
    }));
}

function parseOutputMap(value: unknown, imports: string[]): Record<string, string> {
    const outputs = asObject(value, 'AUDIT_OUTPUTS_INVALID');
    exactKeys(outputs, imports, 'AUDIT_OUTPUTS_INVALID');
    return Object.fromEntries(Object.entries(outputs).map(([path, value]) => [path, digest(value, 'AUDIT_OUTPUTS_INVALID')]));
}

function parseNormalizations(value: unknown, imports: string[]): Record<string, Normalization> {
    const entries = asObject(value, 'AUDIT_NORMALIZATIONS_INVALID');
    exactKeys(entries, expectedNormalizationEntries, 'AUDIT_NORMALIZATIONS_INVALID');
    return Object.fromEntries(Object.entries(entries).map(([path, value]) => [path, parseNormalization(value)]));
}

function parseNormalization(value: unknown): Normalization {
    const normalization = asObject(value, 'AUDIT_NORMALIZATIONS_INVALID');
    exactKeys(normalization, ['transformId', 'occurrences', 'outputSha256'], 'AUDIT_NORMALIZATIONS_INVALID');
    const occurrences = normalization.occurrences;
    const valid = normalization.transformId === transformId
        && typeof occurrences === 'number'
        && Number.isInteger(occurrences)
        && occurrences >= 1;
    if (!valid) throw new AuditError('AUDIT_NORMALIZATIONS_INVALID');
    return {
        transformId,
        occurrences,
        outputSha256: digest(normalization.outputSha256, 'AUDIT_NORMALIZATIONS_INVALID')
    };
}

function assertDocumentPartition(imports: string[], references: string[], templates: string[], scripts: Record<string, Decision>): void {
    const paths = [...imports, ...references, ...templates, ...Object.keys(scripts)];
    const matchesExpected = paths.length === expectedPaths.length
        && new Set(paths).size === paths.length
        && paths.every((path) => expectedPaths.includes(path));
    if (!matchesExpected) throw new AuditError('AUDIT_INVENTORY_INVALID');
}

function parseNextOwner(value: unknown): void {
    const owners = asObject(value, 'AUDIT_NEXT_OWNER_INVALID');
    exactKeys(owners, ['RT-02', 'RT-09', 'RT-10'], 'AUDIT_NEXT_OWNER_INVALID');
    Object.values(owners).forEach((owner) => nonEmptyString(owner, 'AUDIT_NEXT_OWNER_INVALID'));
}

export function parseAuditRecord(text: string): AuditRecord {
    let raw: unknown;
    try { raw = JSON.parse(text); } catch { throw new AuditError('AUDIT_JSON_INVALID'); }
    const root = asObject(raw, 'AUDIT_ROOT_INVALID');
    exactRootKeys(root);
    if (root.recordVersion !== 1) throw new AuditError('AUDIT_VERSION_INVALID');
    nonEmptyString(root.purpose, 'AUDIT_PURPOSE_INVALID');
    parseSource(root.source);
    const knowledgeImports = stringArray(root.knowledgeImports, 'AUDIT_IMPORTS_INVALID');
    exactStrings(knowledgeImports, expectedKnowledgeImports, 'AUDIT_IMPORTS_INVALID');
    const record: AuditRecord = {
        sourceBlobSha1: parseBlobMap(root.sourceBlobSha1),
        knowledgeImports,
        knowledgeOutputSha256: parseOutputMap(root.knowledgeOutputSha256, knowledgeImports),
        normalizedKnowledgeImports: parseNormalizations(root.normalizedKnowledgeImports, knowledgeImports),
        referenceOnlyDocuments: stringArray(root.referenceOnlyDocuments, 'AUDIT_DOCUMENTS_INVALID'),
        laneOwnedTemplateDocuments: stringArray(root.laneOwnedTemplateDocuments, 'AUDIT_DOCUMENTS_INVALID'),
        scripts: parseScripts(root.scripts)
    };
    exactStrings(record.referenceOnlyDocuments, expectedReferences, 'AUDIT_DOCUMENTS_INVALID');
    exactStrings(record.laneOwnedTemplateDocuments, expectedTemplates, 'AUDIT_DOCUMENTS_INVALID');
    assertDocumentPartition(record.knowledgeImports, record.referenceOnlyDocuments, record.laneOwnedTemplateDocuments, record.scripts);
    const state = stringArray(root.nonScriptTemplateState, 'AUDIT_STATE_INVALID');
    exactStrings(state, expectedTemplateState, 'AUDIT_STATE_INVALID');
    parseNextOwner(root.nextOwner);
    return record;
}

export function readAudit(): AuditRecord {
    return parseAuditRecord(readFileSync(recordPath, 'utf8'));
}

export function gitBlobSha1(bytes: Buffer): string {
    return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

export function sha256(bytes: Buffer): string {
    return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

export function normalizeTrailingWhitespace(bytes: Buffer): {bytes: Buffer; occurrences: number} {
    const output: number[] = [];
    let occurrences = 0;
    for (const byte of bytes) {
        if (byte === 10) {
            let removed = false;
            while (output.at(-1) === 32 || output.at(-1) === 9) { output.pop(); removed = true; }
            if (removed) occurrences++;
        }
        output.push(byte);
    }
    return {bytes: Buffer.from(output), occurrences};
}

export function readSourceBlob(
    path: string,
    repository = process.env.RT01_SOURCE_REPOSITORY ?? join(process.cwd(), '..', '..', 'implementation-lane-coordinator')
): Buffer {
    try {
        const output = cmd.execSync({
            command: 'git',
            args: ['-c', `safe.directory=${repository}`, '-C', repository, 'show', `${sourceCommit}:${path}`],
            options: {encoding: 'buffer', stdio: 'pipe'}
        });
        return Buffer.isBuffer(output) ? output : Buffer.from(output);
    } catch {
        throw new AuditError('AUDIT_SOURCE_UNAVAILABLE');
    }
}

export function verifySourceBlob(record: AuditRecord, path: string): Buffer {
    const bytes = readSourceBlob(path);
    if (gitBlobSha1(bytes) !== record.sourceBlobSha1[path]) throw new AuditError('AUDIT_SOURCE_BLOB_MISMATCH');
    return bytes;
}

export function importedPath(path: string): string {
    if (path === 'AGENTS.md') return 'knowledge/AGENTS.md';
    if (path.startsWith('agents/coordinator/adapters/')) return `knowledge/adapters/${path.split('/').at(-1)}`;
    if (path.startsWith('agents/coordinator/')) return `knowledge/skill/${path.split('/').at(-1)}`;
    if (path.startsWith('docs/guides/')) return `knowledge/guides/${path.split('/').at(-1)}`;
    if (path === 'docs/playbook.md') return 'knowledge/playbook.md';
    if (path.startsWith('docs/')) return `knowledge/${path.slice(5)}`;
    return 'knowledge/coordinator-policy-template.md';
}

export function snapshotAuditBytes(root = process.cwd()): Record<string, string> {
    const files = [join(root, 'runtime-nvb', 'import-record.json'), ...walkFiles(join(root, 'knowledge'))];
    return Object.fromEntries(files.sort().map((path) => [path, sha256(readFileSync(path))]));
}

function walkFiles(directory: string): string[] {
    return readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) return walkFiles(path);
        if (!entry.isFile() || statSync(path).isSymbolicLink()) throw new AuditError('AUDIT_PATH_INVALID');
        return [path];
    });
}
