/**
 * The durable coordinator-owned authorization capsule one mutating command
 * reads (CA-25).
 *
 * A command never authors a proposal. It reads the capsule the coordinator
 * already wrote for exactly one operation, and every downstream owner treats
 * those bytes as `unknown` until validated. The capsule format is the accepted
 * one CA-30 established for `coordinator/index/index-build-authorization.json`
 * — `{schemaVersion, proposal, currentState}`, parsed by
 * `DurableIndexBuildAuthorizationSource`, which is closed over proposal shape,
 * predecessor evidence, and the complete `ValidationContext`. Reusing that
 * parser is deliberate: a second capsule parser would be a second, divergent
 * definition of what authorizes a lane mutation.
 *
 * `revalidate` re-reads the same path, so CA-10's lock-time recheck sees the
 * bytes as they are at the commit point, not as they were at preparation.
 */
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import type {CoordinatorAuthorization, CoordinatorMutationOperation} from '../../../../contracts/coordinatorMutation.js';
import {DurableIndexBuildAuthorizationSource} from '../../../index/assembly/IndexBuildAuthorizationSource.js';

const CAPSULE_DIRECTORY = 'coordinator/authorizations';

export type CapsuleRead =
    | {readonly kind: 'authorization'; readonly value: CoordinatorAuthorization}
    | {readonly kind: 'missing'; readonly path: string}
    | {readonly kind: 'invalid'; readonly path: string; readonly detail: string};

export interface CoordinatorAuthorizationSource {
    read(laneDir: string, operation: CoordinatorMutationOperation): CapsuleRead;
}

/** One capsule per operation, so one operation's authority cannot be spent by another. */
export function capsuleRelativePath(operation: CoordinatorMutationOperation): string {
    return `${CAPSULE_DIRECTORY}/${operation}.json`;
}

export class DurableCoordinatorAuthorizationSource implements CoordinatorAuthorizationSource {
    read(laneDir: string, operation: CoordinatorMutationOperation): CapsuleRead {
        const relative = capsuleRelativePath(operation);
        const path = join(laneDir, relative);
        if (!existsSync(path)) return {kind: 'missing', path: relative};
        try {
            return {kind: 'authorization', value: new DurableIndexBuildAuthorizationSource(relative).read(laneDir)};
        } catch (error) {
            return {kind: 'invalid', path: relative, detail: error instanceof Error ? error.message : 'the capsule could not be read.'};
        }
    }
}
