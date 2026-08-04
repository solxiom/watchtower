/**
 * FR-28 command import architecture gate.
 */
import {readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');

const DOMAIN_BARREL_PATTERN = /^\.\.\/foundation\/[a-zA-Z]+\/index\.js$/;
const CAPABILITY_BARREL_PATTERN = /^\.\.\/foundation\/(runtime|task|lane|index)\/index\.js$/;

function commandSources(): string[] {
    return readdirSync(join(SOURCE_ROOT, 'commands'), {encoding: 'utf8'})
        .filter((name) => name.endsWith('.ts'))
        .map((name) => join(SOURCE_ROOT, 'commands', name));
}

function extractFoundationImportPaths(source: string): string[] {
    const importPattern = /import(?:\s+type)?[\s\S]*?from\s+['"]((?:\.\.?\/)+foundation(?:\/[^'"]+)?)['"]/g;
    return [...source.matchAll(importPattern)].map((match) => match[1]);
}

function isAllowedCommandFoundationImport(specifier: string): boolean {
    return DOMAIN_BARREL_PATTERN.test(specifier) || CAPABILITY_BARREL_PATTERN.test(specifier);
}

describe('command foundation import boundary (FR-28)', () => {
    it('positive control: accepts domain barrel imports', () => {
        expect(isAllowedCommandFoundationImport('../foundation/read/index.js')).toBeTrue();
        expect(isAllowedCommandFoundationImport('../foundation/index.js')).toBeFalse();
    });

    it('imports foundation only through domain or capability barrels', () => {
        const offenders: Array<{file: string; specifier: string}> = [];
        for (const path of commandSources()) {
            const rel = relative(SOURCE_ROOT, path);
            for (const specifier of extractFoundationImportPaths(readFileSync(path, 'utf8'))) {
                if (!isAllowedCommandFoundationImport(specifier)) {
                    offenders.push({file: rel, specifier});
                }
            }
        }
        expect(offenders).toEqual([]);
    });

    it('routes run.ts presentation imports through the presentation barrel', () => {
        const imports = extractFoundationImportPaths(readFileSync(join(SOURCE_ROOT, 'run.ts'), 'utf8'));
        expect(imports).toEqual(['./foundation/presentation/index.js']);
    });
});
