import {classifyScalarValue, isBlankLine, isCommentLine, isSafeScalarValue, parseKeyValue, splitLines} from '../../src/foundation/scalarLineParser.js';

describe('scalar line parser', function () {
    it('preserves physical lines and classifies the accepted scalar forms', function () {
        expect(splitLines('one\r\ntwo\n')).toEqual(['one', 'two', '']);
        expect(isBlankLine(' \t')).toBeTrue();
        expect(isCommentLine('  # note')).toBeTrue();
        expect(classifyScalarValue('plain')).toBe('unquoted');
        expect(classifyScalarValue("'plain value'")).toBe('single-quoted');
        expect(classifyScalarValue('"single \' quote"')).toBe('double-quoted');
    });

    it('rejects mixed or unclosed quote forms and parses valid records exactly', function () {
        expect(classifyScalarValue("'unclosed")).toBe('invalid');
        expect(classifyScalarValue('before"after')).toBe('invalid');
        expect(parseKeyValue('LANE_SLUG="my lane"')).toEqual({key: 'LANE_SLUG', value: 'my lane', quoting: 'double-quoted'});
        expect(parseKeyValue('not a record')).toBeNull();
    });

    it('accepts only the unquoted bytes that round-trip through the retained leaf projection', function () {
        expect(isSafeScalarValue('path/to-value', 'unquoted')).toBeTrue();
        expect(isSafeScalarValue('~root', 'unquoted')).toBeFalse();
        expect(isSafeScalarValue('()', 'unquoted')).toBeFalse();
        expect(isSafeScalarValue('foo\\bar', 'unquoted')).toBeFalse();
        expect(isSafeScalarValue('literal tilde ~', 'single-quoted')).toBeTrue();
        expect(isSafeScalarValue('foo\\bar', 'single-quoted')).toBeFalse();
    });
});
