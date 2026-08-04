import {BaseCommand} from '@nirvana/base/cli/basic';
import type {Command} from '@nirvana/base/cli/contracts';
import {StatusProjection} from '../foundation/status/index.js';
import {parseReadCommandOptions} from './readCommandOptions.js';
import {presentReadCommand} from './readCommandPresenter.js';

export default class StatusCommand extends BaseCommand implements Command {
    name = 'status';
    description = 'Report one Watchtower lane without changing lane state.';
    usage = 'status [--workspace=<path>] [--lane=<slug-or-uuid>] [--initiative=<id>] [--json] [--no-color] [--verbose]';
    group = 'basic';
    keywords = ['status', 'health', 'read-only'];

    constructor(private readonly projection: StatusProjection = new StatusProjection()) { super(); }

    async run(): Promise<void> {
        const options = parseReadCommandOptions(this.args, 'status');
        const result = await this.projection.project({
            cwd: this.originalCwd,
            workspace: options.workspace,
            lane: options.lane,
            initiative: options.initiative,
            verbose: options.verbose,
            environment: process.env
        });
        presentReadCommand(this.name, result, options);
    }
}
