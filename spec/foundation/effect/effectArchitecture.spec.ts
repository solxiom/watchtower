/**
 * Architecture proof for CA-10's exclusive owner: the effect capability is the
 * *only* effect authority, it performs no automatic Git synchronization, it
 * runs no shell or model, and every owned module stays inside its structural
 * design-gate ceiling. Walks the real source text rather than trusting a
 * hand-written inventory.
 */
import {readFileSync, readdirSync} from 'node:fs';
import {join, relative} from 'node:path';
import {EFFECT_TYPES} from '../../../src/contracts/index.js';
import {declaredRuntimeActions, undeclaredEffectTypes} from '../../../src/foundation/effect/effectActionRegistry.js';

const SOURCE_ROOT = join(process.cwd(), 'src');
const EFFECT_DIR = join(SOURCE_ROOT, 'foundation', 'effect');
const CONTRACTS_FILE = join(SOURCE_ROOT, 'contracts', 'effects.ts');
const OWNED_MODULES = readdirSync(EFFECT_DIR).filter((name) => name.endsWith('.ts')).map((name) => join(EFFECT_DIR, name));

const MODEL_IMPORT = /from\s+['"](?:@anthropic-ai\/[^'"]*|anthropic|openai|langchain[^'"]*|ai)['"]/i;
const PROCESS_SPAWN = /node:child_process|\bspawn\(|\bexecSync\(|\bexecFile\(/;
const GIT_SYNCHRONIZATION = /\b(?:git\s+(?:pull|fetch|rebase|merge|push|checkout|reset))\b|packGitHost|nodePackGitInspector/;
const CONTRACT_MAX_LINES = 400;
const FOUNDATION_MAX_LINES = 300;
const FRONT_DOOR_MAX_LINES = 200;
const FRONT_DOORS = new Set(['EffectExecutor.ts', 'index.ts']);
/**
 * LC-05's accepted `durableRootsPlanner` *materializes* `effect-events.jsonl`
 * as a zero-byte file during lane init (`coordinator-automation.md` §17). That
 * is layout, not authorship: it appends no record and reads none. Naming it
 * here keeps the "sole writer" claim exact instead of quietly loosening the
 * pattern until it stops proving anything.
 */
const LC05_JOURNAL_MATERIALIZER = [join('lane', 'coordinator', 'durableRootsPlanner.ts')];

function sourcesOf(files: readonly string[]): {file: string; text: string}[] {
    return files.map((file) => ({file: relative(SOURCE_ROOT, file), text: readFileSync(file, 'utf8')}));
}

describe('CA-10 effect capability — model-free, shell-free, Git-sync-free', function () {
    it('never imports a model or AI provider package', function () {
        expect(sourcesOf([...OWNED_MODULES, CONTRACTS_FILE]).filter(({text}) => MODEL_IMPORT.test(text)).map(({file}) => file)).toEqual([]);
    });

    it('never spawns a process: NVB is reached only through the injected runner port', function () {
        expect(sourcesOf(OWNED_MODULES).filter(({text}) => PROCESS_SPAWN.test(text)).map(({file}) => file)).toEqual([]);
    });

    it('performs no automatic Git synchronization anywhere in the owned surface', function () {
        expect(sourcesOf([...OWNED_MODULES, CONTRACTS_FILE]).filter(({text}) => GIT_SYNCHRONIZATION.test(text)).map(({file}) => file)).toEqual([]);
    });

    it('positive control: the Git-synchronization and spawn patterns really match', function () {
        expect(GIT_SYNCHRONIZATION.test('await run("git push origin main")')).toBeTrue();
        expect(PROCESS_SPAWN.test("import {spawn} from 'node:child_process';")).toBeTrue();
    });

    it('confines node:fs to the single declared filesystem adapter', function () {
        const offenders = sourcesOf(OWNED_MODULES)
            .filter(({text}) => /from\s+['"]node:fs['"]/.test(text))
            .map(({file}) => file);
        expect(offenders).toEqual([join('foundation', 'effect', 'nodeEffectFileSystem.ts')]);
    });
});

describe('CA-10 effect capability — one authority and one declared action map', function () {
    it('is the only writer of the effect journal, invocation envelopes, and the active-revision pointer', function () {
        const allSources = readdirSync(SOURCE_ROOT, {recursive: true, encoding: 'utf8'})
            .filter((name) => name.endsWith('.ts'))
            .map((name) => join(SOURCE_ROOT, name))
            .filter((file) => !file.startsWith(EFFECT_DIR) && !LC05_JOURNAL_MATERIALIZER.some((owner) => file.endsWith(owner)));
        const offenders = sourcesOf(allSources)
            .filter(({text}) => /'effect-events\.jsonl'|"effect-events\.jsonl"|envelope\.json'|active-revision\.json/.test(text))
            .map(({file}) => file);
        expect(offenders).toEqual([]);
    });

    it('maps every closed effect type to exactly one declared runtime action', function () {
        expect(undeclaredEffectTypes()).toEqual([]);
        expect(declaredRuntimeActions().length).toBe(EFFECT_TYPES.length);
        expect(new Set(declaredRuntimeActions().map((entry) => entry.actionId)).size).toBe(EFFECT_TYPES.length);
    });

    it('limits external effects to the two permitted v1 adapters', function () {
        const external = declaredRuntimeActions().filter((entry) => entry.scope === 'external');
        expect(external.every((entry) => entry.externalAdapter === 'tmux-session' || entry.externalAdapter === 'git-push')).toBeTrue();
        expect(declaredRuntimeActions().filter((entry) => entry.scope === 'lane-local').every((entry) => entry.externalAdapter === null)).toBeTrue();
    });

    it('exposes the registry as a frozen constant, never a mutable runtime registry', function () {
        expect(Object.isFrozen(declaredRuntimeActions())).toBeTrue();
        expect(declaredRuntimeActions().every((entry) => Object.isFrozen(entry))).toBeTrue();
    });
});

describe('CA-10 effect capability — structural design gate', function () {
    it('keeps the contract module at or under the contract-module ceiling', function () {
        expect(readFileSync(CONTRACTS_FILE, 'utf8').split('\n').length).toBeLessThanOrEqual(CONTRACT_MAX_LINES);
    });

    it('keeps every front door at or under the orchestrator/barrel ceiling', function () {
        const oversized = OWNED_MODULES
            .filter((file) => FRONT_DOORS.has(relative(EFFECT_DIR, file)))
            .map((file) => ({file: relative(SOURCE_ROOT, file), lines: readFileSync(file, 'utf8').split('\n').length}))
            .filter((entry) => entry.lines > FRONT_DOOR_MAX_LINES);
        expect(oversized).toEqual([]);
    });

    it('keeps every foundation module at or under the foundation-module ceiling', function () {
        const oversized = OWNED_MODULES
            .map((file) => ({file: relative(SOURCE_ROOT, file), lines: readFileSync(file, 'utf8').split('\n').length}))
            .filter((entry) => entry.lines > FOUNDATION_MAX_LINES);
        expect(oversized).toEqual([]);
    });

    it('uses no generic overflow owner name', function () {
        const forbidden = OWNED_MODULES.map((file) => relative(EFFECT_DIR, file))
            .filter((name) => /^(?:helpers|utils|common|misc)\.ts$/i.test(name));
        expect(forbidden).toEqual([]);
    });
});
