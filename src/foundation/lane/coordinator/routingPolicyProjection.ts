/**
 * Builds `coordinator/routing-policy.json` — a pinned projection of the
 * already-verified `InitPlan.routing`/`routingProvenance` (LC-01) plus the
 * installed knowledge pack's provenance. It never restates the routing
 * endpoints/classes themselves (`coordinator-routing.json` is their sole
 * owner); it only records policy version, a semantic digest, and knowledge
 * attribution, so no truth is duplicated across the two files.
 */
import {createWatchtowerError} from '../../../contracts/errors.js';
import {isJsonValue, semanticDigest} from '../../schemaComposition/jsonCanonicalizer.js';
import type {InitPlan} from '../../init/index.js';
import type {InstalledKnowledgeTag, RoutingPolicyDocument} from './coordinatorBaselineContracts.js';

export function buildRoutingPolicyDocument(
    routing: InitPlan['routing'],
    routingProvenance: InitPlan['routingProvenance'],
    installedKnowledge: InstalledKnowledgeTag
): RoutingPolicyDocument {
    if (!isJsonValue(routing)) {
        throw createWatchtowerError('ERR_INTEGRITY_FAILURE', {
            operation: 'materialize routing policy', target: 'coordinator-routing.json',
            remediation: 'Resolve a well-formed JSON coordinator routing policy before init.'
        });
    }
    const document: RoutingPolicyDocument = Object.freeze({
        schemaVersion: 1, policyVersion: routingProvenance.policyVersion, policyDigest: semanticDigest(routing),
        adapters: Object.freeze([...routingProvenance.adapters]), reserves: Object.freeze([...routingProvenance.reserves]),
        installedKnowledge
    });
    return document;
}
