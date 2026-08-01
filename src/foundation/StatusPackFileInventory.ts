import {createHash} from 'node:crypto';
import {lstatSync, readFileSync, readdirSync, realpathSync, type Stats} from 'node:fs';
import {relative, resolve, sep} from 'node:path';
import type {PackFileDigest} from './statusPackTypes.js';

export interface PackInventory {readonly files: readonly PackFileDigest[]; readonly invalidEntry: boolean;}

export class StatusPackFileInventory {
    text(root: string, path: string): string { return readFileSync(contained(root, path), 'utf8'); }
    bytes(root: string, path: string): Buffer { return readFileSync(contained(root, path)); }

    inspect(root: string): PackInventory {
        const canonicalRoot = realpathSync(root);
        const files: PackFileDigest[] = [];
        let invalidEntry = false;
        const visit = (directory: string): void => {
            for (const name of readdirSync(directory).sort()) {
                const path = resolve(directory, name);
                const stat = lstatSync(path);
                if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) { invalidEntry = true; continue; }
                if (stat.isDirectory()) visit(path);
                else if (relative(canonicalRoot, path).split(sep).join('/') !== 'implementation-pack.lock.json') {
                    const bytes = readFileSync(path);
                    files.push({path: relative(canonicalRoot, path).split(sep).join('/'),
                        sha256: `sha256:${createHash('sha256').update(bytes).digest('hex')}`, bytes: bytes.length});
                }
            }
        };
        visit(canonicalRoot);
        return {files: files.sort((a, b) => a.path.localeCompare(b.path)), invalidEntry};
    }
}

function contained(root: string, child: string): string {
    const target = resolve(root, child);
    if (target !== root && !target.startsWith(`${resolve(root)}${sep}`)) throw new Error('pack path escape');
    return target;
}
