import {BaseCommand} from '@nirvana/base/cli/basic';
import type {Command} from '@nirvana/base/cli/contracts';
import {createWatchtowerError} from '../../contracts/index.js';
import {DoctorKernel} from '../../foundation/doctor/index.js';
import {presentReadCommand} from '../shared/readCommandPresenter.js';
import {parseDoctorCommandOptions} from './doctorCommandOptions.js';

export default class DoctorCommand extends BaseCommand implements Command {
    name = 'doctor';
    description = 'Validate lane-local markers, configuration, bindings, permissions, and Git-ignore coverage without repair.';
    usage = 'doctor [--workspace=<path>] [--lane=<slug-or-uuid>] [--json] [--no-color]';
    group = 'basic';
    keywords = ['doctor', 'diagnostics', 'read-only'];

    constructor(private readonly kernel: DoctorKernel = new DoctorKernel()) { super(); }

    run(): void {
        const options = parseDoctorCommandOptions(this.args);
        const report = this.kernel.run({cwd: this.originalCwd, workspace: options.workspace, lane: options.lane});
        presentReadCommand(this.name, report, {json: options.json, noColor: options.noColor});
        if (report.checks.some(check => check.status === 'fail')) {
            throw createWatchtowerError('ERR_PREFLIGHT_FAILED', {
                operation: 'run doctor diagnostics', target: report.lane.slug,
                remediation: 'Resolve the failing checks reported above and re-run wt doctor.'
            });
        }
    }
}
