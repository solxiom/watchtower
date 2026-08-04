/**
 * FR-17 status domain architecture gate.
 */
import {readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const FOUNDATION = join(SOURCE_ROOT, 'foundation');
const STATUS_DIR = join(FOUNDATION, 'status');

const OWNED_MODULES = readdirSync(STATUS_DIR)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => join(STATUS_DIR, name));

const L4_PLUS_IMPORT = /from\s+['"]\.\.\/(init|pack|upgrade|lifecycle)\//;
const L4_RUNTIME_SUBCAPSULE = /from\s+['"]\.\.\/runtime\/(catalog|distribution|knowledge|leaf)\//;
const OWNED_MODULE_LIMIT = 200;

describe('status domain inventory (FR-17)', () => {
    it('owns exactly twenty-two modules plus the barrel', () => {
        const modules = OWNED_MODULES.map((file) => relative(STATUS_DIR, file)).sort();
        expect(modules).toEqual([
            'StatusAcceptedInputInspector.ts',
            'StatusConflictInspector.ts',
            'StatusEventProjection.ts',
            'StatusLaneInputReader.ts',
            'StatusLiveObserver.ts',
            'StatusPackAcceptanceAuthority.ts',
            'StatusPackContractReader.ts',
            'StatusPackFileInventory.ts',
            'StatusPackGitInspector.ts',
            'StatusPackGraphValidator.ts',
            'StatusPackIntegrity.ts',
            'StatusProjection.ts',
            'StatusProofInputInspector.ts',
            'StatusRepositoryGitInspector.ts',
            'StatusRuntimeInventory.ts',
            'StatusSourceBaselineInspector.ts',
            'index.ts',
            'statusHealth.ts',
            'statusLaneTypes.ts',
            'statusPackRecordProjection.ts',
            'statusPackTypes.ts',
            'statusRegularFileIdentity.ts',
            'statusViewProjection.ts'
        ]);
    });

    it('keeps every owned module inside its preferred size band', () => {
        const oversized = OWNED_MODULES
            .filter((file) => !file.endsWith('index.ts'))
            .map((file) => ({file: relative(SOURCE_ROOT, file), lines: readFileSync(file, 'utf8').split('\n').length}))
            .filter((entry) => entry.lines > OWNED_MODULE_LIMIT);
        expect(oversized).toEqual([]);
    });
});

describe('status domain L3 boundary (FR-17)', () => {
    it('never imports L4+ foundation domains', () => {
        expect(L4_PLUS_IMPORT.test("from '../init/InitPlanner.js'")).toBeTrue();
        const offenders = OWNED_MODULES
            .map((file) => ({file: relative(SOURCE_ROOT, file), text: readFileSync(file, 'utf8')}))
            .filter(({text}) => L4_PLUS_IMPORT.test(text))
            .map(({file}) => file);
        expect(offenders).toEqual([]);
    });
});
