import {BaseCommand} from '@nirvana/base/cli/basic';
import type {Command} from '@nirvana/base/cli/contracts';
import {ResolvedConfigService} from '../foundation/index.js';
import {parseReadCommandOptions} from './readCommandOptions.js';
import {presentReadCommand} from './readCommandPresenter.js';

export default class ConfigCommand extends BaseCommand implements Command {
    name = 'config';
    description = 'Show resolved Watchtower lane identity and configuration.';
    usage = 'config show [--workspace=<path>] [--lane=<slug-or-uuid>] [--initiative=<id>] [--json] [--no-color] [--verbose]';
    group = 'basic';
    keywords = ['config', 'identity', 'read-only'];

    constructor(private readonly service: ResolvedConfigService = new ResolvedConfigService()) { super(); }

    run(): void {
        const options = parseReadCommandOptions(this.args, 'config');
        const result = this.service.show({
            cwd: this.originalCwd,
            workspace: options.workspace,
            lane: options.lane,
            initiative: options.initiative,
            verbose: options.verbose,
            environment: process.env
        });
        presentReadCommand('config show', result, options);
    }
}
