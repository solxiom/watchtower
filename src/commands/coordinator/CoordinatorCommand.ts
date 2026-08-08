import {BaseCommand} from '@nirvana/base/cli/basic';
import type {Command} from '@nirvana/base/cli/contracts';
import {CoordinatorReadService} from '../../foundation/lane/index.js';
import {presentReadCommand} from '../shared/readCommandPresenter.js';
import {parseCoordinatorOptions} from './coordinatorCommandOptions.js';

export default class CoordinatorCommand extends BaseCommand implements Command {
    name = 'coordinator'; description = 'Inspect bounded coordinator state without changing lane state.';
    usage = 'coordinator <index status|verify|explain|status|context|explain>'; group = 'basic'; keywords = ['coordinator', 'index', 'context', 'read-only'];
    constructor(private readonly service: CoordinatorReadService = new CoordinatorReadService()) { super(); }
    async run(): Promise<void> {
        const options = parseCoordinatorOptions(this.args);
        const query = {cwd: this.originalCwd, workspace: options.workspace, lane: options.lane, environment: process.env};
        const data = options.action === 'status' ? this.service.coordinatorStatus(query)
            : options.action === 'context' ? this.service.context(query, options.trigger ?? '', options.decisionClass ?? '')
            : options.action === 'explain' ? this.service.explain(query, options.cycle)
            : options.action === 'index' && options.subject === 'status' ? this.service.indexStatus(query)
            : options.action === 'index' && options.subject === 'verify' ? await this.service.indexVerify(query)
            : options.action === 'index' && options.subject === 'explain' ? await this.service.indexExplain(query, options.target ?? '')
            : (() => { throw new Error(`unsupported coordinator read action: ${options.action}`); })();
        presentReadCommand(`coordinator ${options.action}`, data, options);
    }
}
