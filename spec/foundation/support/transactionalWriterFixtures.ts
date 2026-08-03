import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {TransactionalWriteError} from '../../../src/foundation/TransactionalWriter.js';
import type {LaneLayout} from '../../../src/foundation/laneStore/laneStoreContracts.js';
import type {TransactionalWriterFileHandle, TransactionalWriterFileSystem} from '../../../src/foundation/transactionalWriter/transactionalWriterFileSystem.js';

export const LANE_DIR = '/repo/.watchtower/lanes/lane-1';
export const LANES_DIR = '/repo/.watchtower/lanes';
export const STAGING = `${LANES_DIR}/.staging-fake`;
export const CONFIG_TARGET = '/data/runtimes/1.0.0/runtime-nvb/runtime-nvb.json';
const CONFIG_BYTES = Buffer.from('runtime-nvb config fixture bytes');
export const CONFIG_SHA256 = `sha256:${createHash('sha256').update(CONFIG_BYTES).digest('hex')}` as const;

export function layout(): LaneLayout {
    return {
        laneDir: LANE_DIR,
        dirs: [LANE_DIR, join(LANE_DIR, 'bin'), join(LANE_DIR, 'state')],
        files: [
            {path: join(LANE_DIR, 'lane.config.env'), content: 'LANE_ID="x"\n'},
            {path: join(LANE_DIR, 'repositories.local.json'), content: '{"schemaVersion":1}'},
            {path: join(LANE_DIR, 'notes.txt'), content: 'not a manifest'},
            {path: join(LANE_DIR, 'install.json'), content: '{"schemaVersion":1}'},
            {path: join(LANE_DIR, 'lane.json'), content: '{"schemaVersion":1}'}
        ],
        links: [{path: join(LANE_DIR, 'bin', 'runtime-nvb.json'), target: CONFIG_TARGET, sha256: CONFIG_SHA256}]
    };
}

export function basenameOf(path: string): string {
    return path.split('/').pop()!.replace(/\.tmp-.+$/, '');
}

export async function expectFailure(promise: Promise<unknown>): Promise<TransactionalWriteError> {
    try {
        await promise;
    } catch (error) {
        if (error instanceof TransactionalWriteError) return error;
        throw error;
    }
    throw new Error('expected a TransactionalWriteError');
}

/** In-memory async double for `TransactionalWriterFileSystem`; every method matches the real port's shape. */
export class FakeFs implements TransactionalWriterFileSystem {
    readonly log: string[] = [];
    readonly existing = new Set<string>([LANES_DIR]);
    readonly written = new Map<string, string | Buffer>();
    readonly runtimeBytes = new Map<string, Buffer>([[CONFIG_TARGET, CONFIG_BYTES]]);
    private readonly pending = new Map<string, string | Buffer>();
    private readonly failures: [string, string][] = [];
    private readonly exactFailures: [string, string][] = [];

    fail(operation: string, needle: string): void {
        this.failures.push([operation, needle]);
    }

    /** Like `fail`, but matches only an exact key — for a path that is itself a prefix of other, unrelated staged paths. */
    failExact(operation: string, exactKey: string): void {
        this.exactFailures.push([operation, exactKey]);
    }

    private trip(operation: string, key: string): void {
        if (this.exactFailures.some(([op, exactKey]) => op === operation && key === exactKey)) {
            throw Object.assign(new Error(`simulated ${operation} failure`), {code: 'EIO'});
        }
        if (this.failures.some(([op, needle]) => op === operation && key.includes(needle))) {
            throw Object.assign(new Error(`simulated ${operation} failure`), {code: 'EIO'});
        }
    }

    async mkdtemp(prefix: string): Promise<string> {
        this.log.push(`mkdtemp:${prefix}`);
        this.trip('mkdtemp', prefix);
        this.existing.add(STAGING);
        return STAGING;
    }

    async mkdir(path: string): Promise<void> {
        this.log.push(`mkdir:${path}`);
        this.trip('mkdir', path);
        this.existing.add(path);
    }

    async open(path: string): Promise<TransactionalWriterFileHandle> {
        this.log.push(`open:${path}`);
        this.trip('open', path);
        return {
            write: async (content) => { this.log.push(`write:${path}`); this.trip('write', path); this.pending.set(path, content); },
            sync: async () => { this.log.push(`sync:${path}`); this.trip('sync', path); },
            close: async () => { this.log.push(`close:${path}`); }
        };
    }

    async readFile(path: string): Promise<Buffer> {
        this.log.push(`readFile:${path}`);
        this.trip('readFile', path);
        const bytes = this.runtimeBytes.get(path);
        if (bytes === undefined) throw Object.assign(new Error(`ENOENT ${path}`), {code: 'ENOENT'});
        return bytes;
    }

    async symlink(target: string, path: string): Promise<void> {
        this.log.push(`symlink:${path}`);
        this.trip('symlink', path);
        this.existing.add(path);
    }

    async rename(source: string, destination: string): Promise<void> {
        this.log.push(`rename:${source}->${destination}`);
        this.trip('rename', `${source}->${destination}`);
        if (this.pending.has(source)) {
            this.written.set(destination, this.pending.get(source)!);
            this.pending.delete(source);
        }
        for (const [key, content] of [...this.written]) {
            if (key.startsWith(`${source}/`)) {
                this.written.set(`${destination}${key.slice(source.length)}`, content);
                this.written.delete(key);
            }
        }
        for (const key of [...this.existing]) {
            if (key === source || key.startsWith(`${source}/`)) {
                this.existing.delete(key);
                this.existing.add(key === source ? destination : `${destination}${key.slice(source.length)}`);
            }
        }
        this.existing.add(destination);
    }

    async rm(path: string): Promise<void> {
        this.log.push(`rm:${path}`);
        this.existing.delete(path);
    }

    async syncDirectory(path: string): Promise<void> {
        this.log.push(`syncDirectory:${path}`);
        this.trip('syncDirectory', path);
    }

    async exists(path: string): Promise<boolean> {
        return this.existing.has(path);
    }
}
