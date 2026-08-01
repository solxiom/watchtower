import {chmod, cp, mkdir, mkdtemp, readFile, rm, stat, symlink, unlink, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

import {runSchemaCompositionTask} from
    '../../runtime-nvb/handlers/schema/SchemaCompositionFileAdapter.js';

const FRAGMENTS = join('docs', 'spec', 'schemas', 'v1');
const AGGREGATE = join('docs', 'spec', 'schemas', 'v1.schema.json');

async function withFixture(
    action: (root: string) => Promise<void>,
    includeAggregate = true
): Promise<void> {
    const root = await mkdtemp(join(tmpdir(), 'watchtower-rm13-'));
    try {
        const schemaDirectory = join(root, 'docs', 'spec', 'schemas');
        await mkdir(schemaDirectory, {recursive: true});
        await cp(join(process.cwd(), FRAGMENTS), join(root, FRAGMENTS), {recursive: true});
        if (includeAggregate) {
            await cp(join(process.cwd(), AGGREGATE), join(root, AGGREGATE));
        }
        await action(root);
    } finally {
        await rm(root, {recursive: true, force: true});
    }
}

function fixedToken(): string {
    return 'fixed-token';
}

describe('schema composition file adapter', function () {
    it('checks the authoritative aggregate without changing its bytes', async function () {
        const path = join(process.cwd(), AGGREGATE);
        const before = await readFile(path);
        const result = await runSchemaCompositionTask(process.cwd(), {mode: 'check'}, fixedToken);
        const after = await readFile(path);

        expect(result.ok).toBeTrue();
        expect([...after]).toEqual([...before]);
        if (result.ok) {
            expect(result.wrote).toBeFalse();
            expect(result.fragmentCount).toBe(16);
            expect(result.definitionCount).toBe(57);
        }
    });
});

describe('schema aggregate stale and replay behavior', function () {
    it('fails stale check without repair, then writes and replays byte-identically', async function () {
        await withFixture(async (root) => {
            const path = join(root, AGGREGATE);
            const stale = new TextEncoder().encode('{}\n');
            await writeFile(path, stale);

            const checked = await runSchemaCompositionTask(root, {mode: 'check'}, fixedToken);
            expect(checked.ok).toBeFalse();
            if (!checked.ok) {
                expect(checked.failure.code).toBe('SCHEMA_AGGREGATE_STALE');
            }
            expect([...(await readFile(path))]).toEqual([...stale]);

            const first = await runSchemaCompositionTask(root, {mode: 'write'}, fixedToken);
            const firstBytes = await readFile(path);
            const second = await runSchemaCompositionTask(root, {mode: 'write'}, fixedToken);
            const secondBytes = await readFile(path);
            expect(first.ok).toBeTrue();
            expect(second.ok).toBeTrue();
            expect([...secondBytes]).toEqual([...firstBytes]);
            if (first.ok && second.ok) {
                expect(first.wrote).toBeTrue();
                expect(second.wrote).toBeFalse();
                expect(second.semanticDigest).toBe(first.semanticDigest);
            }
        });
    });
});

describe('schema composition relocation', function () {
    it('creates a missing aggregate and passes from a relocated project root', async function () {
        await withFixture(async (root) => {
            const written = await runSchemaCompositionTask(root, {mode: 'write'}, fixedToken);
            const checked = await runSchemaCompositionTask(root, {mode: 'check'}, fixedToken);
            expect(written.ok).toBeTrue();
            expect(checked.ok).toBeTrue();
            if (written.ok && checked.ok) {
                expect(written.wrote).toBeTrue();
                expect(checked.semanticDigest).toBe(written.semanticDigest);
            }
        }, false);
    });
});

describe('schema composition path and permission boundaries', function () {
    it('rejects fragment and aggregate symlinks without changing their targets', async function () {
        await withFixture(async (root) => {
            const fragmentLink = join(root, FRAGMENTS, 'zzz.schema.json');
            await symlink('root.schema.json', fragmentLink);
            const fragmentResult = await runSchemaCompositionTask(root, {mode: 'check'}, fixedToken);
            expect(fragmentResult.ok).toBeFalse();
            if (!fragmentResult.ok) {
                expect(fragmentResult.failure.code).toBe('SCHEMA_FRAGMENT_FILE_INVALID');
            }
            await unlink(fragmentLink);

            const target = join(root, 'outside-schema.json');
            const targetBytes = new TextEncoder().encode('outside\n');
            await writeFile(target, targetBytes);
            await unlink(join(root, AGGREGATE));
            await symlink(target, join(root, AGGREGATE));
            const aggregateResult = await runSchemaCompositionTask(root, {mode: 'write'}, fixedToken);
            expect(aggregateResult.ok).toBeFalse();
            if (!aggregateResult.ok) {
                expect(aggregateResult.failure.code).toBe('SCHEMA_AGGREGATE_PATH_INVALID');
            }
            expect([...(await readFile(target))]).toEqual([...targetBytes]);
        });
    });
});

describe('schema composition permission boundary', function () {
    it('maps unreadable fragments to a closed IO failure without aggregate mutation', async function () {
        await withFixture(async (root) => {
            const fragmentPath = join(root, FRAGMENTS, 'root.schema.json');
            const aggregatePath = join(root, AGGREGATE);
            const before = await readFile(aggregatePath);
            await chmod(fragmentPath, 0o000);
            try {
                const result = await runSchemaCompositionTask(root, {mode: 'write'}, fixedToken);
                expect(result.ok).toBeFalse();
                if (!result.ok) {
                    expect(result.failure.code).toBe('SCHEMA_FILE_IO_FAILED');
                }
                expect([...(await readFile(aggregatePath))]).toEqual([...before]);
            } finally {
                await chmod(fragmentPath, 0o644);
            }
        });
    });

    it('preserves the checked-in aggregate mode during atomic replacement', async function () {
        await withFixture(async (root) => {
            const aggregatePath = join(root, AGGREGATE);
            await writeFile(aggregatePath, '{}\n');
            await chmod(aggregatePath, 0o640);
            const result = await runSchemaCompositionTask(root, {mode: 'write'}, fixedToken);
            expect(result.ok).toBeTrue();
            expect((await stat(aggregatePath)).mode & 0o777).toBe(0o640);
        });
    });
});

describe('schema composition recovery and task input', function () {
    it('does not overwrite a pre-existing partial temp artifact', async function () {
        await withFixture(async (root) => {
            const aggregatePath = join(root, AGGREGATE);
            const stale = new TextEncoder().encode('{}\n');
            const partialPath = join(root, 'docs', 'spec', 'schemas', '.v1.schema.fixed-token.tmp');
            const partial = new TextEncoder().encode('partial\n');
            await writeFile(aggregatePath, stale);
            await writeFile(partialPath, partial);

            const result = await runSchemaCompositionTask(root, {mode: 'write'}, fixedToken);
            expect(result.ok).toBeFalse();
            if (!result.ok) {
                expect(result.failure.code).toBe('SCHEMA_FILE_IO_FAILED');
            }
            expect([...(await readFile(aggregatePath))]).toEqual([...stale]);
            expect([...(await readFile(partialPath))]).toEqual([...partial]);
        });
    });
});

describe('schema composition malformed task state', function () {
    it('rejects malformed task input and injected traversal-like temp names', async function () {
        expect((await runSchemaCompositionTask(process.cwd(), {mode: 'check', extra: true}, fixedToken)).ok).
            toBeFalse();
        await withFixture(async (root) => {
            await writeFile(join(root, AGGREGATE), '{}\n');
            const result = await runSchemaCompositionTask(root, {mode: 'write'}, () => '../escape');
            expect(result.ok).toBeFalse();
            if (!result.ok) {
                expect(result.failure.code).toBe('SCHEMA_TASK_INPUT_INVALID');
            }
        });
    });

    it('rejects an empty fragment directory without changing a stale aggregate', async function () {
        await withFixture(async (root) => {
            await rm(join(root, FRAGMENTS), {recursive: true});
            await mkdir(join(root, FRAGMENTS));
            const aggregatePath = join(root, AGGREGATE);
            const before = await readFile(aggregatePath);
            const result = await runSchemaCompositionTask(root, {mode: 'write'}, fixedToken);
            expect(result.ok).toBeFalse();
            if (!result.ok) {
                expect(result.failure.code).toBe('SCHEMA_FRAGMENT_DIRECTORY_INVALID');
            }
            expect([...(await readFile(aggregatePath))]).toEqual([...before]);
        });
    });
});
