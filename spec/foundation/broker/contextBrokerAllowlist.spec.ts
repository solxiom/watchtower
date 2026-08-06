import {BROKER_REFERENCE_KINDS} from '../../../src/contracts/index.js';
import {allowedKindsForClass, checkAllowlisted} from '../../../src/foundation/broker/index.js';
import {BrokerError} from '../../../src/foundation/broker/index.js';

describe('contextBrokerAllowlist', function () {
    it('grants D1 only the narrowest kinds', function () {
        expect(allowedKindsForClass('D1')).toEqual(['batch-brief', 'tracker-projection']);
    });

    it('grants each wider class a strict superset of the narrower class', function () {
        const d1 = allowedKindsForClass('D1');
        const d2 = allowedKindsForClass('D2');
        const d3 = allowedKindsForClass('D3');
        expect(d1.every((kind) => d2.includes(kind))).toBeTrue();
        expect(d2.every((kind) => d3.includes(kind))).toBeTrue();
        expect(d2.length).toBeGreaterThan(d1.length);
        expect(d3.length).toBeGreaterThan(d2.length);
    });

    it('grants D3 every declared reference kind', function () {
        expect([...allowedKindsForClass('D3')].sort()).toEqual([...BROKER_REFERENCE_KINDS].sort());
    });

    it('passes through an allowlisted kind unchanged', function () {
        expect(checkAllowlisted('D1', 'batch-brief', 'B1')).toBe('batch-brief');
    });

    it('fails closed with BROKER_KIND_NOT_ALLOWLISTED when the class does not permit the kind', function () {
        try {
            checkAllowlisted('D1', 'push-journal', 'B1');
            fail('expected BrokerError');
        } catch (error) {
            expect(error).toBeInstanceOf(BrokerError);
            expect((error as InstanceType<typeof BrokerError>).reason).toBe('BROKER_KIND_NOT_ALLOWLISTED');
        }
    });

    it('fails closed with BROKER_KIND_UNSUPPORTED for an unrecognized kind, never partially succeeding', function () {
        try {
            checkAllowlisted('D3', 'not-a-real-kind', 'B1');
            fail('expected BrokerError');
        } catch (error) {
            expect(error).toBeInstanceOf(BrokerError);
            expect((error as InstanceType<typeof BrokerError>).reason).toBe('BROKER_KIND_UNSUPPORTED');
        }
    });
});
