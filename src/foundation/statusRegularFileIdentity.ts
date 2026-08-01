import {lstatSync, realpathSync} from 'node:fs';
import {resolve, sep} from 'node:path';

export function regularContainedFile(root: string, child: string): string | undefined {
    const canonicalRoot = realpathSync(root);
    const lexical = resolve(root, child);
    if (lexical === canonicalRoot || !lexical.startsWith(`${canonicalRoot}${sep}`)) return undefined;
    const state = lstatSync(lexical);
    if (!state.isFile() || state.isSymbolicLink()) return undefined;
    const canonical = realpathSync(lexical);
    return canonical === lexical && canonical.startsWith(`${canonicalRoot}${sep}`) ? canonical : undefined;
}
