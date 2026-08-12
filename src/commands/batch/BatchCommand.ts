import {BaseCommand} from '@nirvana/base/cli/basic';
import type {Command} from '@nirvana/base/cli/contracts';
import {CoordinatorReadService} from '../../foundation/lane/index.js';
import {presentReadCommand} from '../shared/readCommandPresenter.js';
import {parseBatchOptions} from './batchCommandOptions.js';

export default class BatchCommand extends BaseCommand implements Command {
    name = 'batch'; description = 'Show the deterministic ready-set projection without selecting a batch.'; usage = 'batch ready [--workspace=<path>] [--lane=<slug-or-uuid>] [--json] [--no-color]'; group = 'basic'; keywords = ['batch', 'ready', 'read-only'];
    constructor(private readonly service: CoordinatorReadService = new CoordinatorReadService()) { super(); }
    run(): void { const options = parseBatchOptions(this.args); const data = this.service.ready({cwd: this.originalCwd, workspace: options.workspace, lane: options.lane, environment: process.env}); presentReadCommand('batch ready', data, options); }
}
