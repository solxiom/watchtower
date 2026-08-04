import {BaseCommand} from '@nirvana/base/cli/basic';
import type {Command} from '@nirvana/base/cli/contracts';
import {InitPlanner} from '../foundation/init/index.js';
import {presentInitPlan} from '../foundation/presentation/index.js';
import {parseInitCommandOptions} from './initCommandOptions.js';

export default class InitCommand extends BaseCommand implements Command {
    name = 'init';
    description = 'Preview a validated implementation-lane initialization plan without creating lane state.';
    usage = 'init <slug> --tmux-prefix=<prefix> --impl-pack=<path> --coordinator-routing=<path> [--scope=<bindings.json>] [--runtime=<version>] [--workspace=<path>] [--update-gitignore] [--dry-run]';
    group = 'basic';

    constructor(private readonly planner: InitPlanner = new InitPlanner()) { super(); }

    async run(): Promise<void> {
        const options = parseInitCommandOptions(this.args, this.originalCwd);
        presentInitPlan(this.planner.buildInitPlan(options.request), options);
    }
}
