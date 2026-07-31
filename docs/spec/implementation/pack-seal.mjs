#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const implementationRoot = path.dirname(fileURLToPath(import.meta.url));
const packs = ['wt-read-model', 'wt-runtime-distribution', 'wt-lane-lifecycle', 'wt-upgrade-knowledge', 'wt-coordinator-automation', 'wt-v1-release'];
const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(target) : [target];
});

console.log('| Pack | Files | Bytes | Candidate seal |');
console.log('|---|---:|---:|---|');
for (const pack of packs) {
  const directory = path.join(implementationRoot, pack);
  const files = walk(directory).sort((left, right) => Buffer.compare(Buffer.from(path.relative(directory, left), 'utf8'), Buffer.from(path.relative(directory, right), 'utf8')));
  let bytes = 0;
  const records = [];
  for (const file of files) {
    const body = fs.readFileSync(file);
    const relative = path.relative(directory, file);
    bytes += body.length;
    records.push(Buffer.from(relative, 'utf8'), Buffer.from([0]), Buffer.from(String(body.length), 'ascii'), Buffer.from([0]), Buffer.from(`sha256:${crypto.createHash('sha256').update(body).digest('hex')}\n`, 'ascii'));
  }
  const seal = `sha256:${crypto.createHash('sha256').update(Buffer.concat(records)).digest('hex')}`;
  console.log(`| \`${pack}\` | ${files.length} | ${bytes} | \`${seal}\` |`);
}
