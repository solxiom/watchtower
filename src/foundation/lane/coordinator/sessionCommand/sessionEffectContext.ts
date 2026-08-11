/**
 * The durable authorization and runtime context an effect-bearing `session`
 * form needs before any accepted owner is called (CA-24).
 *
 * A command never authors a proposal. It reads the capsule the coordinator
 * already wrote for exactly one session operation, through the *same* accepted
 * parser CA-25 and CA-30 use, so there is one definition of what authorizes a
 * lane mutation and one per-operation capsule so one form's authority cannot
 * be spent through another. The lane runtime context is composed from the
 * accepted install-identity and runtime-catalog owners; nothing here writes.
 */
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import type {CoordinatorAuthorization} from '../../../../contracts/coordinatorMutation.js';
import type {LaneRuntimeContext} from '../../../../contracts/taskRuntime.js';
import {DurableIndexBuildAuthorizationSource} from '../../../index/assembly/IndexBuildAuthorizationSource.js';
import {LaneInstallIdentityReader} from '../../../read/LaneInstallIdentityReader.js';
import {buildLaneFilePath, resolveWatchtowerDataHome} from '../../../paths/index.js';
import {RuntimeCatalog} from '../../../runtime/index.js';
import type {DiscoveredLane} from '../../../discovery/index.js';
import {sessionCommandFailure, type SessionCommandFailure} from '../../../../contracts/sessionCommand.js';

/** The effect-bearing session operations, each with its own durable capsule. */
export type SessionEffectOperation = 'session-apply' | 'session-amendment-admit';

export function sessionCapsuleRelativePath(operation: SessionEffectOperation): string {
    return `coordinator/authorizations/${operation}.json`;
}

export interface SessionEffectContext {
    readonly authorization: CoordinatorAuthorization;
    readonly runtimeContext: LaneRuntimeContext;
}

export type SessionEffectContextResult =
    | {readonly ok: true; readonly context: SessionEffectContext}
    | SessionCommandFailure;

export interface SessionEffectContextOptions {
    readonly environment?: NodeJS.ProcessEnv;
    readonly home?: string;
    readonly runtime?: RuntimeCatalog;
    readonly baseEnvironment?: {readonly path: string; readonly home: string};
}

/**
 * Reads the operation's capsule and composes the lane runtime context. A
 * missing capsule is a refusal, not an implicit grant: an effect-bearing
 * session form without recorded authority never reaches an accepted owner.
 */
export function resolveSessionEffectContext(
    lane: DiscoveredLane, operation: SessionEffectOperation, options: SessionEffectContextOptions = {}
): SessionEffectContextResult {
    const relative = sessionCapsuleRelativePath(operation);
    if (!existsSync(join(lane.laneDir, relative))) {
        return sessionCommandFailure('SESSION_COMMAND_CONFIRMATION_REQUIRED', relative,
            `no durable authorization capsule authorizes ${operation} in this lane`);
    }
    let authorization: CoordinatorAuthorization;
    try {
        authorization = new DurableIndexBuildAuthorizationSource(relative).read(lane.laneDir);
    } catch (error) {
        return sessionCommandFailure('SESSION_COMMAND_EFFECT_REFUSED', relative,
            error instanceof Error ? error.message : 'the authorization capsule could not be read');
    }
    try {
        return {ok: true, context: {authorization, runtimeContext: runtimeContextFor(lane, options)}};
    } catch (error) {
        return sessionCommandFailure('SESSION_COMMAND_EFFECT_REFUSED', lane.laneId,
            error instanceof Error ? error.message : 'the lane runtime context could not be resolved');
    }
}

function runtimeContextFor(lane: DiscoveredLane, options: SessionEffectContextOptions): LaneRuntimeContext {
    const install = new LaneInstallIdentityReader().read(lane.laneDir);
    const catalog = options.runtime ?? new RuntimeCatalog({
        dataRoot: () => resolveWatchtowerDataHome(options.environment, options.home)
    });
    return {
        workspace: lane.controlHome, laneId: lane.laneId, initiativeId: lane.initiativeId, laneSlug: lane.slug,
        laneDir: lane.laneDir, homeRepositoryId: lane.manifest.controlHomeRepository,
        repositoriesFile: buildLaneFilePath(lane.laneDir, 'repositories.local.json'),
        runtimeRoot: catalog.getRuntimeRoot(install.runtimeVersion), runtimeVersion: install.runtimeVersion,
        knowledgeRoot: catalog.getKnowledgeRoot(install.knowledgeVersion),
        baseEnvironment: options.baseEnvironment ?? {path: process.env.PATH ?? '', home: process.env.HOME ?? ''}
    };
}
