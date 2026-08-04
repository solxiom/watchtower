/**
 * Command layout architecture gate — group directories and root ratchet.
 */
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const COMMANDS_ROOT = join(SOURCE_ROOT, 'commands');

/** After CMD-01 — only index.ts remains at commands root. */
const BASELINE_ROOT_COMMAND_MODULES = [] as const;

const TOP_LEVEL_COMMAND_GROUPS = [
    'read',
    'status',
    'init',
    'upgrade',
    'skill',
    'watch',
    'doctor',
    'version',
    'events',
    'batch',
    'coordinator',
    'shared'
] as const;

const FORBIDDEN_HELPER_DIRS = ['utils', 'helpers', 'common', 'misc', 'sharedHelpers'];

function commandSourceFiles(): string[] {
    return readdirSync(COMMANDS_ROOT, {recursive: true, encoding: 'utf8'})
        .filter((name) => name.endsWith('.ts'))
        .map((name) => join(COMMANDS_ROOT, name));
}

function relCommandPath(absPath: string): string {
    return relative(COMMANDS_ROOT, absPath);
}

describe('command layout inventory', () => {
    it('positive control: detects a new flat root module', () => {
        expect(BASELINE_ROOT_COMMAND_MODULES.includes('ListCommand.ts' as typeof BASELINE_ROOT_COMMAND_MODULES[number])).toBeFalse();
        expect(BASELINE_ROOT_COMMAND_MODULES.includes('NewFlatCommand.ts' as typeof BASELINE_ROOT_COMMAND_MODULES[number])).toBeFalse();
    });

    it('ratchets flat root modules — no new .ts files at src/commands/ root', () => {
        const rootModules = readdirSync(COMMANDS_ROOT)
            .filter((name) => name.endsWith('.ts') && name !== 'index.ts')
            .sort();
        expect(rootModules).toEqual([...BASELINE_ROOT_COMMAND_MODULES].sort());
    });
});

describe('command layout structure', () => {
    it('forbids generic helper bag directories under commands/', () => {
        const dirs = readdirSync(COMMANDS_ROOT, {withFileTypes: true})
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);
        expect(dirs.filter((name) => FORBIDDEN_HELPER_DIRS.includes(name))).toEqual([]);
    });

    it('forbids directory-shadow pairs at commands root', () => {
        const entries = readdirSync(COMMANDS_ROOT, {withFileTypes: true});
        const dirs = new Set(entries.filter((e) => e.isDirectory()).map((e) => e.name.toLowerCase()));
        const shadows: string[] = [];
        for (const entry of entries) {
            if (!entry.isFile() || !entry.name.endsWith('Command.ts')) continue;
            const stem = entry.name.replace(/Command\.ts$/, '').toLowerCase();
            if (dirs.has(stem)) shadows.push(entry.name);
        }
        expect(shadows).toEqual([]);
    });
});

describe('command group import boundary', () => {
    it('positive control: detects cross-group sibling imports', () => {
        expect(/from\s+['"]\.\.\/init\//.test("from '../init/initCommandOptions.js'")).toBeTrue();
    });

    it('forbids imports across top-level command groups', () => {
        const groupPattern = TOP_LEVEL_COMMAND_GROUPS.join('|');
        const crossGroup = new RegExp(`from\\s+['"]\\.\\./(?!shared(?:/|['"]))(${groupPattern})/`);
        const escapeCrossGroup = new RegExp(`from\\s+['"]\\.\\./\\.\\./(?!shared(?:/|['"]))(${groupPattern})/`);

        const offenders: string[] = [];
        for (const file of commandSourceFiles()) {
            const rel = relCommandPath(file);
            if (!rel.includes('/')) continue;
            const topGroup = rel.split('/')[0];
            const text = readFileSync(file, 'utf8');
            const segments = rel.split('/');
            const pattern = segments.length === 2 ? crossGroup : escapeCrossGroup;
            for (const match of text.matchAll(new RegExp(pattern.source, 'g'))) {
                const importedGroup = match[1];
                if (importedGroup === topGroup) continue;
                if (topGroup === 'coordinator' && segments.length > 2 && importedGroup === 'coordinator') continue;
                offenders.push(`${relative(SOURCE_ROOT, file)} → ../${importedGroup}/`);
            }
        }
        expect(offenders).toEqual([]);
    });
});

describe('command group readiness', () => {
    it('documents expected top-level groups for future layout migration', () => {
        for (const group of ['read', 'init', 'upgrade', 'skill', 'status'] as const) {
            expect(TOP_LEVEL_COMMAND_GROUPS).toContain(group);
        }
    });

    it('allows Nirvana recursive discovery from src/commands/', () => {
        expect(existsSync(COMMANDS_ROOT)).toBeTrue();
    });
});
