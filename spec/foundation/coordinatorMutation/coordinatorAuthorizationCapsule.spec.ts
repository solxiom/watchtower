/**
 * The durable authorization capsule a mutating coordinator command reads
 * (CA-25). Absent, malformed, and valid capsules are three distinct outcomes;
 * collapsing absence into invalidity would let a missing capsule read as a
 * corrupt one and hide the fact that no authority exists at all.
 */
import {rmSync} from 'node:fs';
import {
    DurableCoordinatorAuthorizationSource, capsuleRelativePath
} from '../../../src/foundation/lane/coordinator/mutation/coordinatorAuthorizationCapsule.js';
import {
    makeLaneDir, placeHoldFixture, removeLaneDir, writeCapsule, writeRawCapsule
} from './support/mutationFixtures.js';

describe('durable coordinator authorization capsule (CA-25)', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('gives each operation its own capsule path', () => {
        expect(capsuleRelativePath('cycle')).toBe('coordinator/authorizations/cycle.json');
        expect(capsuleRelativePath('escalate')).toBe('coordinator/authorizations/escalate.json');
        expect(capsuleRelativePath('resolution-resume')).toBe('coordinator/authorizations/resolution-resume.json');
    });

    it('reports a missing capsule as missing, not invalid', () => {
        expect(new DurableCoordinatorAuthorizationSource().read(laneDir, 'cycle').kind).toBe('missing');
    });

    it('reads the durable proposal and current state a coordinator wrote', () => {
        const {wire, state} = placeHoldFixture();
        writeCapsule(laneDir, 'cycle', wire, state);
        const read = new DurableCoordinatorAuthorizationSource().read(laneDir, 'cycle');
        expect(read.kind).toBe('authorization');
        if (read.kind === 'authorization') {
            expect(read.value.currentState.laneId).toBe(state.laneId);
            expect(read.value.currentState.operatorSession?.confirmedProposalIds.has('prop-place-hold')).toBeTrue();
            expect(read.value.revalidate().state.policyVersion).toBe(state.policyVersion);
        }
    });

    it('refuses malformed capsule bytes with a typed invalid result', () => {
        writeRawCapsule(laneDir, 'cycle', '{"schemaVersion": 1, "proposal": {}}');
        const read = new DurableCoordinatorAuthorizationSource().read(laneDir, 'cycle');
        expect(read.kind).toBe('invalid');
    });

    it('refuses a capsule carrying an extra member', () => {
        const {wire, state} = placeHoldFixture();
        const path = writeCapsule(laneDir, 'cycle', wire, state);
        const text = `{"schemaVersion": 1, "unexpected": true, "proposal": ${JSON.stringify(wire)}, "currentState": {}}`;
        rmSync(path);
        writeRawCapsule(laneDir, 'cycle', text);
        expect(new DurableCoordinatorAuthorizationSource().read(laneDir, 'cycle').kind).toBe('invalid');
    });

    it('re-reads the capsule for every lock-time revalidation', () => {
        const {wire, state} = placeHoldFixture();
        writeCapsule(laneDir, 'cycle', wire, state);
        const read = new DurableCoordinatorAuthorizationSource().read(laneDir, 'cycle');
        expect(read.kind).toBe('authorization');
        if (read.kind !== 'authorization') return;
        writeRawCapsule(laneDir, 'cycle', '{"schemaVersion": 1, "proposal": {}, "currentState": {}}');
        expect(() => read.value.revalidate()).toThrow();
    });
});
