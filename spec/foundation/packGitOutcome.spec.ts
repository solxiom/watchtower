import {consumePack, gitUnavailable, gitValue} from '../../src/foundation/pack/index.js';
import type {GitOutcome, PackGitInspector} from '../../src/foundation/pack/index.js';
import type {PackConsumerResult, PackRejectionReason} from '../../src/contracts/index.js';
import {
    HEAD_COMMIT,
    REVIEWED_COMMIT,
    buildPackFixture,
    deps,
    fakeGit,
    type PackFixture
} from './fixtures/packFixture.js';

function reject(result: PackConsumerResult): PackRejectionReason {
    if (result.ok) throw new Error('expected a rejection');
    return result.reason;
}

/** Attempts to mutate an outcome into positive evidence; a frozen result refuses it. No cast. */
function attemptAuthorize<T>(outcome: GitOutcome<T>): GitOutcome<T> {
    try {
        Object.assign(outcome, {ok: true, value: true});
    } catch {
        // A frozen outcome throws on the write; the caller keeps the original value.
    }
    return outcome;
}

describe('Git outcome runtime immutability', function () {
    it('freezes every constructed outcome and returns distinct instances', function () {
        expect(Object.isFrozen(gitUnavailable())).toBe(true);
        expect(Object.isFrozen(gitValue(true))).toBe(true);
        expect(gitUnavailable()).not.toBe(gitUnavailable());
        expect(gitValue(false)).not.toBe(gitValue(false));
    });

    it('rejects any attempt to mutate an unavailable outcome into positive evidence', function () {
        const outcome = gitUnavailable();
        expect(() => Object.assign(outcome, {ok: true, value: true})).toThrowError();
        expect(outcome).toEqual({ok: false});
        expect(attemptAuthorize(gitUnavailable())).toEqual({ok: false});
    });
});

describe('consumePack — a mutation attempt never turns unavailable Git evidence into authorization', function () {
    function override(fixture: PackFixture, patch: Partial<PackGitInspector>): PackGitInspector {
        return {...fakeGit(fixture), ...patch};
    }

    it('unavailable tracking cannot be mutated into tracked', async function () {
        const fixture = buildPackFixture();
        const git = override(fixture, {isTracked: () => Promise.resolve(attemptAuthorize(gitUnavailable()))});
        expect(reject(await consumePack(fixture.context, deps(fixture, git)))).toBe('PACK_IO_FAILED');
    });

    it('unavailable ignore state cannot be mutated into not-ignored', async function () {
        const fixture = buildPackFixture();
        const git = override(fixture, {isIgnored: () => Promise.resolve(attemptAuthorize(gitUnavailable()))});
        expect(reject(await consumePack(fixture.context, deps(fixture, git)))).toBe('PACK_IO_FAILED');
    });

    it('unavailable committed state cannot be mutated into committed', async function () {
        const fixture = buildPackFixture();
        const git = override(fixture, {committedMatches: () => Promise.resolve(attemptAuthorize(gitUnavailable()))});
        expect(reject(await consumePack(fixture.context, deps(fixture, git)))).toBe('PACK_IO_FAILED');
    });

    it('unavailable ancestry cannot be mutated into a strict ancestor', async function () {
        const fixture = buildPackFixture();
        const git = override(fixture, {isAncestor: (_root, ancestor, descendant) =>
            Promise.resolve(ancestor === REVIEWED_COMMIT && descendant === HEAD_COMMIT
                ? attemptAuthorize(gitUnavailable()) : gitValue(false))});
        expect(reject(await consumePack(fixture.context, deps(fixture, git)))).toBe('PACK_ACCEPTANCE_INVALID');
    });
});
