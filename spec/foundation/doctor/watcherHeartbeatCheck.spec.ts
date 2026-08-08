import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {DoctorKernel} from '../../../src/foundation/doctor/index.js';
import {createWatcherHeartbeatCheck} from '../../../src/foundation/doctor/checks/watcherHeartbeatCheck.js';
import {createLane, createReadCommandFixture, treeSnapshot, type ReadCommandFixture} from '../../basic/readCommandFixtures.js';

function heartbeatPath(laneDir: string): string {
    return join(laneDir, 'state', 'watcher-heartbeat.txt');
}

async function runCheck(fixture: ReadCommandFixture, now?: () => Date) {
    const kernel = new DoctorKernel([createWatcherHeartbeatCheck({now})]);
    return kernel.run({cwd: fixture.controlHome});
}

describe('watcherHeartbeatCheck', function () {
    it('skips when no heartbeat file exists', async function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {packAvailable: false});
            const before = treeSnapshot(fixture.root);
            const report = await runCheck(fixture);
            expect(report.checks[0].status).toBe('skip');
            expect(treeSnapshot(fixture.root)).toBe(before);
            void laneDir;
        } finally { fixture.remove(); }
    });

    it('passes when the heartbeat is fresh', async function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {packAvailable: false});
            const now = new Date('2026-01-01T00:00:00.000Z');
            writeFileSync(heartbeatPath(laneDir), new Date(now.getTime() - 1000).toISOString());
            const report = await runCheck(fixture, () => now);
            expect(report.checks[0].status).toBe('pass');
        } finally { fixture.remove(); }
    });

    it('fails when the heartbeat exceeds the stale threshold', async function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {packAvailable: false});
            const now = new Date('2026-01-01T00:00:00.000Z');
            writeFileSync(heartbeatPath(laneDir), new Date(now.getTime() - 120_000).toISOString());
            const report = await runCheck(fixture, () => now);
            expect(report.checks[0].status).toBe('fail');
        } finally { fixture.remove(); }
    });

    it('fails when the heartbeat timestamp is not a valid ISO date-time', async function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {packAvailable: false});
            writeFileSync(heartbeatPath(laneDir), 'not-a-timestamp');
            const report = await runCheck(fixture);
            expect(report.checks[0].status).toBe('fail');
        } finally { fixture.remove(); }
    });

    it('never writes or repairs the heartbeat file itself', async function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {packAvailable: false});
            mkdirSync(join(laneDir, 'state'), {recursive: true});
            const before = treeSnapshot(fixture.root);
            await runCheck(fixture);
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });
});
