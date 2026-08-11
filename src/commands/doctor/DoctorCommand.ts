import {BaseCommand} from '@nirvana/base/cli/basic';
import type {Command} from '@nirvana/base/cli/contracts';
import {createWatchtowerError} from '../../contracts/index.js';
import type {DoctorCheckProvider} from '../../foundation/doctor/index.js';
import {DoctorKernel, injectedDiagnosticCheckProviders, tuiDiagnosticCheckProviders} from '../../foundation/doctor/index.js';
import {presentReadCommand} from '../shared/readCommandPresenter.js';
import {parseDoctorCommandOptions} from './doctorCommandOptions.js';

export default class DoctorCommand extends BaseCommand implements Command {
    name = 'doctor';
    description = 'Validate lane-local markers, configuration, bindings, permissions, Git-ignore coverage, ' +
        'the installed runtime, account access, watcher heartbeat, pack index, coordinator queue/cursor, and ' +
        'operator-session index/turn state without repair; --tui also qualifies the promoted terminal target.';
    usage = 'doctor [--workspace=<path>] [--lane=<slug-or-uuid>] [--tui] [--json] [--no-color] [--verbose]';
    group = 'basic';
    keywords = ['doctor', 'diagnostics', 'read-only'];

    /**
     * Both compositions are frozen provider arrays chosen at parse time. The
     * command selects one and constructs a kernel over it; it never mutates a
     * composition, so `--tui` cannot register a provider into the default set.
     */
    constructor(
        private readonly kernelFor: (providers: readonly DoctorCheckProvider[]) => DoctorKernel =
        providers => new DoctorKernel(providers)
    ) { super(); }

    async run(): Promise<void> {
        const options = parseDoctorCommandOptions(this.args);
        const kernel = this.kernelFor(options.tui ? tuiDiagnosticCheckProviders : injectedDiagnosticCheckProviders);
        const report = await kernel.run({
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
