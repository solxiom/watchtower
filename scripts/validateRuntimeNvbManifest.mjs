import {readFileSync} from 'node:fs';

const manifest = JSON.parse(readFileSync('./runtime-nvb/nvb-manifest.json', 'utf8'));
if (!manifest.schemaVersion) throw new Error('invalid manifest');
process.stdout.write('runtime-nvb manifest ok\n');
