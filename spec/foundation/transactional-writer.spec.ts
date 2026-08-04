import {join} from 'node:path';
import {commitLane, rollbackStaging} from '../../src/foundation/lane/writer/index.js';
import type {LaneLayout} from '../../src/foundation/lane/store/laneStoreContracts.js';
import type {WatchtowerError} from '../../src/contracts/errors.js';
import {
    basenameOf,
    CONFIG_SHA256,
    CONFIG_TARGET,
    expectFailure,
    FakeFs,
    LANE_DIR,
    LANES_DIR,
    layout,
    STAGING
} from './support/transactionalWriterFixtures.js';

describe('TransactionalWriter.commitLane', function () {
    it('stages adjacent to the final lane directory, on the same parent filesystem', async function () {
        const fs = new FakeFs();
        await commitLane(layout(), fs);
        expect(fs.log[0]).toBe(`mkdir:${LANES_DIR}`);
        expect(fs.log[1]).toBe(`mkdtemp:${LANES_DIR}/.staging-`);
    });

    it('creates directories in the given order before any file or link', async function () {
        const fs = new FakeFs();
        await commitLane(layout(), fs);
        const mkdirCalls = fs.log.filter(entry => entry.startsWith('mkdir:') && entry.includes(STAGING));
        expect(mkdirCalls).toEqual([`mkdir:${STAGING}/bin`, `mkdir:${STAGING}/state`]);
        expect(fs.log.indexOf(mkdirCalls[0])).toBeLessThan(fs.log.indexOf(`symlink:${STAGING}/bin/runtime-nvb.json`));
    });

    it('verifies the managed-link target checksum before creating the symlink', async function () {
        const fs = new FakeFs();
        await commitLane(layout(), fs);
        expect(fs.log).toContain(`symlink:${STAGING}/bin/runtime-nvb.json`);
        expect(fs.existing.has(join(LANE_DIR, 'bin', 'runtime-nvb.json'))).toBeTrue();
    });

    it('rejects a managed link whose target is missing', async function () {
        const fs = new FakeFs();
        fs.runtimeBytes.delete(CONFIG_TARGET);
        const error = await expectFailure(commitLane(layout(), fs));
        expect(error.stage).toBe('symlink');
        expect(fs.log).toContain(`rm:${STAGING}`);
    });

    it('rejects a managed link whose target checksum does not match', async function () {
        const fs = new FakeFs();
        const bad = {...layout(), links: [{...layout().links[0], sha256: `sha256:${'f'.repeat(64)}` as const}]};
        const error = await expectFailure(commitLane(bad, fs));
        expect(error.stage).toBe('symlink');
    });

    it('writes every file last after directories and links, with manifests written last of all in canonical order', async function () {
        const fs = new FakeFs();
        await commitLane(layout(), fs);
        const opens = fs.log.filter(entry => entry.startsWith('open:')).map(entry => entry.slice('open:'.length));
        expect(opens.length).toBe(5);
        expect(opens[0]).toContain('notes.txt');
        expect(opens.slice(1).map(basenameOf)).toEqual(['lane.json', 'install.json', 'repositories.local.json', 'lane.config.env']);
        const notesOpenIndex = fs.log.findIndex(entry => entry.startsWith('open:') && entry.includes('notes.txt'));
        const symlinkIndex = fs.log.indexOf(`symlink:${STAGING}/bin/runtime-nvb.json`);
        expect(notesOpenIndex).toBeGreaterThan(symlinkIndex);
    });

    it('commits with exactly one atomic rename of the whole staging tree to the final lane path', async function () {
        const fs = new FakeFs();
        const result = await commitLane(layout(), fs);
        expect(result).toEqual({committed: true, laneDir: LANE_DIR});
        expect(fs.log).toContain(`rename:${STAGING}->${LANE_DIR}`);
        expect(fs.written.get(join(LANE_DIR, 'lane.json'))).toBe('{"schemaVersion":1}');
    });

    it('rejects a pre-existing destination before creating any staging state', async function () {
        const fs = new FakeFs();
        fs.existing.add(LANE_DIR);
        const error = await expectFailure(commitLane(layout(), fs));
        expect(error.stage).toBe('rename');
        expect(fs.log.some(entry => entry.startsWith('mkdtemp:'))).toBeFalse();
        expect(fs.log.some(entry => entry.startsWith('rm:'))).toBeFalse();
    });

    it('rolls back completely on a directory-creation failure (permission denied)', async function () {
        const fs = new FakeFs();
        fs.fail('mkdir', `${STAGING}/state`);
        const error = await expectFailure(commitLane(layout(), fs));
        expect(error.stage).toBe('mkdir');
        expect(fs.log).toContain(`rm:${STAGING}`);
        expect(fs.log.some(entry => entry.startsWith('rename:'))).toBeFalse();
    });

    it('rolls back completely on a write failure (disk full)', async function () {
        const fs = new FakeFs();
        fs.fail('write', 'lane.json.tmp-');
        const error = await expectFailure(commitLane(layout(), fs));
        expect(error.stage).toBe('write');
        expect(fs.log).toContain(`rm:${STAGING}`);
    });

    it('rolls back completely on an fsync failure', async function () {
        const fs = new FakeFs();
        fs.fail('sync', 'lane.json.tmp-');
        const error = await expectFailure(commitLane(layout(), fs));
        expect(error.stage).toBe('fsync');
        expect(fs.log).toContain(`rm:${STAGING}`);
    });

    it('rolls back completely on a manifest rename-into-place failure', async function () {
        const fs = new FakeFs();
        fs.fail('rename', `->${STAGING}/lane.json`);
        const error = await expectFailure(commitLane(layout(), fs));
        expect(error.stage).toBe('manifest');
        expect(fs.log).toContain(`rm:${STAGING}`);
    });

    it('rolls back on a concurrent-rename race at the final commit point', async function () {
        const fs = new FakeFs();
        fs.fail('rename', `${STAGING}->${LANE_DIR}`);
        const error = await expectFailure(commitLane(layout(), fs));
        expect(error.stage).toBe('rename');
        expect(fs.log).toContain(`rm:${STAGING}`);
    });

    it('rolls back on a directory-fsync failure', async function () {
        const fs = new FakeFs();
        fs.fail('syncDirectory', `${STAGING}/bin`);
        const error = await expectFailure(commitLane(layout(), fs));
        expect(error.stage).toBe('fsync');
        expect(fs.log).toContain(`rm:${STAGING}`);
    });

    it('reports a committed durability warning, never a rollback, when the final parent-directory fsync fails after the commit rename', async function () {
        const fs = new FakeFs();
        fs.failExact('syncDirectory', LANES_DIR);
        const result = await commitLane(layout(), fs);
        expect(result.committed).toBeTrue();
        expect(result.laneDir).toBe(LANE_DIR);
        expect(result.durabilityWarning?.stage).toBe('fsync');
        expect(result.durabilityWarning?.path).toBe(LANES_DIR);
        expect(result.durabilityWarning?.cause).toBeInstanceOf(Error);
        expect(fs.log).toContain(`rename:${STAGING}->${LANE_DIR}`);
        expect(fs.existing.has(LANE_DIR)).toBeTrue();
        expect(fs.existing.has(STAGING)).toBeFalse();
        expect(fs.log.some(entry => entry.startsWith('rm:'))).toBeFalse();
        expect(fs.written.get(join(LANE_DIR, 'lane.json'))).toBe('{"schemaVersion":1}');
    });

    it('reports a staging-directory collision without residual state (mkdtemp is inherently exclusive)', async function () {
        const fs = new FakeFs();
        fs.fail('mkdtemp', '.staging-');
        const error = await expectFailure(commitLane(layout(), fs));
        expect(error.stage).toBe('mkdtemp');
        expect(fs.log.some(entry => entry.startsWith('rm:'))).toBeFalse();
    });

    it('rejects a layout path outside the lane directory before any filesystem call', async function () {
        const fs = new FakeFs();
        const escaping: LaneLayout = {...layout(), files: [...layout().files, {path: '/repo/outside.txt', content: 'x'}]};
        try {
            await commitLane(escaping, fs);
            fail('expected ERR_PATH_ESCAPE');
        } catch (error) {
            expect((error as WatchtowerError).code).toBe('ERR_PATH_ESCAPE');
        }
        expect(fs.log).toEqual([]);
    });
});

describe('rollbackStaging', function () {
    it('removes the staging directory and every contained artifact', async function () {
        const fs = new FakeFs();
        await rollbackStaging(STAGING, fs);
        expect(fs.log).toEqual([`rm:${STAGING}`]);
    });
});
