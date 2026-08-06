/**
 * Architecture proof for CA-09's exclusive owners: no model/AI import anywhere
 * in the proposal contract or validator surface, and every owned module stays
 * inside its structural-design-gate line ceiling. Walks the actual source text
 * rather than trusting a hand-written inventory.
 */
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {EFFECT_TYPES, PROPOSAL_TYPES} from '../../../src/contracts/index.js';

const SOURCE_ROOT = join(process.cwd(), 'src');
const CONTRACTS_FILE = join(SOURCE_ROOT, 'contracts', 'proposals.ts');
const VALIDATOR_DIR = join(SOURCE_ROOT, 'foundation', 'proposal');
const OWNED_FILES = [CONTRACTS_FILE, ...readdirSync(VALIDATOR_DIR).filter((name) => name.endsWith('.ts')).map((name) => join(VALIDATOR_DIR, name))];
const CANONICAL_SCHEMA_FILE = join(process.cwd(), 'docs', 'spec', 'schemas', 'v1.schema.json');

const MODEL_IMPORT = /from\s+['"](?:@anthropic-ai\/[^'"]*|anthropic|openai|langchain[^'"]*|ai)['"]|require\(\s*['"](?:@anthropic-ai\/[^'"]*|anthropic|openai)['"]\s*\)/i;
const CONTRACT_MAX_LINES = 400;
const VALIDATOR_MAX_LINES = 300;

describe('CA-09 proposal contracts/validator — model-free architecture', function () {
    it('never imports a model/AI provider package anywhere in the owned surface', function () {
        const offenders = OWNED_FILES.filter((file) => MODEL_IMPORT.test(readFileSync(file, 'utf8')));
        expect(offenders).toEqual([]);
    });

    it('never invokes a network fetch or spawns a subprocess from validation logic', function () {
        const offenders = OWNED_FILES.filter((file) => /\bfetch\(|child_process|spawn\(|exec\(/u.test(readFileSync(file, 'utf8')));
        expect(offenders).toEqual([]);
    });

    it('keeps the contract module at or under the contract-module line ceiling', function () {
        expect(readFileSync(CONTRACTS_FILE, 'utf8').split('\n').length).toBeLessThanOrEqual(CONTRACT_MAX_LINES);
    });

    it('keeps every foundation validator module at or under the validator-module line ceiling', function () {
        const oversized = OWNED_FILES
            .filter((file) => file !== CONTRACTS_FILE)
            .map((file) => ({file, lines: readFileSync(file, 'utf8').split('\n').length}))
            .filter((entry) => entry.lines > VALIDATOR_MAX_LINES);
        expect(oversized).toEqual([]);
    });
});

/** F-04 regeneration/drift proof: the closed 14-type/12-effect vocabulary in `proposals.ts` must never silently diverge from `$defs.decisionProposal` in the canonical schema aggregate. */
describe('CA-09 proposal contracts — canonical schema agreement', function () {
    const schemaDoc = JSON.parse(readFileSync(CANONICAL_SCHEMA_FILE, 'utf8')) as {
        readonly $defs: {readonly decisionProposal: {
            readonly properties: {
                readonly type: {readonly enum: readonly string[]};
                readonly requestedEffects: {readonly items: {readonly properties: {readonly effect: {readonly enum: readonly string[]}}}};
            };
        }};
    };
    const decisionProposal = schemaDoc.$defs.decisionProposal;

    it('matches the canonical decisionProposal.type enum exactly, in the same order', function () {
        expect(decisionProposal.properties.type.enum).toEqual([...PROPOSAL_TYPES]);
    });

    it('matches the canonical requestedEffects[].effect enum exactly, in the same order', function () {
        expect(decisionProposal.properties.requestedEffects.items.properties.effect.enum).toEqual([...EFFECT_TYPES]);
    });
});
