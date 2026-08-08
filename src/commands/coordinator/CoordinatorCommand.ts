import {BaseCommand} from '@nirvana/base/cli/basic';
import type {Command} from '@nirvana/base/cli/contracts';
import {CoordinatorReadService} from '../../foundation/lane/index.js';
import {buildCommandResult, createDefaultIndexBuildComposition, renderResult} from '../../foundation/index/index.js';
import {createWatchtowerError} from '../../contracts/index.js';
import {output as prettyOutput} from '@nirvana/base/utils/pretty';
import {presentReadCommand} from '../shared/readCommandPresenter.js';
import {parseCoordinatorOptions} from './coordinatorCommandOptions.js';

export default class CoordinatorCommand extends BaseCommand implements Command {
    name = 'coordinator'; description = 'Inspect bounded coordinator state and build the coordinator index through the validated effect boundary.';
    usage = 'coordinator <index status|verify|explain|build [--runtime] [--dry-run]|status|context|explain>'; group = 'basic'; keywords = ['coordinator', 'index', 'context', 'build', 'mutation', 'read-only'];
    constructor(private readonly service: CoordinatorReadService = new CoordinatorReadService(), private readonly indexBuild = createDefaultIndexBuildComposition()) { super(); }
    async run(): Promise<void> {
        const options = parseCoordinatorOptions(this.args);
        const query = {cwd: this.originalCwd, workspace: options.workspace, lane: options.lane, environment: process.env};
        if (options.action === 'index' && options.subject === 'build') {
            const source = await this.indexBuild.requestSource.resolve(this.originalCwd, options);
            const result = options.dryRun ? await this.indexBuild.operation.build(source) : await this.indexBuild.operation.apply(source);
            if (!result.ok) throw createWatchtowerError('ERR_INDEX_UNAVAILABLE', {operation: 'build coordinator index', target: result.target, remediation: result.detail});
            prettyOutput.write(renderResult(buildCommandResult('coordinator index build', result.data), options), 'info', 0, true);
            return;
        }
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
