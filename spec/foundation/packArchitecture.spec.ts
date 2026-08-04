/**
 * FR-19 pack domain architecture gate.
 */
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const FOUNDATION = join(SOURCE_ROOT, 'foundation');
const PACK_DIR = join(FOUNDATION, 'pack');

const OWNED_MODULES = readdirSync(PACK_DIR)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => join(PACK_DIR, name));

const L5_CAPSULE_IMPORT = /from\s+['"]\.\.\/(laneStore|transactionalWriter|runtime|packIndex|indexStore|indexQuery|coordinatorBaseline|taskRuntime)\//;
const OWNED_MODULE_LIMIT = 262;
const COMMONS_STORAGE = '@nirvana/commons/foundation/storage/basic';
const GIT_DRIVER = '@nirvana/base/git';
const AJV = 'ajv/dist/2020.js';

describe('pack domain inventory (FR-19)', () => {
    it('owns exactly ten modules plus the barrel', () => {
        const modules = OWNED_MODULES.map((file) => relative(PACK_DIR, file)).sort();
        expect(modules).toEqual([
            'PackAcceptance.ts',
            'PackConsumer.ts',
            'PackDriftObserver.ts',
            'PackSeal.ts',
            'index.ts',
            'packConsumerPorts.ts',
            'packFilesystemHost.ts',
            'packGitHost.ts',
            'packJsonReaders.ts',
            'packSchemaFormats.ts',
            'packSchemaValidatorsHost.ts'
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

describe('pack domain host adapter boundary (FR-19)', () => {
    it('splits filesystem, Git, and schema host ownership under pack/', () => {
        expect(existsSync(join(PACK_DIR, 'packFilesystemHost.ts'))).toBeTrue();
        expect(existsSync(join(PACK_DIR, 'packGitHost.ts'))).toBeTrue();
        expect(existsSync(join(PACK_DIR, 'packSchemaValidatorsHost.ts'))).toBeTrue();
        expect(existsSync(join(FOUNDATION, 'PackConsumerHost.ts'))).toBeFalse();
    });

    it('confines each Nirvana host dependency to its single owning module', () => {
        const filesystem = readFileSync(join(PACK_DIR, 'packFilesystemHost.ts'), 'utf8');
        expect(filesystem.includes(COMMONS_STORAGE)).toBeTrue();
        expect(filesystem.includes(GIT_DRIVER)).toBeFalse();
        expect(filesystem.includes(AJV)).toBeFalse();

        const gitHost = readFileSync(join(PACK_DIR, 'packGitHost.ts'), 'utf8');
        expect(gitHost.includes(GIT_DRIVER)).toBeTrue();
        expect(gitHost.includes(COMMONS_STORAGE)).toBeFalse();
        expect(gitHost.includes(AJV)).toBeFalse();

        const schema = readFileSync(join(PACK_DIR, 'packSchemaValidatorsHost.ts'), 'utf8');
        expect(schema.includes(AJV)).toBeTrue();
        expect(schema.includes(GIT_DRIVER)).toBeFalse();
        expect(schema.includes(COMMONS_STORAGE)).toBeFalse();
    });
});

describe('pack domain L4 boundary (FR-19)', () => {
    it('never imports L5 foundation capsules directly', () => {
        expect(L5_CAPSULE_IMPORT.test("from '../packIndex/index.js'")).toBeTrue();
        const offenders = OWNED_MODULES
            .map((file) => ({file: relative(SOURCE_ROOT, file), text: readFileSync(file, 'utf8')}))
            .filter(({text}) => L5_CAPSULE_IMPORT.test(text))
            .map(({file}) => file);
        expect(offenders).toEqual([]);
    });
});
