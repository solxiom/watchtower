import {readFileSync} from 'node:fs';
import JSON5 from 'json5';

const manifest = JSON5.parse(readFileSync('./runtime-nvb/nvb-manifest.json', 'utf8'));
if (!manifest.schemaVersion) throw new Error('invalid manifest');
process.stdout.write('runtime-nvb manifest ok\n');
