import {isRfc3339DateTime, isUuid} from '../../src/foundation/pack/index.js';

describe('packSchemaFormats — normative uuid format', function () {
    it('accepts a canonical UUID and rejects malformed values', function () {
        expect(isUuid('9d0ee3d2-8833-4fb7-b112-8438f04f57d2')).toBe(true);
        expect(isUuid('9D0EE3D2-8833-4FB7-B112-8438F04F57D2')).toBe(true);
        expect(isUuid('not-a-uuid')).toBe(false);
        expect(isUuid('9d0ee3d2-8833-4fb7-b112-8438f04f57d')).toBe(false);
        expect(isUuid('9d0ee3d2_8833_4fb7_b112_8438f04f57d2')).toBe(false);
    });
});

describe('packSchemaFormats — RFC 3339 date-time format', function () {
    it('accepts valid instants including offsets, fractions, and a leap second', function () {
        expect(isRfc3339DateTime('2026-07-31T12:00:00Z')).toBe(true);
        expect(isRfc3339DateTime('2026-07-31t12:00:00z')).toBe(true);
        expect(isRfc3339DateTime('2028-02-29T00:00:00Z')).toBe(true);
        expect(isRfc3339DateTime('2026-12-31T23:59:60Z')).toBe(true);
        expect(isRfc3339DateTime('2026-06-30T23:59:60Z')).toBe(true);
        expect(isRfc3339DateTime('2027-01-01T00:59:60+01:00')).toBe(true);
        expect(isRfc3339DateTime('2026-07-31T12:00:00.123456+02:30')).toBe(true);
        expect(isRfc3339DateTime('2026-07-31T12:00:00-05:00')).toBe(true);
    });

    it('rejects impossible calendar and clock values without normalizing them', function () {
        expect(isRfc3339DateTime('2026-02-30T12:00:00Z')).toBe(false);
        expect(isRfc3339DateTime('2027-02-29T00:00:00Z')).toBe(false);
        expect(isRfc3339DateTime('2026-01-01T24:00:00Z')).toBe(false);
        expect(isRfc3339DateTime('2026-13-01T00:00:00Z')).toBe(false);
        expect(isRfc3339DateTime('2026-00-10T00:00:00Z')).toBe(false);
        expect(isRfc3339DateTime('2026-07-31T12:60:00Z')).toBe(false);
        expect(isRfc3339DateTime('2026-01-01T12:00:60Z')).toBe(false);
        expect(isRfc3339DateTime('2026-01-01T23:59:60Z')).toBe(false);
        expect(isRfc3339DateTime('2026-06-15T23:59:60Z')).toBe(false);
        expect(isRfc3339DateTime('2026-06-30T23:59:60+00:30')).toBe(false);
        expect(isRfc3339DateTime('2026-07-31T12:00:00+24:00')).toBe(false);
        expect(isRfc3339DateTime('2026-07-31 12:00:00Z')).toBe(false);
        expect(isRfc3339DateTime('2026-07-31T12:00:00')).toBe(false);
        expect(isRfc3339DateTime('not-a-date')).toBe(false);
    });
});
