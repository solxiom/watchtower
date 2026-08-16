import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

const TRACKER = join(process.cwd(), 'docs', 'spec', 'implementation', 'wt-v1-release', 'implementation-tracker.md');
const RUNTIME_MANIFEST = join(process.cwd(), 'runtime', 'manifest.json');
const DIST_RUNTIME_MANIFEST = join(process.cwd(), 'dist', 'runtime', 'manifest.json');
const QUICK_START = join(process.cwd(), 'docs', 'operator-quick-start.md');
const RELEASE_NOTES = join(process.cwd(), 'docs', 'release-notes', 'v1.0.0.md');
const README = join(process.cwd(), 'README.md');

describe('REL-04 release gate documentation consistency', function () {
    it('keeps package and nira version markers aligned', function () {
        const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {version?: string};
        const nira = readFileSync(join(process.cwd(), 'nira.json'), 'utf8');
        expect(pkg.version).toBe('0.1.0');
        expect(nira).toContain("version: '0.1.0'");
        expect(nira).toContain("version: '1.0.0-alpha'");
    });

    it('registers every help.json command with a matching fragment file', function () {
        const help = JSON.parse(readFileSync(join(process.cwd(), 'help', 'help.json'), 'utf8')) as {
            commands: {name: string}[];
        };
        for (const command of help.commands) {
            const fragment = join(process.cwd(), 'help', 'commands', `${command.name}.hlp.json`);
            expect(existsSync(fragment)).withContext(command.name).toBeTrue();
        }
    });

    it('lists only shipped command front doors present under src/commands/', function () {
        const help = JSON.parse(readFileSync(join(process.cwd(), 'help', 'help.json'), 'utf8')) as {
            commands: {name: string}[];
        };
        const registered = new Set(collectCommandNames(join(process.cwd(), 'src', 'commands')));
        for (const command of help.commands) {
            expect(registered.has(command.name)).withContext(command.name).toBeTrue();
        }
    });

    it('ships no hello scaffold in the static help registry', function () {
        const serialized = readFileSync(join(process.cwd(), 'help', 'help.json'), 'utf8').toLowerCase();
        expect(serialized).not.toContain('"name": "hello"');
        expect(serialized).not.toContain('hellocommand');
    });

    it('aligns operator quick start runtime with the packaged runtime manifest', function () {
        const runtimeVersion = readRuntimeVersion(RUNTIME_MANIFEST);
        const quickStart = readFileSync(QUICK_START, 'utf8');
        expect(quickStart).toContain(`--runtime=${runtimeVersion}`);
        expect(quickStart).not.toContain('--runtime=1.0.0');
        if (existsSync(DIST_RUNTIME_MANIFEST)) {
            expect(readRuntimeVersion(DIST_RUNTIME_MANIFEST)).toBe(runtimeVersion);
        }
    });

    it('withholds final-release completion claims while REL-04 is not accepted', function () {
        const tracker = readFileSync(TRACKER, 'utf8');
        const rel04State = tracker.match(/\|\s*REL-04\s*\|[^|]*\|\s*([^|]+)\s*\|/u)?.[1]?.trim() ?? '';
        if (rel04State.includes('Accepted')) return;

        const readme = readFileSync(README, 'utf8').toLowerCase();
        const releaseNotes = readFileSync(RELEASE_NOTES, 'utf8').toLowerCase();
        for (const forbidden of FINAL_RELEASE_CLAIMS) {
            expect(readme).not.toContain(forbidden);
            expect(releaseNotes).not.toContain(forbidden);
        }
        expect(readme).toMatch(/rel-04|handoff|independent review/u);
        expect(releaseNotes).toMatch(/pre-acceptance|completion gate|rel-04/u);
    });

    it('publishes release notes and operator quick start with verifiable package version', function () {
        const releaseNotes = readFileSync(RELEASE_NOTES, 'utf8');
        const quickStart = readFileSync(QUICK_START, 'utf8');
        const readme = readFileSync(README, 'utf8');
        expect(releaseNotes).toContain('0.1.0');
        expect(quickStart).toContain('wt init');
        expect(readme).toContain('docs/operator-quick-start.md');
        expect(readme).toContain('docs/release-notes/v1.0.0.md');
        expect(readme.toLowerCase()).not.toContain('(planned)');
    });
});

const FINAL_RELEASE_CLAIMS = [
    'release qualification complete',
    'all 74 implementation batches and six',
    'all 74 v1 implementation batches',
    'v1 is complete'
];

function readRuntimeVersion(path: string): string {
    const manifest = JSON.parse(readFileSync(path, 'utf8')) as {runtimeVersion?: string};
    expect(typeof manifest.runtimeVersion).toBe('string');
    return manifest.runtimeVersion as string;
}

function collectCommandNames(root: string): string[] {
    return readdirSync(root, {withFileTypes: true, recursive: true})
        .filter(entry => entry.isFile() && entry.name.endsWith('Command.ts'))
        .flatMap(entry => {
            const source = readFileSync(join(entry.parentPath ?? root, entry.name), 'utf8');
            const match = source.match(/\bname\s*=\s*['"]([^'"]+)['"]/u);
            return match ? [match[1]] : [];
        });
}
