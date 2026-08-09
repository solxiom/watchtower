/**
 * The public `wt coordinator cycle|escalate|resolution` surface (CA-25):
 * argument fences, dry-run purity through the real command, and a single
 * handoff to the accepted effect authority.
 */
import {makeArgMap} from '@nirvana/base/utils/argUtil';
import CoordinatorCommand from '../../src/commands/coordinator/CoordinatorCommand.js';
import type {
    CoordinatorMutationRequest, CoordinatorMutationResult
} from '../../src/contracts/coordinatorMutation.js';
import type {
    CoordinatorMutationComposition, CoordinatorMutationResolution
} from '../../src/foundation/lane/index.js';
import {parseCoordinatorOptions} from '../../src/commands/coordinator/coordinatorCommandOptions.js';
import {
    authorizationFor, makeLaneDir, placeHoldFixture, removeLaneDir, requestFor
} from '../foundation/coordinatorMutation/support/mutationFixtures.js';

interface Calls {previews: number; applies: number; resolves: number; requests: CoordinatorMutationRequest[];}

function compositionFor(laneDir: string, calls: Calls, resolution?: CoordinatorMutationResolution): CoordinatorMutationComposition {
    const {wire, state} = placeHoldFixture();
    const success = (request: CoordinatorMutationRequest, applied: boolean): CoordinatorMutationResult => ({
        ok: true, data: {schemaVersion: 1, operation: request.operation, subject: request.subject, dryRun: request.dryRun,
            applied, proposalId: 'prop-place-hold', proposalType: 'place-hold', effect: 'place-hold',
            actionId: 'effect.placeHold', idempotencyKey: 'sha256:key', parameters: null,
            status: applied ? 'applied' : 'previewed', detail: null}
    });
    return {
        authority: {
            preview(request) { calls.previews += 1; calls.requests.push(request); return success(request, false); },
            async apply(request) { calls.applies += 1; calls.requests.push(request); return success(request, true); }
        },
        requestSource: {
            resolve: (_cwd, selection) => {
                calls.resolves += 1;
                return resolution ?? ({ok: true, request: requestFor(
                    laneDir, selection.operation, authorizationFor(wire, state),
                    {subject: selection.subject, dryRun: selection.dryRun, ...(selection.reason === undefined ? {} : {reason: selection.reason})}
                )});
            }
        }
    };
}

function commandFor(laneDir: string, calls: Calls, argv: readonly string[], resolution?: CoordinatorMutationResolution): CoordinatorCommand {
    const command = new CoordinatorCommand(undefined, undefined, compositionFor(laneDir, calls, resolution));
    command.args = makeArgMap([...argv]);
    command.originalCwd = laneDir;
    return command;
}

describe('public coordinator mutation commands (CA-25)', () => {
    let laneDir: string;
    let calls: Calls;
    beforeEach(() => { laneDir = makeLaneDir(); calls = {previews: 0, applies: 0, resolves: 0, requests: []}; });
    afterEach(() => { removeLaneDir(laneDir); });

    it('previews a dry-run cycle and never reaches the apply path', async () => {
        await commandFor(laneDir, calls, ['coordinator', 'cycle', '--trigger=trigger-1', '--dry-run', '--json']).run();
        expect(calls.previews).toBe(1);
        expect(calls.applies).toBe(0);
        expect(calls.requests[0].subject).toBe('trigger-1');
        expect(calls.requests[0].dryRun).toBeTrue();
    });

    it('hands a normal cycle to the effect authority exactly once', async () => {
        await commandFor(laneDir, calls, ['coordinator', 'cycle', '--trigger=trigger-1', '--json']).run();
        expect(calls.applies).toBe(1);
        expect(calls.previews).toBe(0);
    });

    it('carries the escalation cycle and reason through to the authority', async () => {
        await commandFor(laneDir, calls, ['coordinator', 'escalate', '--cycle=cycle-1', '--reason=blocked', '--json']).run();
        expect(calls.applies).toBe(1);
        expect(calls.requests[0].operation).toBe('escalate');
        expect(calls.requests[0].reason).toBe('blocked');
    });

    it('previews a specification-resolution proposal without applying it', async () => {
        await commandFor(laneDir, calls, ['coordinator', 'resolution', 'propose', 'blocker-1', '--json']).run();
        expect(calls.previews).toBe(1);
        expect(calls.applies).toBe(0);
        expect(calls.requests[0].operation).toBe('resolution-propose');
    });

    it('applies a resume only through the effect authority', async () => {
        await commandFor(laneDir, calls, ['coordinator', 'resolution', 'resume', 'blocker-1', '--json']).run();
        expect(calls.applies).toBe(1);
        expect(calls.requests[0].operation).toBe('resolution-resume');
        expect(calls.requests[0].subject).toBe('blocker-1');
    });

    it('surfaces a resolution failure as a typed CLI error without applying anything', async () => {
        const failure: CoordinatorMutationResolution = {
            ok: false, reason: 'COORDINATOR_MUTATION_AUTHORIZATION_INVALID',
            target: 'coordinator/authorizations/cycle.json', detail: 'invalid capsule'
        };
        let thrown: unknown;
        try {
            await commandFor(laneDir, calls, ['coordinator', 'cycle', '--trigger=trigger-1'], failure).run();
        } catch (error) { thrown = error; }
        expect(thrown).toBeDefined();
        expect(calls.applies).toBe(0);
        expect(calls.previews).toBe(0);
    });

    it('fences the mutating argument surface', () => {
        expect(() => parseCoordinatorOptions(makeArgMap(['coordinator', 'cycle']))).toThrowError(/Invalid arguments/);
        expect(() => parseCoordinatorOptions(makeArgMap(['coordinator', 'escalate']))).toThrowError(/Invalid arguments/);
        expect(() => parseCoordinatorOptions(makeArgMap(['coordinator', 'resolution', 'show']))).toThrowError(/Invalid arguments/);
        expect(() => parseCoordinatorOptions(makeArgMap(['coordinator', 'resolution', 'sync-check', 'blocker-1']))).toThrowError(/Invalid arguments/);
        expect(() => parseCoordinatorOptions(makeArgMap(['coordinator', 'resolution', 'unknown', 'blocker-1']))).toThrowError(/Invalid arguments/);
        expect(() => parseCoordinatorOptions(makeArgMap(['coordinator', 'status', '--dry-run']))).toThrowError(/Invalid arguments/);
        expect(() => parseCoordinatorOptions(makeArgMap(['coordinator', 'resolution', 'show', 'blocker-1', '--dry-run']))).toThrowError(/Invalid arguments/);
        expect(() => parseCoordinatorOptions(makeArgMap(['coordinator', 'cycle', '--trigger=t', '--reason=x']))).toThrowError(/Invalid arguments/);
    });

    it('rejects every option that belongs to another action form', () => {
        const rejected = [
            ['coordinator', 'cycle', '--trigger=t', '--cycle=ignored'],
            ['coordinator', 'cycle', '--trigger=t', '--class=D3'],
            ['coordinator', 'cycle', '--trigger=t', '--runtime'],
            ['coordinator', 'escalate', '--reason=r', '--trigger=ignored'],
            ['coordinator', 'resolution', 'propose', 'blocker-1', '--class=D3'],
            ['coordinator', 'resolution', 'show', 'blocker-1', '--trigger=ignored'],
            ['coordinator', 'resolution', 'show', 'blocker-1', '--worktree=wt-1'],
            ['coordinator', 'resolution', 'sync-check', 'blocker-1', '--worktree=wt-1', '--dry-run'],
            ['coordinator', 'status', '--runtime'],
            ['coordinator', 'status', '--worktree=wt-1'],
            ['coordinator', 'context', '--class=D3', '--trigger=t', '--cycle=c1'],
            ['coordinator', 'explain', '--trigger=ignored'],
            ['coordinator', 'index', 'status', '--runtime'],
            ['coordinator', 'index', 'build', '--reason=r']
        ];
        for (const argv of rejected) {
            expect(() => parseCoordinatorOptions(makeArgMap([...argv]))).toThrowError(/Invalid arguments/);
        }
    });

    it('rejects an action-incompatible option before resolving a request or calling the authority', async () => {
        let thrown: unknown;
        try {
            await commandFor(laneDir, calls, ['coordinator', 'cycle', '--trigger=t', '--class=D3']).run();
        } catch (error) { thrown = error; }
        expect(thrown).toBeDefined();
        expect(calls.resolves).toBe(0);
        expect(calls.previews).toBe(0);
        expect(calls.applies).toBe(0);
    });

    it('accepts the documented mutating forms', () => {
        expect(parseCoordinatorOptions(makeArgMap(['coordinator', 'cycle', '--trigger=t1', '--dry-run'])).dryRun).toBeTrue();
        expect(parseCoordinatorOptions(makeArgMap(['coordinator', 'escalate', '--reason=blocked'])).reason).toBe('blocked');
        expect(parseCoordinatorOptions(makeArgMap(['coordinator', 'resolution', 'sync-check', 'b1', '--worktree=wt-1'])).worktree).toBe('wt-1');
        expect(parseCoordinatorOptions(makeArgMap(['coordinator', 'resolution', 'resume', 'b1', '--dry-run'])).subject).toBe('resume');
    });

    it('documents the mutating surface in command metadata', () => {
        const command = new CoordinatorCommand();
        expect(command.usage).toContain('cycle --trigger=<event-id> [--dry-run]');
        expect(command.usage).toContain('escalate --reason=<text> [--cycle=<id>] [--dry-run]');
        expect(command.usage).toContain('resolution show <blocker-id>');
        // The documented usage states the fence per form: `--worktree` is
        // sync-check's and `--dry-run` is the mutating subjects'.
        expect(command.usage).toContain('resolution <propose|resume> <blocker-id> [--dry-run]');
        expect(command.usage).toContain('resolution sync-check <blocker-id> --worktree=<id>');
        expect(command.keywords).toContain('escalate');
    });
});
