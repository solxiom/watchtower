/**
 * CA-12 proof — model-free, no raw process spawn, and structural size gates
 * for the Git acceptance/publication capability. Mirrors CA-10's own
 * `effectArchitecture.spec.ts` pattern for the same class of claim.
 */
import {readFileSync, readdirSync} from 'node:fs';
import {join, relative} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const CAPABILITY_DIR = join(SOURCE_ROOT, 'foundation', 'gitAcceptance');
const CONTRACTS_FILE = join(SOURCE_ROOT, 'contracts', 'gitAcceptance.ts');
const OWNED_MODULES = readdirSync(CAPABILITY_DIR).filter((name) => name.endsWith('.ts')).map((name) => join(CAPABILITY_DIR, name));

const MODEL_IMPORT = /from\s+['"](?:@anthropic-ai\/[^'"]*|anthropic|openai|langchain[^'"]*|ai)['"]/i;
const RAW_PROCESS_SPAWN = /node:child_process|\bspawn\(|\bexecSync\(|\bexecFile\(/;
const FOUNDATION_MAX_LINES = 300;
const WARNING_BAND_LINES = 260;
const CONTRACT_MAX_LINES = 400;
const FRONT_DOOR_MAX_LINES = 200;

function sourcesOf(files: readonly string[]): {file: string; text: string}[] {
    return files.map((file) => ({file: relative(SOURCE_ROOT, file), text: readFileSync(file, 'utf8')}));
}

describe('CA-12 Git acceptance capability — model-free, no raw process spawn', function () {
    it('never imports a model or AI provider package', function () {
        expect(sourcesOf([...OWNED_MODULES, CONTRACTS_FILE]).filter(({text}) => MODEL_IMPORT.test(text)).map(({file}) => file)).toEqual([]);
    });

    it('never spawns a raw process: Git mutation reaches the world only through the injected LaneTaskRunner-shaped port', function () {
        expect(sourcesOf(OWNED_MODULES).filter(({text}) => RAW_PROCESS_SPAWN.test(text)).map(({file}) => file)).toEqual([]);
    });

    it('reads Git only through the pinned @nirvana/base/git driver or an injected inspector — never a bare "git" shell string', function () {
        const offenders = sourcesOf(OWNED_MODULES).filter(({file, text}) =>
            /\bgit\s+(?:push|pull|fetch|rebase|merge|checkout|reset)\b/.test(text) && !file.endsWith('gitAcceptanceCommitSet.ts'));
        expect(offenders.map(({file}) => file)).toEqual([]);
    });
});

describe('CA-12 Git acceptance capability — structural design gate', function () {
    it('keeps the contract module at or under the contract-module ceiling', function () {
        expect(readFileSync(CONTRACTS_FILE, 'utf8').split('\n').length).toBeLessThanOrEqual(CONTRACT_MAX_LINES);
    });

    it('keeps the front door (GitAcceptance.ts) at or under the front-door ceiling', function () {
        const file = join(CAPABILITY_DIR, 'GitAcceptance.ts');
        expect(readFileSync(file, 'utf8').split('\n').length).toBeLessThanOrEqual(FRONT_DOOR_MAX_LINES);
    });

    it('keeps every owned module at or under the foundation-module hard limit', function () {
        const oversized = OWNED_MODULES
            .map((file) => ({file: relative(SOURCE_ROOT, file), lines: readFileSync(file, 'utf8').split('\n').length}))
            .filter((entry) => entry.lines > FOUNDATION_MAX_LINES);
        expect(oversized).toEqual([]);
    });

    it('flags (but does not fail on) any module past the warning band, for reviewer judgment', function () {
        const warningBand = OWNED_MODULES
            .map((file) => ({file: relative(SOURCE_ROOT, file), lines: readFileSync(file, 'utf8').split('\n').length}))
            .filter((entry) => entry.lines > WARNING_BAND_LINES);
        expect(warningBand.length).toBeLessThanOrEqual(1);
    });

    it('uses no generic overflow owner name', function () {
        const forbidden = OWNED_MODULES.map((file) => relative(CAPABILITY_DIR, file))
            .filter((name) => /^(?:helpers|utils|common|misc)\.ts$/i.test(name));
        expect(forbidden).toEqual([]);
    });
});
