import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

const FOUNDATION = join(process.cwd(), 'src', 'foundation');

function source(name: string): string {
    return readFileSync(join(FOUNDATION, name), 'utf8');
}

const COMMONS_STORAGE = '@nirvana/commons/foundation/storage/basic';
const GIT_DRIVER = '@nirvana/base/git';
const AJV = 'ajv/dist/2020.js';

describe('pack host adapter ownership', function () {
    it('splits the host boundary into focused filesystem, Git, and schema owners', function () {
        expect(existsSync(join(FOUNDATION, 'packFilesystemHost.ts'))).toBeTrue();
        expect(existsSync(join(FOUNDATION, 'packGitHost.ts'))).toBeTrue();
        expect(existsSync(join(FOUNDATION, 'packSchemaValidatorsHost.ts'))).toBeTrue();
        // The former mixed module no longer exists.
        expect(existsSync(join(FOUNDATION, 'PackConsumerHost.ts'))).toBeFalse();
    });

    it('confines each Nirvana host dependency to its single owning module', function () {
        const filesystem = source('packFilesystemHost.ts');
        expect(filesystem.includes(COMMONS_STORAGE)).toBeTrue();
        expect(filesystem.includes(GIT_DRIVER)).toBeFalse();
        expect(filesystem.includes(AJV)).toBeFalse();

        const gitHost = source('packGitHost.ts');
        expect(gitHost.includes(GIT_DRIVER)).toBeTrue();
        expect(gitHost.includes(COMMONS_STORAGE)).toBeFalse();
        expect(gitHost.includes(AJV)).toBeFalse();

        const schema = source('packSchemaValidatorsHost.ts');
        expect(schema.includes(AJV)).toBeTrue();
        expect(schema.includes(GIT_DRIVER)).toBeFalse();
        expect(schema.includes(COMMONS_STORAGE)).toBeFalse();
    });
});
