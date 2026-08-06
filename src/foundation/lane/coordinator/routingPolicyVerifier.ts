import {createWatchtowerError} from '../../../contracts/errors.js';
import {isJsonValue, semanticDigest} from '../../schemaComposition/jsonCanonicalizer.js';
import type {KnowledgeProvenanceEvidence, RoutingRule} from '../../../contracts/index.js';
import type {RoutingPolicyDocument} from './coordinatorBaselineContracts.js';
import type {RoutingPolicyVerificationInput, RoutingPolicyVerificationResult} from './routingPolicyContracts.js';

const RULE_KEYS = ['ruleId', 'guardId', 'decisionClass', 'minimumCapability', 'permittedProposalTypes', 'hold'];
const DECISIONS = ['M0', 'D1', 'D2', 'D3'] as const;
const CAPABILITIES = ['C2', 'C3', 'C5'] as const;
const HOLDS = ['none', 'system', 'impact-scoped'] as const;

export function verifyRoutingPolicy(input: RoutingPolicyVerificationInput): RoutingPolicyVerificationResult {
    const routing = input.routing;
    const projection = projectionValue(input.projection);
    if (!isJsonValue(routing) || projection.policyDigest !== semanticDigest(routing) || projection.policyVersion !== 'shipping-v1') invalid('policy digest or version');
    const provenance = provenanceValue(input.installedKnowledge ?? projection.installedKnowledge.provenance);
    if (JSON.stringify(provenance) !== JSON.stringify(projection.installedKnowledge.provenance)) invalid('installed knowledge provenance');
    const rules = installedArtifactRules(input.installedPolicyArtifact, projection, input.acceptedRulesDigest);
    return {policy: Object.freeze({routing, projection, rules}), provenance};
}

function projectionValue(value: unknown): RoutingPolicyDocument {
    if (!record(value) || !only(value, ['schemaVersion', 'policyVersion', 'policyDigest', 'adapters', 'reserves', 'installedKnowledge']) ||
        value.schemaVersion !== 1 || value.policyVersion !== 'shipping-v1' ||
        typeof value.policyDigest !== 'string' || !record(value.installedKnowledge) ||
        !only(value.installedKnowledge, ['knowledgeVersion', 'provenance']) || typeof value.installedKnowledge.knowledgeVersion !== 'string' || !record(value.installedKnowledge.provenance) ||
        !only(value.installedKnowledge.provenance, ['repository', 'commit', 'importRecordSha256']) || !/^sha256:[0-9a-f]{64}$/u.test(value.policyDigest)) invalid('routing policy projection');
    const provenance = provenanceValue(value.installedKnowledge.provenance);
    return Object.freeze({schemaVersion: 1, policyVersion: 'shipping-v1', policyDigest: value.policyDigest as RoutingPolicyDocument['policyDigest'],
        adapters: Object.freeze(textArray(value.adapters)), reserves: Object.freeze(textArray(value.reserves)), installedKnowledge: Object.freeze({
            knowledgeVersion: value.installedKnowledge.knowledgeVersion, provenance
        })});
}

function parseRules(value: unknown): readonly RoutingRule[] {
    if (!Array.isArray(value) || value.length === 0) invalid('routing rules');
    const rules = value.map(parseRule);
    if (new Set(rules.map(rule => rule.ruleId)).size !== rules.length || new Set(rules.map(rule => rule.guardId)).size !== rules.length) invalid('duplicate routing rules');
    return Object.freeze(rules);
}

function installedArtifactRules(value: unknown, projection: RoutingPolicyDocument, acceptedRulesDigest: string): readonly RoutingRule[] {
    if (!record(value) || !only(value, ['schemaVersion', 'policyVersion', 'rules', 'manifest']) ||
        value.schemaVersion !== 1 || value.policyVersion !== 'shipping-v1' || !record(value.manifest)) invalid('installed routing policy artifact');
    const manifest = value.manifest;
    if (!only(manifest, ['schemaVersion', 'policyVersion', 'rulesDigest', 'installedKnowledge']) ||
        manifest.schemaVersion !== 1 || manifest.policyVersion !== 'shipping-v1' ||
        !/^sha256:[0-9a-f]{64}$/u.test(String(manifest.rulesDigest)) || !record(manifest.installedKnowledge) ||
        !only(manifest.installedKnowledge, ['knowledgeVersion', 'provenance']) ||
        manifest.installedKnowledge.knowledgeVersion !== projection.installedKnowledge.knowledgeVersion) invalid('installed routing policy manifest');
    const manifestProvenance = provenanceValue(manifest.installedKnowledge.provenance);
    if (JSON.stringify(manifestProvenance) !== JSON.stringify(projection.installedKnowledge.provenance)) invalid('installed routing policy manifest provenance');
    const rules = parseRules(value.rules);
    if (manifest.rulesDigest !== acceptedRulesDigest || rulesDigest(rules) !== acceptedRulesDigest) invalid('installed routing policy manifest rules digest');
    return rules;
}

function rulesDigest(rules: readonly RoutingRule[]): string {
    if (!isJsonValue(rules)) invalid('installed routing policy rules');
    return semanticDigest(rules);
}

function parseRule(value: unknown): RoutingRule {
    if (!record(value) || Object.keys(value).some(key => !RULE_KEYS.includes(key))) invalid('routing rule');
    const ruleId = value.ruleId;
    const guardId = value.guardId;
    const decisionClass = value.decisionClass;
    const minimumCapability = value.minimumCapability;
    const proposalTypes = value.permittedProposalTypes;
    const hold = value.hold;
    if (!text(ruleId) || !text(guardId) || !decision(decisionClass) ||
        (minimumCapability !== undefined && !capability(minimumCapability)) ||
        !Array.isArray(proposalTypes) || !proposalTypes.every(text) || !holdType(hold)) invalid('routing rule');
    if (decisionClass === 'M0' && minimumCapability !== undefined) invalid('M0 capability floor');
    if (decisionClass !== 'M0' && minimumCapability === undefined) invalid('missing decision capability floor');
    return Object.freeze({ruleId, guardId, decisionClass,
        ...(minimumCapability === undefined ? {} : {minimumCapability}),
        permittedProposalTypes: Object.freeze([...proposalTypes]), hold});
}

function provenanceValue(value: unknown): KnowledgeProvenanceEvidence {
    if (!record(value) || !text(value.repository) || !/^[0-9a-f]{40}$/u.test(String(value.commit)) ||
        !/^sha256:[0-9a-f]{64}$/u.test(String(value.importRecordSha256))) invalid('knowledge provenance');
    const repository = value.repository;
    const commit = value.commit;
    const importRecordSha256 = value.importRecordSha256;
    if (!text(repository) || typeof commit !== 'string' || !/^[0-9a-f]{40}$/u.test(commit) ||
        typeof importRecordSha256 !== 'string' || !/^sha256:[0-9a-f]{64}$/u.test(importRecordSha256)) invalid('knowledge provenance');
    return Object.freeze({repository, commit, importRecordSha256: importRecordSha256 as `sha256:${string}`});
}

function textArray(value: unknown): string[] { if (!Array.isArray(value) || !value.every(text)) invalid('routing projection arrays'); return [...value]; }
function only(value: Record<string, unknown>, keys: readonly string[]): boolean { return Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key)); }
function text(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && value.length <= 200 && !/[\u0000-\u001f\u007f]/u.test(value); }
function decision(value: unknown): value is RoutingRule['decisionClass'] { return DECISIONS.includes(value as typeof DECISIONS[number]); }
function capability(value: unknown): value is NonNullable<RoutingRule['minimumCapability']> { return CAPABILITIES.includes(value as typeof CAPABILITIES[number]); }
function holdType(value: unknown): value is RoutingRule['hold'] { return HOLDS.includes(value as typeof HOLDS[number]); }
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype; }
function invalid(target: string): never { throw createWatchtowerError('ERR_POLICY_UNAVAILABLE', {operation: 'verify coordinator routing policy', target, remediation: 'Reinstall or re-materialize the accepted routing policy and knowledge provenance.'}); }
