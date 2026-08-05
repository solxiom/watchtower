import {output as prettyOutput} from '@nirvana/base/utils/pretty';
import type {JsonValue} from '../../contracts/types.js';
import type {VersionReport} from '../../foundation/upgrade/index.js';
import {buildCommandResult, renderResult} from '../../foundation/presentation/index.js';

export function presentVersionReport(report: VersionReport, options: {readonly json: boolean; readonly noColor: boolean}): void {
    prettyOutput.write(renderResult(buildCommandResult('version', toJson(report)), options), 'basic', 0, true);
}

function toJson(report: VersionReport): JsonValue {
    return {
        cliVersion: report.cliVersion,
        runtimeVersion: report.runtimeVersion,
        knowledgeVersion: report.knowledgeVersion,
        laneSchemaVersion: report.laneSchemaVersion,
        ...(report.availableRuntimes === undefined ? {} : {availableRuntimes: [...report.availableRuntimes]}),
        ...(report.availableKnowledge === undefined ? {} : {availableKnowledge: [...report.availableKnowledge]})
    };
}
