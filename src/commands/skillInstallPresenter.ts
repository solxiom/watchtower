import {output as prettyOutput} from '@nirvana/base/utils/pretty';
import type {JsonValue} from '../contracts/index.js';
import type {InstallResult, PreviewResult} from '../foundation/index.js';
import {buildCommandResult, renderResult} from '../foundation/index.js';

export function presentSkillInstallResult(
    result: PreviewResult | InstallResult, options: {readonly json: boolean; readonly noColor: boolean}
): void {
    const data = isInstallResult(result) ? installMutationResult(result) : previewMutationResult(result);
    const envelope = buildCommandResult('skill install', data);
    prettyOutput.write(renderResult(envelope, options), 'basic', 0, true);
}

function isInstallResult(result: PreviewResult | InstallResult): result is InstallResult {
    return 'filesWritten' in result;
}

function previewMutationResult(result: PreviewResult): JsonValue {
    const warnings = result.filesToOverwrite.map((path) => (
        {code: 'SKILL_INSTALL_WOULD_OVERWRITE', message: `Would overwrite ${path}`}
    ));
    if (result.destinationExists && result.filesToOverwrite.length === 0) {
        warnings.push({code: 'SKILL_INSTALL_DESTINATION_EXISTS', message: `Destination already exists: ${result.destination}`});
    }
    return {
        applied: false, changed: [], unchanged: [], warnings,
        host: result.host, destination: result.destination, scope: result.scope, knowledgeVersion: result.knowledgeVersion,
        files: result.files.map((file) => ({sourcePath: file.sourcePath, destinationPath: file.destinationPath})),
        destinationExists: result.destinationExists, filesToOverwrite: [...result.filesToOverwrite]
    };
}

function installMutationResult(result: InstallResult): JsonValue {
    return {
        applied: true, changed: [...result.filesWritten], unchanged: [], warnings: [],
        host: result.host, destination: result.destination, scope: result.scope, knowledgeVersion: result.knowledgeVersion,
        versionRecorded: result.versionRecorded, hostNotification: result.hostNotification
    };
}
