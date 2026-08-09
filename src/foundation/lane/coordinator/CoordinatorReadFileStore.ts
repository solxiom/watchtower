import {readFileSync} from 'node:fs';
import {dirname, isAbsolute, relative, resolve} from 'node:path';
import {realpathSync} from 'node:fs';
import type {JsonValue} from '../../../contracts/index.js';
import {hasDuplicateMembers, jsonValue, readFailure, type JsonLineRecord, type ReadResult} from './coordinatorReadContracts.js';

export interface CoordinatorReadFileStore {
    path(laneDir: string, relativePath: string): string | undefined;
    readJson(laneDir: string, relativePath: string): ReadResult<JsonValue>;
    readJsonLines(laneDir: string, relativePath: string): ReadResult<readonly JsonLineRecord[]>;
    exists(laneDir: string, relativePath: string): boolean;
}

const MAX_JSON_BYTES = 512 * 1024;

export class NodeCoordinatorReadFileStore implements CoordinatorReadFileStore {
    path(laneDir: string, relativePath: string): string | undefined {
        if (isAbsolute(relativePath)) return undefined;
        let root: string;
        try { root = realpathSync(resolve(laneDir)); } catch { return undefined; }
        const candidate = resolve(root, relativePath);
        const lexicalDifference = relative(root, candidate);
        if (lexicalDifference === '..' || lexicalDifference.startsWith('../')) return undefined;
        try {
            const canonicalCandidate = realpathSync(candidate);
            const canonicalDifference = relative(root, canonicalCandidate);
            return canonicalDifference === '..' || canonicalDifference.startsWith('../') ? undefined : canonicalCandidate;
        } catch {
            try {
                const canonicalParent = realpathSync(dirname(candidate));
                const canonicalDifference = relative(root, canonicalParent);
                return canonicalDifference === '..' || canonicalDifference.startsWith('../') ? undefined : candidate;
            } catch { return candidate; }
        }
    }

    readJson(laneDir: string, relativePath: string): ReadResult<JsonValue> {
        const text = this.readText(laneDir, relativePath);
        if (!text.ok) return text;
        try {
            const parsed: unknown = JSON.parse(text.value);
            // A repeated member name parses, but names two documents; refuse it
            // rather than project whichever value happened to survive.
            if (hasDuplicateMembers(text.value)) return readFailure('COORDINATOR_JSON_INVALID', relativePath);
            const value = jsonValue(parsed);
            return value === null && parsed !== null ? readFailure('COORDINATOR_JSON_INVALID', relativePath) : {ok: true, value};
        } catch { return readFailure('COORDINATOR_JSON_INVALID', relativePath); }
    }

    readJsonLines(laneDir: string, relativePath: string): ReadResult<readonly JsonLineRecord[]> {
        const text = this.readText(laneDir, relativePath);
        if (!text.ok) return text;
        const lines = text.value.split('\n');
        const records: JsonLineRecord[] = [];
        for (let index = 0; index < lines.length; index += 1) {
            const line = lines[index];
            if (line.trim().length === 0) continue;
            try {
                const parsed: unknown = JSON.parse(line);
                const value = jsonValue(parsed);
                if ((value === null && parsed !== null) || hasDuplicateMembers(line)) return readFailure('COORDINATOR_JSONL_INVALID', relativePath, index + 1);
                records.push({line: index + 1, value});
            } catch { return readFailure('COORDINATOR_JSONL_INVALID', relativePath, index + 1); }
        }
        // Validate the complete durable prefix before callers apply any display bound.
        return {ok: true, value: records};
    }

    exists(laneDir: string, relativePath: string): boolean {
        const target = this.path(laneDir, relativePath);
        if (target === undefined) return false;
        try { return readFileSync(target, {flag: 'r'}).byteLength >= 0; } catch { return false; }
    }

    private readText(laneDir: string, relativePath: string): ReadResult<string> {
        const target = this.path(laneDir, relativePath);
        if (target === undefined) return readFailure('COORDINATOR_PATH_UNAUTHORIZED', relativePath);
        try {
            const bytes = readFileSync(target);
            if (bytes.byteLength > MAX_JSON_BYTES) return readFailure('COORDINATOR_JSON_INVALID', relativePath);
            return {ok: true, value: bytes.toString('utf8')};
        } catch { return readFailure('COORDINATOR_JSON_INVALID', relativePath); }
    }
}
