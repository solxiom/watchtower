/**
 * Default `KnowledgeProvenancePort`: resolves the installed knowledge pack
 * through RT-02/UK-04's own `resolveKnowledgeRoot` (the sole owner of
 * "newest valid installed knowledge pack" discovery) and projects only its
 * version and `provenance` block. This never reads or restates a knowledge
 * asset's Markdown bytes.
 */
import {resolveKnowledgeRoot} from '../../hostAdapters/knowledgePackSource.js';
import type {InstalledKnowledgeTag, KnowledgeProvenancePort} from './coordinatorBaselineContracts.js';

export function resolveInstalledKnowledgeTag(dataHome: string): InstalledKnowledgeTag {
    const pack = resolveKnowledgeRoot(dataHome);
    return Object.freeze({knowledgeVersion: pack.version, provenance: Object.freeze({...pack.manifest.provenance})});
}

export const nodeKnowledgeProvenanceHost: KnowledgeProvenancePort = Object.freeze({
    resolve: resolveInstalledKnowledgeTag
});
