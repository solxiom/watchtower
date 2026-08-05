import {BaseCommand} from '@nirvana/base/cli/basic';
import type {Command} from '@nirvana/base/cli/contracts';
import {createWatchtowerError} from '../../contracts/index.js';
import {DoctorKernel, injectedDiagnosticCheckProviders} from '../../foundation/doctor/index.js';
import {presentReadCommand} from '../shared/readCommandPresenter.js';
import {parseDoctorCommandOptions} from './doctorCommandOptions.js';

export default class DoctorCommand extends BaseCommand implements Command {
    name = 'doctor';
    description = 'Validate lane-local markers, configuration, bindings, permissions, Git-ignore coverage, ' +
        'the installed runtime, account access, watcher heartbeat, and pack index without repair.';
    usage = 'doctor [--workspace=<path>] [--lane=<slug-or-uuid>] [--json] [--no-color] [--verbose]';
    group = 'basic';
    keywords = ['doctor', 'diagnostics', 'read-only'];

    constructor(private readonly kernel: DoctorKernel = new DoctorKernel(injectedDiagnosticCheckProviders)) { super(); }

    async run(): Promise<void> {
        const options = parseDoctorCommandOptions(this.args);
        const report = await this.kernel.run({
            cwd: this.originalCwd, workspace: options.workspace, lane: options.lane, environment: process.env
        });
        presentReadCommand(this.name, report, options);
        if (report.checks.some(check => check.status === 'fail')) {
            throw createWatchtowerError('ERR_PREFLIGHT_FAILED', {
                operation: 'run doctor diagnostics', target: report.lane.slug,
                remediation: 'Resolve the failing checks reported above and re-run wt doctor.'
            });
        }
    }
}
