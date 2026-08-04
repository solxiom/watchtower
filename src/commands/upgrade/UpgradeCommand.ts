import {BaseCommand} from '@nirvana/base/cli/basic';
import type {Command} from '@nirvana/base/cli/contracts';
import {createWatchtowerError} from '../../contracts/errors.js';
import {UpgradePlanner} from '../../foundation/upgrade/index.js';
import {UpgradePreviewSource} from '../../foundation/upgrade/index.js';
import {presentUpgradePlan} from '../../foundation/presentation/index.js';
import {parseUpgradeCommandOptions} from './upgradeCommandOptions.js';

export default class UpgradeCommand extends BaseCommand implements Command {
    name = 'upgrade';
    description = 'Preview a compatible managed runtime upgrade without changing lane state.';
    usage = 'upgrade [--lane=<slug-or-uuid>] [--workspace=<path>] [--to=<version>] [--apply] [--dry-run] [--json] [--no-color]';
    group = 'basic';
    constructor(private readonly planner: UpgradePlanner = new UpgradePlanner(),
        private readonly source: UpgradePreviewSource = new UpgradePreviewSource()) { super(); }

    async run(): Promise<void> {
        const options = parseUpgradeCommandOptions(this.args);
        if (options.apply) throw createWatchtowerError('ERR_INVALID_ARGUMENT', {operation: 'apply upgrade', target: '--apply',
            remediation: 'Upgrade application is not implemented in UK-01; run without --apply to preview.'});
        const input = this.source.read({cwd: this.originalCwd, lane: options.lane, workspace: options.workspace, to: options.to});
        const plan = this.planner.plan(input);
        presentUpgradePlan(plan, options);
        if (plan.conflicts.length > 0) {
            throw createWatchtowerError('ERR_MANAGED_CONFLICT', {operation: 'preview upgrade', target: plan.conflicts[0].path,
                remediation: 'Resolve the regular-file collision, then rerun the preview before applying an upgrade.'});
        }
    }
}
