import {createWatchtowerError} from '../../../contracts/errors.js';
import {ROUTING_CAPABILITY_CLASSES, type RoutingClassification, type RoutingDecisionClass} from '../../../contracts/index.js';
import type {RouteClassificationInput} from './routingPolicyContracts.js';

const FLOOR: Readonly<Record<Exclude<RoutingDecisionClass, 'M0'>, typeof ROUTING_CAPABILITY_CLASSES[number]>> = {D1: 'C2', D2: 'C3', D3: 'C5'};

export function classifyRoute(input: RouteClassificationInput): RoutingClassification {
    for (const rule of input.policy.rules) {
        if (input.facts.matches[rule.guardId] !== true) continue;
        const minimumCapability = rule.decisionClass === 'M0' ? null : maxCapability(FLOOR[rule.decisionClass], rule.minimumCapability);
        return Object.freeze({ruleId: rule.ruleId, decisionClass: rule.decisionClass, minimumCapability,
            permittedProposalTypes: Object.freeze([...rule.permittedProposalTypes]), hold: rule.hold,
            policyVersion: input.policy.projection.policyVersion, policyDigest: input.policy.projection.policyDigest,
            knowledgeVersion: input.policy.projection.installedKnowledge.knowledgeVersion,
            knowledgeProvenance: input.policy.projection.installedKnowledge.provenance});
    }
    throw createWatchtowerError('ERR_POLICY_UNAVAILABLE', {operation: 'classify coordinator trigger', target: 'routing guards', remediation: 'Install a routing policy with a matching terminal rule, including no-work handling.'});
}

function maxCapability(first: typeof ROUTING_CAPABILITY_CLASSES[number], second: typeof ROUTING_CAPABILITY_CLASSES[number] | undefined): typeof ROUTING_CAPABILITY_CLASSES[number] {
    if (second === undefined) return first;
    return ROUTING_CAPABILITY_CLASSES.indexOf(first) >= ROUTING_CAPABILITY_CLASSES.indexOf(second) ? first : second;
}
