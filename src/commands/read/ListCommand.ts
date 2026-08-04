import {BaseCommand} from '@nirvana/base/cli/basic';
import type {Command} from '@nirvana/base/cli/contracts';
import {LaneListService} from '../../foundation/read/index.js';
import {parseReadCommandOptions} from '../shared/readCommandOptions.js';
import {presentReadCommand} from '../shared/readCommandPresenter.js';

export default class ListCommand extends BaseCommand implements Command {
    name = 'list';
    description = 'List Watchtower lanes relevant to the resolved repository.';
    usage = 'list [--workspace=<path>] [--lane=<slug-or-uuid>] [--initiative=<id>] [--limit=<1-200>] [--cursor=<opaque>] [--json] [--no-color] [--verbose]';
    group = 'basic';
    keywords = ['lanes', 'read-only', 'discovery'];

    constructor(private readonly service: LaneListService = new LaneListService()) { super(); }

    run(): void {
        const options = parseReadCommandOptions(this.args, 'list');
        const result = this.service.list({
            cwd: this.originalCwd,
            workspace: options.workspace,
            lane: options.lane,
            initiative: options.initiative,
            limit: options.limit,
            cursor: options.cursor,
            verbose: options.verbose,
            environment: process.env
        });
        presentReadCommand(this.name, result, options);
    }
}
