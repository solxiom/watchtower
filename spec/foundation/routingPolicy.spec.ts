import {semanticDigest} from '../../src/foundation/schemaComposition/jsonCanonicalizer.js';
import {
    classifyRoute, selectRouteEndpoint, verifyRoutingPolicy, type CoordinatorRoutingPolicy,
    type VerifiedRoutingPolicy
} from '../../src/foundation/lane/coordinator/index.js';
import type {RoutingRule, Sha256Digest} from '../../src/contracts/index.js';

describe('CA-05 ordered routing policy', function () {
    it('uses the first matching installed rule and carries policy provenance', function () {
        const verified = policy(v1Rules());
        const result = classifyRoute({policy: verified, facts: {matches: {'safety-integrity': true, 'normative-contradiction': true, 'no-work': true}}});
        expect(result.ruleId).toBe('safety-integrity-v1');
        expect(result.decisionClass).toBe('D3');
        expect(result.minimumCapability).toBe('C5');
        expect(result.hold).toBe('system');
        expect(result.knowledgeProvenance.commit).toBe('0'.repeat(40));
    });

    it('classifies every installed v1 guard at its declared decision floor', function () {
        const verified = policy(v1Rules());
        for (const expected of V1_RULES) {
            const result = classifyRoute({policy: verified, facts: {matches: {[expected.guardId]: true}}});
            expect(result.ruleId).withContext(expected.ruleId).toBe(expected.ruleId);
            expect(result.decisionClass).withContext(expected.ruleId).toBe(expected.decisionClass);
            expect(result.minimumCapability).withContext(expected.ruleId).toBe(expected.minimumCapability ?? null);
            expect(result.permittedProposalTypes).withContext(expected.ruleId).toEqual(expected.permittedProposalTypes);
            expect(result.hold).withContext(expected.ruleId).toBe(expected.hold);
        }
    });

    it('fails closed for incomplete, invented, stale, extra, and unaccepted installed policy artifacts', function () {
        const routing = baseRouting();
        const rules = v1Rules();
        const installedPolicyArtifact = installedArtifact(rules);
        const projection = projectionFor(routing, installedPolicyArtifact.manifest.installedKnowledge);
        expect(() => verifyRoutingPolicy({routing, projection: {...projection, policyDigest: `sha256:${'f'.repeat(64)}`}, acceptedRulesDigest: digestRules(rules), installedPolicyArtifact})).toThrowError(/routing policy/);
        const extra = [{...rules[0], future: true}, ...rules.slice(1)];
        expect(() => verifyRoutingPolicy({routing, projection, acceptedRulesDigest: digestRules(rules), installedPolicyArtifact: installedArtifact(extra)})).toThrowError(/routing policy/);
        const invented = [rule('invented', 'invented', 'D1', 'C2', [], 'none')];
        expect(() => verifyRoutingPolicy({routing, projection, acceptedRulesDigest: digestRules(rules), installedPolicyArtifact: installedArtifact(invented)})).toThrowError(/routing policy/);
        const incomplete = rules.slice(0, -1);
        expect(() => verifyRoutingPolicy({routing, projection, acceptedRulesDigest: digestRules(rules), installedPolicyArtifact: installedArtifact(incomplete)})).toThrowError(/routing policy/);
        expect(() => verifyRoutingPolicy({routing, projection, acceptedRulesDigest: digestRules(rules), installedPolicyArtifact: installedArtifact([...rules, rules[0]])})).toThrowError(/routing policy/);
        const changed = v1Rules({'normative-contradiction-v1': {...rules[1], hold: 'none', permittedProposalTypes: ['escalate']}});
        expect(() => verifyRoutingPolicy({routing, projection, acceptedRulesDigest: digestRules(rules), installedPolicyArtifact: installedArtifact(changed)})).toThrowError(/routing policy/);
        const changedKnowledge = knowledge(`sha256:${'1'.repeat(64)}`);
        const changedArtifact = installedArtifact(changed, changed, changedKnowledge);
        const changedProjection = projectionFor(routing, changedKnowledge);
        expect(verifyRoutingPolicy({routing, projection: changedProjection, acceptedRulesDigest: digestRules(changed), installedPolicyArtifact: changedArtifact}).policy.rules[1].hold).toBe('none');
    });

    it('enforces hard eligibility before economics and never routes M0', function () {
        const verified = policy(v1Rules());
        const classification = classifyRoute({policy: verified, facts: {matches: {'ready-ambiguous': true}}});
        const candidates = [
            candidate('high', 'C5', {enabled: false}, 0),
            candidate('fallback', 'C3', {enabled: true, available: true, access: true}, 4)
        ];
        expect(selectRouteEndpoint({policy: verified, classification, candidates}).endpointId).toBe('fallback');
        const m0 = classifyRoute({policy: verified, facts: {matches: {'no-work': true}}});
        expect(() => selectRouteEndpoint({policy: verified, classification: m0, candidates})).toThrowError(/M0/);
    });

    it('enforces a configured route floor and verified endpoint capability independently', function () {
        const routing = baseRouting();
        const routeFloor = {...routing, classes: {...routing.classes, D1: {minimumCapability: 'C5' as const, primary: 'high', fallbacks: []}}};
        const verified = policy(v1Rules(), routeFloor);
        const classification = classifyRoute({policy: verified, facts: {matches: {'ready-ambiguous': true}}});
        expect(() => selectRouteEndpoint({policy: verified, classification, candidates: [candidate('high', 'C3', {enabled: true}, 0)]})).toThrowError(/eligible endpoint/);
        expect(() => selectRouteEndpoint({policy: verified, classification, candidates: [candidate('high', 'C5', {enabled: true}, 0)]})).not.toThrow();
    });
});

function policy(rules: readonly RoutingRule[], routing = baseRouting()): VerifiedRoutingPolicy {
    const installedPolicyArtifact = installedArtifact(rules);
    return verifyRoutingPolicy({routing, projection: projectionFor(routing, installedPolicyArtifact.manifest.installedKnowledge), acceptedRulesDigest: digestRules(rules), installedPolicyArtifact}).policy;
}

function projectionFor(routing: CoordinatorRoutingPolicy, installedKnowledge: ReturnType<typeof knowledge>) {
    return {schemaVersion: 1 as const, policyVersion: 'shipping-v1' as const, policyDigest: digest(routing), adapters: ['opencode-cli'], reserves: ['complex-escalation'], installedKnowledge};
}

function installedArtifact(rules: readonly RoutingRule[], acceptedRules = rules, installedKnowledge = knowledge()) {
    return {schemaVersion: 1 as const, policyVersion: 'shipping-v1' as const, rules, manifest: {
        schemaVersion: 1 as const, policyVersion: 'shipping-v1' as const, rulesDigest: digestRules(acceptedRules), installedKnowledge
    }};
}

function rule(ruleId: string, guardId: string, decisionClass: RoutingRule['decisionClass'], minimumCapability: RoutingRule['minimumCapability'], permittedProposalTypes: readonly string[], hold: RoutingRule['hold']): RoutingRule {
    return {ruleId, guardId, decisionClass, ...(minimumCapability === undefined ? {} : {minimumCapability}), permittedProposalTypes, hold};
}

const V1_RULES: readonly RoutingRule[] = [
    rule('safety-integrity-v1', 'safety-integrity', 'D3', 'C5', ['propose-reconciliation', 'escalate'], 'system'),
    rule('normative-contradiction-v1', 'normative-contradiction', 'D3', 'C5', ['propose-specification-resolution', 'request-pack-amendment', 'escalate'], 'impact-scoped'),
    rule('pack-semantic-drift-v1', 'pack-semantic-drift', 'D3', 'C5', ['request-pack-amendment', 'escalate'], 'none'),
    rule('review-reject-repeated-v1', 'review-reject-repeated', 'D3', 'C5', ['classify-reject', 'open-correction', 'request-pack-amendment', 'escalate'], 'none'),
    rule('review-reject-v1', 'review-reject', 'D2', 'C3', ['classify-reject', 'open-correction', 'select-correction-route', 'escalate'], 'none'),
    rule('worker-blocked-unique-v1', 'worker-blocked-unique', 'M0', undefined, ['request-reroute'], 'none'),
    rule('worker-blocked-v1', 'worker-blocked', 'D2', 'C3', ['request-reroute', 'escalate'], 'none'),
    rule('review-accept-v1', 'review-accept', 'M0', undefined, ['record-acceptance'], 'none'),
    rule('ready-unique-v1', 'ready-unique', 'M0', undefined, ['select-ready-batch'], 'none'),
    rule('ready-ambiguous-critical-v1', 'ready-ambiguous-critical', 'D2', 'C3', ['select-ready-batch', 'escalate'], 'none'),
    rule('ready-ambiguous-v1', 'ready-ambiguous', 'D1', 'C2', ['select-ready-batch', 'escalate'], 'none'),
    rule('projection-query-v1', 'projection-query', 'M0', undefined, [], 'none'),
    rule('operator-complex-v1', 'operator-complex', 'D3', 'C5', ['escalate'], 'none'),
    rule('operator-bounded-v1', 'operator-bounded', 'D1', 'C2', ['escalate'], 'none'),
    rule('operator-default-v1', 'operator-default', 'D2', 'C3', ['escalate'], 'none'),
    rule('no-work-v1', 'no-work', 'M0', undefined, [], 'none')
];

function v1Rules(overrides: Partial<Record<string, RoutingRule>> = {}): readonly RoutingRule[] {
    return V1_RULES.map(item => overrides[item.ruleId] ?? item);
}

function candidate(endpointId: string, capabilityClass: 'C2' | 'C3' | 'C5', hardEligibility: Record<string, boolean>, economicsRank: number) {
    return {endpointId, capabilityClass, hardEligibility, economicsRank, capacityPoolId: endpointId};
}

function knowledge(importRecordSha256 = `sha256:${'0'.repeat(64)}`) {
    return {knowledgeVersion: '0.1.0', provenance: {repository: 'implementation-lane-coordinator', commit: '0'.repeat(40), importRecordSha256}};
}

function baseRouting(): CoordinatorRoutingPolicy {
    return {schemaVersion: 1, endpoints: [
        {endpointId: 'high', hostId: 'local', osUser: 'operator', adapterId: 'opencode-cli', provider: 'openai', accountId: 'primary', model: 'configured', effort: 'high', capabilityClass: 'C5'},
        {endpointId: 'fallback', hostId: 'local', osUser: 'operator', adapterId: 'opencode-cli', provider: 'openai', accountId: 'primary', model: 'configured', effort: 'standard', capabilityClass: 'C3'}],
        classes: {D1: {minimumCapability: 'C2', primary: 'high', fallbacks: ['fallback']}, D2: {minimumCapability: 'C3', primary: 'high', fallbacks: ['fallback']}, D3: {minimumCapability: 'C5', primary: 'high', fallbacks: []}},
        operatorSessionClasses: {D1: {primary: 'high', fallbacks: []}, D2: {primary: 'high', fallbacks: []}, D3: {primary: 'high', fallbacks: []}}, operatorSessionBudgetPolicyRef: 'context-policy.json#operatorSession'};
}

function digest(value: CoordinatorRoutingPolicy): string { return semanticDigest(JSON.parse(JSON.stringify(value))); }
function digestRules(value: readonly RoutingRule[]): Sha256Digest { return semanticDigest(JSON.parse(JSON.stringify(value))) as Sha256Digest; }
