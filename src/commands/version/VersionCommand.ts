import {BaseCommand} from '@nirvana/base/cli/basic';
import type {CArgMap, Command} from '@nirvana/base/cli/contracts';
import {createWatchtowerError} from '../../contracts/index.js';
import {VersionReportService} from '../../foundation/upgrade/index.js';
import {presentVersionReport} from './versionPresenter.js';

export default class VersionCommand extends BaseCommand implements Command {
    name = 'version';
    description = 'Report the CLI, runtime, knowledge, and lane-schema versions.';
    usage = 'version [--lane=<slug-or-uuid>] [--json] [--no-color]';
    group = 'basic';

    constructor(private readonly service: VersionReportService = new VersionReportService()) { super(); }

    run(): void {
        const options = parseOptions(this.args);
        presentVersionReport(this.service.report({cwd: this.originalCwd, lane: options.lane}), options);
    }
}

function parseOptions(args: CArgMap): {readonly lane?: string; readonly json: boolean; readonly noColor: boolean} {
    const valueFlags = new Set(['--lane']);
    const booleanFlags = new Set(['--json', '--no-color']);
    for (const [key, value] of args.entries()) {
        if (valueFlags.has(key) && typeof value === 'string' && value.length > 0) continue;
        if (booleanFlags.has(key) && value === null) continue;
        throw createWatchtowerError('ERR_INVALID_ARGUMENT', {operation: 'parse version command', target: key, remediation: 'Use only --lane, --json, and --no-color.'});
    }
    for (const flag of [...valueFlags, ...booleanFlags]) {
        if (args.getAll(flag).length > 1) throw createWatchtowerError('ERR_INVALID_ARGUMENT', {
            operation: 'parse version command', target: flag, remediation: 'Provide each version flag at most once.'
        });
    }
    const lane = args.getFlag('lane', true);
    return {lane: lane === null ? undefined : lane, json: args.hasFlag('json', true), noColor: args.hasFlag('no-color', true)};
}
