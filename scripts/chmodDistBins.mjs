import {chmodSync, existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const packagePath = resolve('dist/package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
const bins = packageJson && typeof packageJson.bin === 'object' ? Object.values(packageJson.bin) : [];

for (const bin of bins) {
    const path = resolve('dist', String(bin).replace(/^\.\//, ''));
    if (existsSync(path)) chmodSync(path, 0o755);
}
