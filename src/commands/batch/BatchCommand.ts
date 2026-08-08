import {BaseCommand} from '@nirvana/base/cli/basic';
import type {Command, CArgMap} from '@nirvana/base/cli/contracts';
import {createWatchtowerError} from '../../contracts/index.js';
import {CoordinatorReadService} from '../../foundation/lane/index.js';
import {presentReadCommand} from '../shared/readCommandPresenter.js';

export default class BatchCommand extends BaseCommand implements Command {
    name = 'batch'; description = 'Show the deterministic ready-set projection without selecting a batch.'; usage = 'batch ready [--workspace=<path>] [--lane=<slug-or-uuid>] [--json] [--no-color]'; group = 'basic'; keywords = ['batch', 'ready', 'read-only'];
    constructor(private readonly service: CoordinatorReadService = new CoordinatorReadService()) { super(); }
    run(): void { const options = parseBatchOptions(this.args); const data = this.service.ready({cwd: this.originalCwd, workspace: options.workspace, lane: options.lane, environment: process.env}); presentReadCommand('batch ready', data, options); }
}

interface BatchOptions {readonly workspace?: string; readonly lane?: string; readonly json: boolean; readonly noColor: boolean;}
function parseBatchOptions(args: CArgMap): BatchOptions {
    const positional = [...args.entries()].filter(([key]) => !key.startsWith('--')).map(([key]) => key);
    if (positional.length !== 2 || positional[0] !== 'batch' || positional[1] !== 'ready') invalid('batch positional arguments');
    for (const [key, value] of args.entries()) {
        if (key === 'workspace' || key === 'lane') { if (typeof value !== 'string' || value.length === 0) invalid(`--${key}`); continue; }
        if (key === 'json' || key === 'no-color') { if (value !== null) invalid(`--${key}`); continue; }
        if (key.startsWith('--')) invalid(`--${key}`);
    }
    for (const key of ['workspace', 'lane', 'json', 'no-color']) if (args.getAll(key).length > 1) invalid(`--${key}`);
    const workspace = args.getFlag('workspace', true); const lane = args.getFlag('lane', true);
    return {json: args.hasFlag('json', true), noColor: args.hasFlag('no-color', true), ...(workspace === null ? {} : {workspace}), ...(lane === null ? {} : {lane})};
}
function invalid(target: string): never { throw createWatchtowerError('ERR_INVALID_ARGUMENT', {operation: 'parse batch command options', target, remediation: 'Use batch ready with unique documented options.'}); }
