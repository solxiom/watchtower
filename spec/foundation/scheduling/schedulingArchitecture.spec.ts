/**
 * Architecture proof for CA-04's exclusive owners: the module-size ceiling
 * and model-free requirement. Walks the actual source text rather than
 * trusting a hand-written inventory (precedent: `indexQueryArchitecture.spec.ts`).
 */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const SCHEDULING = join(SOURCE_ROOT, 'foundation', 'scheduling');
const OWNED_FILES = [join(SCHEDULING, 'ResourceClaims.ts'), join(SCHEDULING, 'ReadySet.ts')];

const MODEL_IMPORT = /from\s+['"](?:@anthropic-ai\/[^'"]*|anthropic|openai|langchain[^'"]*|ai)['"]|require\(\s*['"](?:@anthropic-ai\/[^'"]*|anthropic|openai)['"]\s*\)/i;
const ASYNC_MARKER = /\basync\b|\bPromise</;

describe('ReadySet/ResourceClaims — 200-line preferred foundation-service ceiling', function () {
    it('keeps every owned module at or under the mandatory 300-line hard limit', function () {
        const oversized = OWNED_FILES
            .map((file) => ({file, lines: readFileSync(file, 'utf8').split('\n').length}))
            .filter((entry) => entry.lines > 300);
        expect(oversized).toEqual([]);
    });
});

describe('ReadySet/ResourceClaims — model-free', function () {
    it('imports no model, LLM, or AI provider package', function () {
        // Positive control: the detector must see the pattern it is guarding against.
        expect(MODEL_IMPORT.test("import {Anthropic} from '@anthropic-ai/sdk';")).toBeTrue();
        for (const file of OWNED_FILES) expect(MODEL_IMPORT.test(readFileSync(file, 'utf8'))).toBeFalse();
    });

    it('exposes only synchronous computation — no async keyword or Promise return type', function () {
        // Positive control.
        expect(ASYNC_MARKER.test('export async function computeReadySet(): Promise<ReadySetResult> {}')).toBeTrue();
        for (const file of OWNED_FILES) expect(ASYNC_MARKER.test(readFileSync(file, 'utf8'))).toBeFalse();
    });
});

describe('ReadySet/ResourceClaims — no duplicated claim-conflict/DAG ownership', function () {
    it('ReadySet.ts delegates claim evaluation to ResourceClaims.ts rather than reimplementing overlap logic', function () {
        const readySet = readFileSync(join(SCHEDULING, 'ReadySet.ts'), 'utf8');
        expect(readySet).toContain("from './ResourceClaims.js'");
        expect(readySet).not.toContain('resourcePathsOverlap');
    });
});
