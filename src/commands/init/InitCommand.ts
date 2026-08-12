import {BaseCommand} from '@nirvana/base/cli/basic';
import type {Command} from '@nirvana/base/cli/contracts';
import {InitPlanner} from '../../foundation/init/index.js';
import {createInitEffect, type InitEffect} from '../../foundation/lane/index.js';
import {resolveWatchtowerDataHome} from '../../foundation/paths/index.js';
import {presentInitApplyResult, presentInitPlan} from '../../foundation/presentation/index.js';
import {parseInitCommandOptions} from './initCommandOptions.js';

/**
 * Thin front door for `wt init` (`docs/spec/v1-contracts.md` §2). The closed
 * grammar has no `--apply`: `--dry-run` previews and every other invocation
 * applies. This command validates arguments, resolves its two collaborators,
 * and delegates; planning belongs to `InitPlanner` (LC-01) and the mutation to
 * the single `InitEffect` orchestrator (LC-11).
 */
export default class InitCommand extends BaseCommand implements Command {
    name = 'init';
    description = 'Create a validated implementation lane, or preview the plan with --dry-run.';
    usage = 'init <slug> --tmux-prefix=<prefix> --impl-pack=<path> --coordinator-routing=<path> [--scope=<bindings.json>] [--runtime=<version>] [--workspace=<path>] [--update-gitignore] [--dry-run]';
    group = 'basic';

    constructor(
        private readonly planner: InitPlanner = new InitPlanner(),
        private readonly effect: InitEffect = createInitEffect()
    ) { super(); }

    async run(): Promise<void> {
        const options = parseInitCommandOptions(this.args, this.originalCwd);
        const plan = this.planner.buildInitPlan(options.request);
        if (options.request.dryRun) {
            presentInitPlan(plan, options);
            return;
        }
        presentInitApplyResult(await this.effect.apply({plan, dataHome: resolveWatchtowerDataHome()}), options);
    }
}
