import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

const moduleCollectionDeclaration = /^(?:export\s+)?(?:const|let|var)\s+\w+\s*=\s*new\s+(?:WeakSet|WeakMap|Map|Set)\b/m;

describe('contract source architecture', function () {
    it('rejects module-scope mutable collection or registry declarations', function () {
        expect(moduleCollectionDeclaration.test('const approvedPayloads = new WeakSet<object>();')).toBeTrue();
        const contractsDirectory = join(process.cwd(), 'src', 'contracts');
        const contractSources = readdirSync(contractsDirectory)
            .filter((name) => name.endsWith('.ts'))
            .map((name) => readFileSync(join(contractsDirectory, name), 'utf8'));
        for (const source of contractSources) {
            expect(moduleCollectionDeclaration.test(source)).toBeFalse();
        }
    });
});
