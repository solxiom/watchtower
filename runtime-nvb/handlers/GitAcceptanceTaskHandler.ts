import {TaskHandler} from '@nirvana/builder';

import {decodeTaskRequest, TASK_REQUEST_FLAG} from '../foundation/task/runtime/laneTaskRequest.js';
import type {LaneRuntimeContext} from '../contracts/taskRuntime.js';
import type {TaskLeafCapability} from '../contracts/leafRuntime.js';
import {grantGitLeafCapability} from './gitAcceptance/executingGitCatalog.js';
import {runtimeContextFromEnvironment} from './gitAcceptance/runtimeContextFromEnvironment.js';
import {
    appliedResult, isPublishCommitsInput, isRecordAcceptanceInput, isSafeArgvToken, refusedResult, type MutationResult
} from './gitAcceptance/gitAcceptanceTaskContracts.js';

const RECORD_ACCEPTANCE_TASK = 'wt:git:record-acceptance';
const PUBLISH_COMMITS_TASK = 'wt:git:publish-commits';
const GIT_PUSH_LEAF = 'git.push';

/**
 * Focused packaged TaskHandler for the two CA-12 declared actions
 * (`git.record-acceptance` → `wt:git:record-acceptance`,
 * `git.publish-commits` → `wt:git:publish-commits`). Owns mechanics and
 * structured `$defs.mutationResult` evidence only; reviewer ownership,
 * commit-set validation, semantic acceptance, and journal truth stay with
 * `GitAcceptanceAdapter`. Only `wt:git:publish-commits` ever reaches the
 * cataloged `git.push` leaf, and only through `TaskLeafCapability`.
 */
export default class GitAcceptanceTaskHandler extends TaskHandler {
    static readonly handlerName = 'GitAcceptanceTaskHandler';
    private readonly ownTaskName: string;
    private readonly capability?: TaskLeafCapability;
    private readonly context?: LaneRuntimeContext;

    constructor({taskName, capability, context}: {
        readonly taskName: string; readonly capability?: TaskLeafCapability; readonly context?: LaneRuntimeContext
    }) {
        super({
            taskName, handlerName: GitAcceptanceTaskHandler.handlerName,
            hasSyncHandler: false, hasAsyncHandler: true, waitForDoneSignalOnAsync: true
        });
        this.ownTaskName = taskName;
        this.capability = capability;
        this.context = context;
    }

    async handleAsync(): Promise<void> {
        const request = decodeTaskRequest(this.argMap.get(TASK_REQUEST_FLAG));
        const result = this.ownTaskName === RECORD_ACCEPTANCE_TASK ? this.handleRecordAcceptance(request)
            : this.ownTaskName === PUBLISH_COMMITS_TASK ? await this.handlePublishCommits(request)
                : refusedResult();
        this.onResult({structuredOutput: result});
        this.doneSignal(result.applied ? undefined : new Error('GIT_ACCEPTANCE_TASK_FAILED'));
    }

    /** Pure recognition: never touches Git. */
    private handleRecordAcceptance(request: unknown): MutationResult {
        return isRecordAcceptanceInput(request) ? appliedResult(request.targetId) : refusedResult();
    }

    private async handlePublishCommits(request: unknown): Promise<MutationResult> {
        if (!isPublishCommitsInput(request)) return refusedResult();
        const refspec = `${request.sha}:${request.ref}`;
        // Correction CA12-R4: a closed grammar already fenced `isPublishCommitsInput`;
        // this second, independent check on the exact constructed argv is the last
        // gate before the leaf ever runs, so option injection stays impossible even
        // if that grammar is ever loosened by a future change.
        if (!isSafeArgvToken(request.remote) || !isSafeArgvToken(refspec)) return refusedResult();
        const capability = this.capability ?? grantGitLeafCapability(PUBLISH_COMMITS_TASK);
        const outcome = await capability.invoke({
            leafId: GIT_PUSH_LEAF, args: ['push', request.remote, refspec],
            context: this.context ?? runtimeContextFromEnvironment()
        });
        return outcome.outcome === 'completed' ? appliedResult(request.targetId) : refusedResult();
    }
}
