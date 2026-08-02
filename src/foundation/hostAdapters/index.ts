import {createWatchtowerError} from '../../contracts/errors.js';
import {createClaudeHostAdapter} from './claudeHostAdapter.js';
import {createCodexHostAdapter} from './codexHostAdapter.js';
import {createCursorHostAdapter} from './cursorHostAdapter.js';
import {HOST_NAMES} from './hostAdapterTypes.js';
import type {HostAdapter, HostName} from './hostAdapterTypes.js';

export {HOST_NAMES, INSTALL_SCOPES} from './hostAdapterTypes.js';
export type {
    HostAdapter, HostName, HostNotificationStatus, InstallOptions, InstallResult, InstallScope,
    PreviewFile, PreviewResult, ResolvedKnowledgePack
} from './hostAdapterTypes.js';
export {confirmationRequiredError, resolveKnowledgeRoot} from './knowledgePackSource.js';
export {createClaudeHostAdapter} from './claudeHostAdapter.js';
export {createCodexHostAdapter} from './codexHostAdapter.js';
export {createCursorHostAdapter} from './cursorHostAdapter.js';

const FACTORIES: Readonly<Record<HostName, () => HostAdapter>> = {
    codex: createCodexHostAdapter, cursor: createCursorHostAdapter, claude: createClaudeHostAdapter
};

/** Resolves the host-specific knowledge-pack installer for a supported v1 host. */
export function resolveHostAdapter(host: string): HostAdapter {
    if (!isHostName(host)) {
        throw createWatchtowerError('ERR_INVALID_ARGUMENT', {
            operation: 'resolve host adapter', target: host,
            remediation: 'Use one of: codex, cursor, claude.'
        });
    }
    return FACTORIES[host]();
}

function isHostName(value: string): value is HostName {
    return (HOST_NAMES as readonly string[]).includes(value);
}
