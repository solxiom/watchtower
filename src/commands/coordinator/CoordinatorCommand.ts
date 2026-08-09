import {BaseCommand} from '@nirvana/base/cli/basic';
import type {Command} from '@nirvana/base/cli/contracts';
import {CoordinatorReadService, SpecificationResolutionReadService, createDefaultCoordinatorMutationComposition} from '../../foundation/lane/index.js';
import type {CoordinatorMutationComposition, CoordinatorMutationSelection} from '../../foundation/lane/index.js';
import {buildCommandResult, createDefaultIndexBuildComposition, renderResult} from '../../foundation/index/index.js';
import {createWatchtowerError} from '../../contracts/index.js';
import type {CoordinatorMutationOperation} from '../../contracts/coordinatorMutation.js';
import {output as prettyOutput} from '@nirvana/base/utils/pretty';
import {presentReadCommand} from '../shared/readCommandPresenter.js';
import {mutationError, presentMutationResult} from './coordinatorMutationPresenter.js';
import {parseCoordinatorOptions, type CoordinatorCommandOptions} from './coordinatorCommandOptions.js';

/** `resolution propose` carries an advisory-only proposal, so it is previewed, never applied. */
const ADVISORY: CoordinatorMutationOperation = 'resolution-propose';

export default class CoordinatorCommand extends BaseCommand implements Command {
    name = 'coordinator'; description = 'Inspect bounded coordinator state and run cycle, escalation, index, and specification-resolution operations through the validated effect boundary.';
    usage = 'coordinator status | coordinator context --class=<D1|D2|D3> --trigger=<event-id> | coordinator explain [--cycle=<id>] | coordinator index <status|verify> | coordinator index explain <batch-or-requirement> | coordinator index build [--runtime] [--dry-run] | coordinator cycle --trigger=<event-id> [--dry-run] | coordinator escalate --reason=<text> [--cycle=<id>] [--dry-run] | coordinator resolution show <blocker-id> | coordinator resolution <propose|resume> <blocker-id> [--dry-run] | coordinator resolution sync-check <blocker-id> --worktree=<id>; every form also accepts [--workspace=<path>] [--lane=<slug-or-uuid>] [--initiative=<id>] [--json] [--no-color]'; group = 'basic'; keywords = ['coordinator', 'index', 'context', 'build', 'cycle', 'escalate', 'resolution', 'mutation', 'read-only'];
    constructor(private readonly service: CoordinatorReadService = new CoordinatorReadService(),
        private readonly indexBuild = createDefaultIndexBuildComposition(),
        private readonly mutation: CoordinatorMutationComposition = createDefaultCoordinatorMutationComposition(),
        private readonly resolutionReads: SpecificationResolutionReadService = new SpecificationResolutionReadService()) { super(); }

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
        if (options.action === 'resolution' && (options.subject === 'show' || options.subject === 'sync-check')) {
            const blocker = options.target ?? '';
            const data = options.subject === 'show'
                ? this.resolutionReads.show(query, blocker)
                : this.resolutionReads.syncCheck(query, blocker, options.worktree ?? '');
            presentReadCommand(`coordinator resolution ${options.subject}`, data, options);
            return;
        }
        const operation = mutationOperation(options);
        if (operation !== null) return await this.mutate(operation, options);
        const data = options.action === 'status' ? this.service.coordinatorStatus(query)
            : options.action === 'context' ? this.service.context(query, options.trigger ?? '', options.decisionClass ?? '')
            : options.action === 'explain' ? this.service.explain(query, options.cycle)
            : options.action === 'index' && options.subject === 'status' ? this.service.indexStatus(query)
            : options.action === 'index' && options.subject === 'verify' ? await this.service.indexVerify(query)
            : options.action === 'index' && options.subject === 'explain' ? await this.service.indexExplain(query, options.target ?? '')
            : (() => { throw new Error(`unsupported coordinator read action: ${options.action}`); })();
        presentReadCommand(`coordinator ${options.action}`, data, options);
    }

    /** Resolve the lane and durable authorization, then preview or hand off to the sole effect authority. */
    private async mutate(operation: CoordinatorMutationOperation, options: CoordinatorCommandOptions): Promise<void> {
        const command = `coordinator ${options.action}${options.subject === undefined ? '' : ` ${options.subject}`}`;
        const selection: CoordinatorMutationSelection = {
            operation, subject: subjectOf(operation, options), dryRun: options.dryRun,
            ...(options.reason === undefined ? {} : {reason: options.reason}),
            ...(options.workspace === undefined ? {} : {workspace: options.workspace}),
            ...(options.lane === undefined ? {} : {lane: options.lane}),
            ...(options.initiative === undefined ? {} : {initiative: options.initiative})
        };
        const resolved = this.mutation.requestSource.resolve(this.originalCwd, selection);
        if (!resolved.ok) throw mutationError(command, resolved);
        const previewOnly = selection.dryRun || operation === ADVISORY;
        const result = previewOnly
            ? this.mutation.authority.preview(resolved.request)
            : await this.mutation.authority.apply(resolved.request);
        presentMutationResult(command, result, options);
    }
}

function mutationOperation(options: CoordinatorCommandOptions): CoordinatorMutationOperation | null {
    if (options.action === 'cycle') return 'cycle';
    if (options.action === 'escalate') return 'escalate';
    if (options.action !== 'resolution') return null;
    if (options.subject === 'propose') return 'resolution-propose';
    return options.subject === 'resume' ? 'resolution-resume' : null;
}

/** The identity the operator named: the trigger event, the cycle, or the blocker. */
function subjectOf(operation: CoordinatorMutationOperation, options: CoordinatorCommandOptions): string {
    if (operation === 'cycle') return options.trigger ?? '';
    if (operation === 'escalate') return options.cycle ?? '';
    return options.target ?? '';
}
