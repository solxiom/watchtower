import {chmodSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';

const validator = join(process.cwd(), 'scripts', 'validateDevelopmentNvb.mjs');
const fixtures = join(process.cwd(), 'spec', 'fixtures', 'developmentNvb');
const temporaryRoot = mkdtempSync(join(fixtures, '.rm11-'));

function validate(...args: string[]): string {
    return execFileSync('node', [validator, ...args], {encoding: 'utf8'});
}

function writeFixture(name: string, contents: string): string {
    const path = join(temporaryRoot, name);
    writeFileSync(path, contents, 'utf8');
    return path;
}

function expectCode(code: string, ...args: string[]): void {
    expect(() => validate(...args)).toThrowError(new RegExp(code));
}

function withPhysicalLines(contents: string, count: number, finalNewline: boolean): string {
    return contents + '\n'.repeat(count - 1) + (finalNewline ? '\n' : ' ');
}

function currentBaseline(): string {
    return JSON.stringify(JSON.parse(readFileSync(join(process.cwd(), 'nvb', 'developmentNvbCatalog.json'), 'utf8')));
}

afterAll(function () {
    rmSync(temporaryRoot, {recursive: true, force: true});
});

describe('development NVB parent chain', function () {
    it('preserves the accepted effective task and group identities', function () {
        const output = validate();
        expect(JSON.parse(output)).toEqual({
            tasks: [
                'build', 'build:tests', 'check:development-nvb', 'clean', 'dist:chmod-bin', 'dist:clean', 'dist:clean-build',
                'dist:clean-esm-stamp', 'dist:compile', 'dist:copy-bin', 'dist:copy-config',
                'dist:copy-help', 'dist:fix-esm', 'dist:package', 'dist:runtime-nvb:compile',
                'dist:runtime-nvb:copy', 'runtime-nvb:validate', 'schema:stage-build',
                'schema:stage-dist', 'test'
            ],
            groups: ['dev:run', 'dist']
        });
    });

    it('rejects duplicate task and group identities', function () {
        expectCode('DEVELOPMENT_NVB_TASK_DUPLICATE', '--config', join(fixtures, 'duplicateTask.nvb.json'));
        expectCode('DEVELOPMENT_NVB_GROUP_DUPLICATE', '--config', join(fixtures, 'duplicateGroup.nvb.json'));
    });

    it('rejects missing, circular, and canonical traversal parents', function () {
        expectCode('DEVELOPMENT_NVB_PARENT_MISSING', '--config', join(fixtures, 'missingParent.nvb.json'));
        expectCode('DEVELOPMENT_NVB_PARENT_CYCLE', '--config', join(fixtures, 'cycleA.nvb.json'));
        expectCode('DEVELOPMENT_NVB_PARENT_ESCAPE', '--config', join(fixtures, 'escape.nvb.json'));
        const traversal = writeFixture('traversal.nvb.json', '{ parent: "../../../../../../../../../etc/hosts" }');
        expectCode('DEVELOPMENT_NVB_PARENT_ESCAPE', '--config', traversal);
    });

    it('rejects outside symlinks at the initial config and parent positions', function () {
        const direct = join(temporaryRoot, 'outside-direct.nvb.json');
        const parent = join(temporaryRoot, 'outside-parent.nvb.json');
        symlinkSync('/etc/hosts', direct);
        symlinkSync('/etc/hosts', parent);
        const child = writeFixture('outside-child.nvb.json', '{ parent: "./outside-parent.nvb.json" }');
        expectCode('DEVELOPMENT_NVB_PARENT_ESCAPE', '--config', direct);
        expectCode('DEVELOPMENT_NVB_PARENT_ESCAPE', '--config', child);
    });

    it('fails a broken symlink as missing before any escape decision', function () {
        const broken = join(temporaryRoot, 'broken.nvb.json');
        symlinkSync('/not-present/rm11.nvb.json', broken);
        expectCode('DEVELOPMENT_NVB_PARENT_MISSING', '--config', broken);
    });

    it('rejects malformed, non-object, unsupported, and invalid shape values', function () {
        const cases = [
            ['malformed.nvb.json', '{', 'DEVELOPMENT_NVB_SCHEMA_INVALID'],
            ['non-object.nvb.json', '[]', 'DEVELOPMENT_NVB_SCHEMA_INVALID'],
            ['unsupported.nvb.json', '{ unknown: true }', 'DEVELOPMENT_NVB_UNSUPPORTED_FIELD'],
            ['parent-array.nvb.json', '{ parent: [] }', 'DEVELOPMENT_NVB_SCHEMA_INVALID'],
            ['tasks-array.nvb.json', '{ tasks: [] }', 'DEVELOPMENT_NVB_SCHEMA_INVALID'],
            ['groups-array.nvb.json', '{ groups: [] }', 'DEVELOPMENT_NVB_SCHEMA_INVALID']
        ];
        for (const [name, contents, code] of cases) {
            expectCode(code, '--config', writeFixture(name, contents));
        }
    });

    it('counts config physical lines independently of a final newline', function () {
        const atLimit = [false, true].map((newline) => writeFixture(
            `config-at-limit-${newline}.nvb.json`, withPhysicalLines('{}', 120, newline)
        ));
        const aboveLimit = [false, true].map((newline) => writeFixture(
            `config-above-limit-${newline}.nvb.json`, withPhysicalLines('{}', 121, newline)
        ));
        for (const config of atLimit) expect(validate('--config', config)).toContain('"tasks":[]');
        for (const config of aboveLimit) expectCode('DEVELOPMENT_NVB_PHYSICAL_LIMIT', '--config', config);
    });

    it('rejects every invalid effective-catalog outer shape before dereference', function () {
        const stale = writeFixture('stale-baseline.json', '{"taskIds":[],"groupIds":[]}');
        const corrupt = writeFixture('corrupt-baseline.json', '{');
        const invalid = [
            'null', '[]', '1', '"value"', '{}', '{"taskIds":[],"groupIds":[],"extra":true}',
            '{"taskIds":[],"groupIds":"wrong"}', '{"taskIds":["same","same"],"groupIds":[]}'
        ];
        expectCode('DEVELOPMENT_NVB_CATALOG_DRIFT', '--config', join(process.cwd(), 'nvb.json'), '--baseline', stale);
        expectCode('DEVELOPMENT_NVB_BASELINE_CORRUPT', '--config', join(process.cwd(), 'nvb.json'), '--baseline', corrupt);
        for (const [index, contents] of invalid.entries()) {
            expectCode('DEVELOPMENT_NVB_BASELINE_INVALID', '--config', join(process.cwd(), 'nvb.json'), '--baseline', writeFixture(`invalid-baseline-${index}.json`, contents));
        }
    });

    it('enforces the physical limit for catalog baselines with either final-newline representation', function () {
        const atLimit = [false, true].map((newline) => writeFixture(
            `baseline-at-limit-${newline}.json`, withPhysicalLines(currentBaseline(), 120, newline)
        ));
        const aboveLimit = [false, true].map((newline) => writeFixture(
            `baseline-above-limit-${newline}.json`, withPhysicalLines(currentBaseline(), 121, newline)
        ));
        for (const baseline of atLimit) validate('--config', join(process.cwd(), 'nvb.json'), '--baseline', baseline);
        for (const baseline of aboveLimit) {
            expectCode('DEVELOPMENT_NVB_PHYSICAL_LIMIT', '--config', join(process.cwd(), 'nvb.json'), '--baseline', baseline);
        }
    });

    it('refuses an unreadable config when platform permissions enforce it', function () {
        const unreadable = writeFixture('unreadable.nvb.json', '{}');
        chmodSync(unreadable, 0o000);
        try {
            expectCode('DEVELOPMENT_NVB_PARENT_UNREADABLE', '--config', unreadable);
        } finally {
            chmodSync(unreadable, 0o600);
        }
    });

    it('keeps canonical identity validation stable from a relocated working directory', function () {
        const output = execFileSync('node', [validator, '--config', '../nvb.json'], {
            cwd: join(process.cwd(), 'spec'),
            encoding: 'utf8'
        });
        expect(JSON.parse(output).groups).toEqual(['dev:run', 'dist']);
    });
});
