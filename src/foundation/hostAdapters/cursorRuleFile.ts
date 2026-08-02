import {readFileSync} from 'node:fs';
import {findLaneStateMarker, laneStateError} from './knowledgePackSource.js';
import {writeDurableFileAtomic} from './hostAdapterInstaller.js';

const VERSION_HEADER = /^# watchtower-knowledge-version: (\S+)$/m;

/** Concatenates scoped assets into one Cursor rule file with a version-comment header. */
export function writeCursorRuleFile(destination: string, knowledgeVersion: string, bytes: ReadonlyMap<string, Buffer>): void {
    const sections = [...bytes.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([path, content]) => {
        const text = content.toString('utf8');
        const marker = findLaneStateMarker(text);
        if (marker !== null) throw laneStateError(path, marker);
        return `# ---- ${path} ----\n${text}`;
    });
    const header = `# watchtower-knowledge-version: ${knowledgeVersion}\n# watchtower-installed-at: ${new Date().toISOString()}\n\n`;
    writeDurableFileAtomic(destination, `${header}${sections.join('\n')}`, 0o644);
}

export function readVersionCommentHeader(destination: string): string | null {
    try {
        return VERSION_HEADER.exec(readFileSync(destination, 'utf8'))?.[1] ?? null;
    } catch {
        return null;
    }
}
