import {detectContradictions, normalizeLaneStatus, parseLaneState} from '../../src/foundation/index.js';

describe('lane-state parser', function () {
    it('normalizes every persisted lifecycle and preserves unknown state keys', function () {
        ['bootstrap', 'active', 'paused', 'complete'].forEach((status) => {
            expect(normalizeLaneStatus({lane_status: status})).toBe(status);
        });
        const result = parseLaneState('lane_status=active\nactive_batch=RM-04\nfuture_state=kept');
        expect(result.valid).toBeTrue();
        expect(result.lifecycle).toBe('active');
        expect(result.unknownKeys).toEqual({future_state: 'kept'});
        expect(result.warnings[0].line).toBe(3);
    });

    it('reports missing or unknown lifecycle values as invalid read-model state', function () {
        expect(parseLaneState('active_batch=RM-04').lifecycle).toBe('unknown');
        expect(parseLaneState('lane_status=launching').valid).toBeFalse();
    });

    it('detects every lifecycle contradiction without repairing the source record', function () {
        const fixtures = [
            'lane_status=complete\nactive_batch=RM-04',
            'lane_status=complete\nwatcher_status=running',
            'lane_status=paused\nwatcher_status=running',
            'lane_status=bootstrap\nactive_batch=RM-04'
        ];
        fixtures.forEach((content) => {
            const result = parseLaneState(content);
            expect(result.lifecycle).toBe('unknown');
            expect(result.contradictions.length).toBeGreaterThan(0);
            expect(result.valid).toBeFalse();
        });
        expect(detectContradictions({lane_status: 'complete', active_batch: 'RM-04'}, 'complete')).toContain('Complete lanes cannot declare an active batch.');
    });

    it('rejects unsafe or malformed state records with source lines', function () {
        const result = parseLaneState('# comment\nlane_status=active\nactive_batch=$(id)\nbroken');
        expect(result.errors.filter((error) => error.line > 0).map((error) => error.line)).toEqual([3, 4]);
    });

    it('rejects NUL scalar records before they enter state or unknown-key output', function () {
        const result = parseLaneState(`lane_status=active\nfuture="a\u0000b"`);
        expect(result.errors).toContain(jasmine.objectContaining({line: 2, code: 'invalid-state-scalar'}));
        expect(result.state).toEqual({lane_status: 'active'});
        expect(result.unknownKeys).toEqual({});
    });

    it('rejects duplicate state records and never lets duplicate lifecycle erase authority', function () {
        const result = parseLaneState('lane_status=complete\nlane_status=active\nactive_batch=RM-04');
        expect(result.lifecycle).toBe('unknown');
        expect(result.valid).toBeFalse();
        expect(result.state.lane_status).toBe('complete');
        expect(result.errors).toContain(jasmine.objectContaining({line: 2, code: 'duplicate-key', key: 'lane_status'}));
        expect(parseLaneState('lane_status=active\nfuture=one\nfuture=two').errors).toContain(jasmine.objectContaining({line: 3, code: 'duplicate-key'}));
    });
});
