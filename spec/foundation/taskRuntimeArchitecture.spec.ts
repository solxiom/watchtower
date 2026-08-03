import {readdirSync, readFileSync} from 'node:fs';
import {join, relative, sep} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const PROCESS_OWNER = join('foundation', 'runtime', 'NirvanaProcessInvoker.ts');
const TMUX_COMPATIBILITY_LEAF = join('foundation', 'TmuxSessionProcessRunner.ts');
const CHILD_PROCESS_IMPORT = /from\s+['"]node:child_process['"]/;
const TERMINAL_FACADE_IMPORT = /from\s+['"]@nirvana\/base\/terminal['"]/;
const NVB_FACADE_IMPORT = /from\s+['"]@nirvana\/commons(?:\/facades|\/foundation\/extra\/nvb)[A-Za-z0-9/._-]*['"]/;
const SHELL_OPTION = /shell\s*:\s*true/;

function sourceFiles(root: string): string[] {
    return readdirSync(root, {recursive: true, encoding: 'utf8'})
        .filter((name) => name.endsWith('.ts'))
        .map((name) => join(root, name));
}

function offenders(pattern: RegExp, allowed: readonly string[]): string[] {
    return sourceFiles(SOURCE_ROOT)
        .filter((path) => pattern.test(readFileSync(path, 'utf8')))
        .filter((path) => !allowed.some((owner) => path.endsWith(owner)))
        .map((path) => relative(SOURCE_ROOT, path));
}

describe('lane task runtime process boundary', () => {
    it('keeps `node:child_process` out of the lane task runtime capability', () => {
        // Positive control: the detector must see the import it is guarding against.
        expect(CHILD_PROCESS_IMPORT.test("import {spawn} from 'node:child_process';")).toBeTrue();
        const runtimeCapsules = sourceFiles(join(SOURCE_ROOT, 'foundation', 'runtime'))
            .concat(sourceFiles(join(SOURCE_ROOT, 'foundation', 'taskRuntime')))
            .filter((path) => CHILD_PROCESS_IMPORT.test(readFileSync(path, 'utf8')));
        expect(runtimeCapsules).toEqual([]);
    });

    it('confines the lane runtime process facade to its one adapter', () => {
        const runtimeOwners = offenders(TERMINAL_FACADE_IMPORT, [])
            .filter((path) => path.startsWith(`foundation${sep}runtime${sep}`)
                || path.startsWith(`foundation${sep}taskRuntime${sep}`));
        expect(runtimeOwners).toEqual([relative(SOURCE_ROOT, join(SOURCE_ROOT, PROCESS_OWNER))]);
    });

    it('never imports the NVB facade, whose run contract cannot express the pinned target', () => {
        expect(NVB_FACADE_IMPORT.test("import {nvb} from '@nirvana/commons/facades';")).toBeTrue();
        expect(offenders(NVB_FACADE_IMPORT, [])).toEqual([]);
    });

    it('never enables shell interpretation in any source module', () => {
        expect(SHELL_OPTION.test('options: {shell: true}')).toBeTrue();
        expect(offenders(SHELL_OPTION, [])).toEqual([]);
    });

    it('leaves the pre-existing tmux compatibility leaf as the only other spawn owner', () => {
        expect(offenders(CHILD_PROCESS_IMPORT, [TMUX_COMPATIBILITY_LEAF])).toEqual([]);
    });
});

describe('lane task runtime ownership', () => {
    it('routes every runtime invocation through the runner and leaf invoker only', () => {
        const commandSources = sourceFiles(join(SOURCE_ROOT, 'commands'))
            .concat([join(SOURCE_ROOT, 'cli.ts'), join(SOURCE_ROOT, 'run.ts')])
            .map((path) => readFileSync(path, 'utf8'));
        for (const source of commandSources) {
            expect(TERMINAL_FACADE_IMPORT.test(source)).toBeFalse();
            expect(CHILD_PROCESS_IMPORT.test(source)).toBeFalse();
            expect(source.includes('planLaneTaskInvocation')).toBeFalse();
        }
    });

    it('does not export raw process or runtime-internal escape hatches from any public barrel', async () => {
        const forbidden = [
            'NirvanaProcessInvoker', 'RuntimeProcessRequest', 'resolvePackagedNvbRunner',
            'planLaneTaskInvocation', 'readDeclaredTaskInput', 'NvbRunOutputReader', 'readNvbRecord',
            // Correction 04 finding 2: naming a valid action is not authority, so
            // the raw invoker never leaves the runtime composition.
            'LeafRuntimeInvoker', 'requireInvocationEnvelope', 'encodeTaskRequest'
        ];
        for (const barrel of ['../../src/foundation/index.js', '../../src/index.js']) {
            const exported = Object.keys(await import(barrel) as Record<string, unknown>);
            for (const name of forbidden) expect({barrel, name, exported: exported.includes(name)})
                .toEqual({barrel, name, exported: false});
        }
    });
});
