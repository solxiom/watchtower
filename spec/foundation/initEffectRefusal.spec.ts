/**
 * LC-11 — the Phase 4 refusal contract. An unaccepted, unsealed, uncommitted,
 * critically drifted, malformed, or mismatched pack must be refused before any
 * destination directory, membership index entry, or `.gitignore` byte changes
 * (`docs/spec/v1.md` §11.1 preflight step 5, `docs/spec/v1-contracts.md`
 * §3.3/§3.5).
 */
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {WatchtowerError} from '../../src/contracts/index.js';
import {createInitEffect} from '../../src/foundation/lane/index.js';
import {makeInitEffectFixture, type InitEffectFixture, type InitEffectFixtureOptions} from './fixtures/initEffectFixture.js';

interface RefusalCase {
    readonly name: string;
    readonly options?: InitEffectFixtureOptions;
    readonly corrupt?: (fixture: InitEffectFixture) => void;
    readonly code: string;
}

const CASES: readonly RefusalCase[] = [
    {
        name: 'a malformed pack document',
        corrupt: (fixture) => writeFileSync(join(fixture.packRoot, 'implementation-pack.json'), '{'),
        code: 'ERR_PARSE_FAILURE'
    },
    {
        name: 'an unsealed pack whose bytes no longer reproduce the seal',
        corrupt: (fixture) => writeFileSync(join(fixture.packRoot, 'implementation-map.md'), '# tampered\n'),
        code: 'ERR_INTEGRITY_FAILURE'
    },
    {
        name: 'an uncommitted sealed file',
        corrupt: (fixture) => git(fixture.controlHome, ['rm', '--cached', '--quiet', 'pack/implementation-map.md']),
        code: 'ERR_PREFLIGHT_FAILED'
    },
    {
        name: 'an unaccepted pack whose recorded verdict is not accept',
        options: {packAcceptance: {verdict: 'reject'}},
        code: 'ERR_PARSE_FAILURE'
    },
    {
        name: 'a scope declaring a repository the accepted pack does not name',
        options: {extraRepository: true},
        code: 'ERR_PREFLIGHT_FAILED'
    },
    {
        name: 'an acceptance record mismatched to the manifest it claims',
        options: {packAcceptance: {acceptedManifestDigest: `sha256:${'0'.repeat(64)}`}},
        code: 'ERR_PREFLIGHT_FAILED'
    },
    {
        name: 'critical source-baseline drift inside a writable batch claim',
        corrupt: (fixture) => {
            mkdirSync(join(fixture.controlHome, 'src'), {recursive: true});
            writeFileSync(join(fixture.controlHome, 'src', 'claimed.ts'), 'export const drifted = 1;\n');
            git(fixture.controlHome, ['add', '--all']);
            git(fixture.controlHome, ['-c', 'user.name=w', '-c', 'user.email=w@example.test',
                'commit', '--quiet', '--message=drift']);
        },
        code: 'ERR_PREFLIGHT_FAILED'
    }
];

describe('init effect — Phase 4 refusal contract', function () {
    for (const scenario of CASES) {
        it(`refuses ${scenario.name} without any destination or membership mutation`, async function () {
            const fixture = makeInitEffectFixture(scenario.options);
            try {
                scenario.corrupt?.(fixture);
                const before = fixture.inventory();

                const error = await refusal(fixture);

                expect(error.code).toBe(scenario.code);
                expect(error.message).toContain('apply init (pack-validation)');
                expect(existsSync(fixture.laneDir)).toBeFalse();
                expect(existsSync(join(fixture.dataHome, 'index', 'repository-memberships.json'))).toBeFalse();
                expect(fixture.inventory()).toBe(before);
            } finally {
                fixture.remove();
            }
        });
    }
});

async function refusal(fixture: InitEffectFixture): Promise<WatchtowerError> {
    try {
        await createInitEffect().apply(fixture.request);
    } catch (error) {
        if (error instanceof WatchtowerError) return error;
        throw error;
    }
    throw new Error('expected the init effect to refuse this pack');
}

function git(cwd: string, args: readonly string[]): void {
    execFileSync('git', [...args], {cwd, stdio: ['ignore', 'ignore', 'ignore']});
}
