import {appendFileSync, mkdirSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {DoctorKernel, sessionIndexCheck, sessionTurnCheck} from '../../../src/foundation/doctor/index.js';
import type {DoctorCheckProvider} from '../../../src/foundation/doctor/index.js';
import {SessionIndex} from '../../../src/foundation/index/index.js';
import type {DoctorCheck} from '../../../src/contracts/index.js';
import {createLane, createReadCommandFixture, treeSnapshot} from '../../basic/readCommandFixtures.js';
import {appendProducerEvent, LANE_ID, writeSession} from '../sessions/support/sessionFixtures.js';

const SESSION_ID = 'opsess-4d0f2b9c-6f5f-4d8c-9d5b-1f2e3a4b5c6d';

interface SessionLaneFixture {
    readonly controlHome: string;
    readonly root: string;
    readonly laneDir: string;
    readonly sessionsRoot: string;
    readonly indexRoot: string;
    remove(): void;
}

function createSessionLane(): SessionLaneFixture {
    const fixture = createReadCommandFixture();
    createLane(fixture, {packAvailable: false, laneId: LANE_ID});
    const laneDir = join(fixture.controlHome, '.watchtower', 'lanes', 'lane-a');
    const sessionsRoot = join(laneDir, 'coordinator', 'operator-sessions');
    const indexRoot = join(laneDir, 'coordinator', 'index', 'sessions');
    mkdirSync(sessionsRoot, {recursive: true});
    mkdirSync(indexRoot, {recursive: true});
    return {
        controlHome: fixture.controlHome, root: fixture.root, laneDir, sessionsRoot, indexRoot,
        remove: () => fixture.remove()
    };
}

async function runCheck(provider: DoctorCheckProvider, controlHome: string): Promise<DoctorCheck> {
    const report = await new DoctorKernel([provider]).run({cwd: controlHome});
    return report.checks[0];
}

function oneTurnSession(fixture: SessionLaneFixture): void {
    writeSession(fixture.sessionsRoot, {id: SESSION_ID, turns: [{turnId: 'turn-0001', turn: 1}]});
}

describe('CA-31 operator-session turn doctor provider', function () {
    it('skips a lane with no operator-session root and one whose root is still empty', async function () {
        const fixture = createSessionLane();
        try {
            rmSync(fixture.sessionsRoot, {recursive: true, force: true});
            expect((await runCheck(sessionTurnCheck, fixture.controlHome)).status).toBe('skip');
            mkdirSync(fixture.sessionsRoot, {recursive: true});
            const empty = await runCheck(sessionTurnCheck, fixture.controlHome);
            expect(empty.status).toBe('skip');
            expect(empty.message).toContain('holds no operator session yet');
        } finally { fixture.remove(); }
    });

    it('passes a session whose durable turn carries its complete artifact set, writing nothing', async function () {
        const fixture = createSessionLane();
        try {
            oneTurnSession(fixture);
            const before = treeSnapshot(fixture.root);
            const check = await runCheck(sessionTurnCheck, fixture.controlHome);
            expect(check.status).toBe('pass');
            expect(check.message).toContain('All 1 operator session(s) replay cleanly');
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('fails a durable turn whose artifacts are incomplete, naming the missing files', async function () {
        for (const artifact of ['coordinator.md', 'response.json', 'snapshot.json', 'usage.json', 'operator.md']) {
            const fixture = createSessionLane();
            try {
                oneTurnSession(fixture);
                rmSync(join(fixture.sessionsRoot, SESSION_ID, 'turns', 'turn-0001', artifact), {force: true});
                const before = treeSnapshot(fixture.root);
                const check = await runCheck(sessionTurnCheck, fixture.controlHome);
                expect(check.status).withContext(artifact).toBe('fail');
                expect(check.reason).withContext(artifact).toBe('ERR_INTEGRITY_FAILURE');
                expect(check.message).withContext(artifact).toContain(artifact);
                expect(treeSnapshot(fixture.root)).withContext(artifact).toBe(before);
            } finally { fixture.remove(); }
        }
    });

    it('warns on an incompletely written final journal line and never recovers it', async function () {
        const fixture = createSessionLane();
        try {
            oneTurnSession(fixture);
            appendFileSync(join(fixture.sessionsRoot, SESSION_ID, 'journal.jsonl'), '{"partial":');
            const before = treeSnapshot(fixture.root);
            const check = await runCheck(sessionTurnCheck, fixture.controlHome);
            expect(check.status).toBe('warn');
            expect(check.message).toContain('await explicit recovery');
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('fails a session whose journal cannot be replayed', async function () {
        const fixture = createSessionLane();
        try {
            oneTurnSession(fixture);
            rmSync(join(fixture.sessionsRoot, SESSION_ID, 'operator-session.json'), {force: true});
            const check = await runCheck(sessionTurnCheck, fixture.controlHome);
            expect(check.status).toBe('fail');
            expect(check.reason).toBe('ERR_INTEGRITY_FAILURE');
            expect(check.message).toContain('could not be read');
        } finally { fixture.remove(); }
    });
});

describe('CA-31 session index doctor provider', function () {
    it('skips a lane that has never published a session index', async function () {
        const fixture = createSessionLane();
        try {
            oneTurnSession(fixture);
            const check = await runCheck(sessionIndexCheck, fixture.controlHome);
            expect(check.status).toBe('skip');
            expect(check.message).toContain('never built a session index');
        } finally { fixture.remove(); }
    });

    it('passes a published generation that still admits against its source journals', async function () {
        const fixture = createSessionLane();
        try {
            oneTurnSession(fixture);
            await SessionIndex.build(fixture.indexRoot, fixture.sessionsRoot, LANE_ID);
            const before = treeSnapshot(fixture.root);
            const check = await runCheck(sessionIndexCheck, fixture.controlHome);
            expect(check.status).toBe('pass');
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('fails a generation whose source journals have moved past its checkpoint, and never rebuilds it', async function () {
        const fixture = createSessionLane();
        try {
            oneTurnSession(fixture);
            await SessionIndex.build(fixture.indexRoot, fixture.sessionsRoot, LANE_ID);
            appendProducerEvent(fixture.sessionsRoot, SESSION_ID);
            const before = treeSnapshot(fixture.root);
            const check = await runCheck(sessionIndexCheck, fixture.controlHome);
            expect(check.status).toBe('fail');
            expect(check.message).toContain('SESSION_INDEX_STALE');
            expect(check.reason).toBe('ERR_INTEGRITY_FAILURE');
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('fails a manifest that exists but whose database was removed', async function () {
        const fixture = createSessionLane();
        try {
            oneTurnSession(fixture);
            await SessionIndex.build(fixture.indexRoot, fixture.sessionsRoot, LANE_ID);
            rmSync(join(fixture.indexRoot, 'sessions.sqlite'), {force: true});
            const check = await runCheck(sessionIndexCheck, fixture.controlHome);
            expect(check.status).toBe('fail');
            expect(check.reason).toBe('ERR_INDEX_UNAVAILABLE');
        } finally { fixture.remove(); }
    });

    it('maps a busy store to a warning and a schema mismatch to an unsupported-version failure', async function () {
        const busy = await runCheckWithRefusal('SESSION_INDEX_STORE_BUSY');
        expect(busy.status).toBe('warn');
        expect(busy.reason).toBe('ERR_LOCK_CONFLICT');
        const mismatch = await runCheckWithRefusal('SESSION_INDEX_SCHEMA_MISMATCH');
        expect(mismatch.status).toBe('fail');
        expect(mismatch.reason).toBe('ERR_UNSUPPORTED_VERSION');
    });
});

/** Drives the provider's refusal mapping through the injected opener with real typed CA-16R errors. */
async function runCheckWithRefusal(reason: 'SESSION_INDEX_STORE_BUSY' | 'SESSION_INDEX_SCHEMA_MISMATCH'): Promise<DoctorCheck> {
    const {SessionIndexError} = await import('../../../src/contracts/index.js');
    const {createSessionIndexCheck} = await import('../../../src/foundation/doctor/index.js');
    const fixture = createSessionLane();
    try {
        oneTurnSession(fixture);
        await SessionIndex.build(fixture.indexRoot, fixture.sessionsRoot, LANE_ID);
        const provider = createSessionIndexCheck({
            openIndex: () => Promise.reject(new SessionIndexError(reason, 'sessions', 'injected refusal'))
        });
        return await runCheck(provider, fixture.controlHome);
    } finally { fixture.remove(); }
}
