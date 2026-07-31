import {
    ERROR_DEFINITIONS,
    WatchtowerError,
    createWatchtowerError,
    errorCodeExitCodes,
    isErrorCode
} from '../../src/contracts/index.js';

describe('Watchtower error taxonomy', function () {
    const codes = Object.keys(ERROR_DEFINITIONS) as Array<keyof typeof ERROR_DEFINITIONS>;
    const validContext = {operation: 'select lane', target: 'lane:alpha', remediation: 'Specify --lane.'};

    it('constructs every registered error with its sole derived mapping', function () {
        for (const code of codes) {
            const error = createWatchtowerError(code, validContext);
            const directError = WatchtowerError.fromCode(code, validContext);
            expect(error.code).toBe(code);
            expect(error.exitCode).toBe(errorCodeExitCodes[code]);
            expect(directError.exitCode).toBe(errorCodeExitCodes[code]);
            expect(error.details).toEqual({...validContext, reason: code});
            expect(error.message).toContain(validContext.operation);
            expect(error.message).toContain(validContext.target);
            expect(error.message).toContain(validContext.remediation);
        }
    });

    it('accepts bounded context values for every registered error', function () {
        const boundaryContext = {operation: 'o', target: 't'.repeat(200), remediation: 'r'};
        for (const code of codes) {
            const error = createWatchtowerError(code, boundaryContext);
            expect(error.details.target.length).toBe(200);
            expect(error.details.reason).toBe(code);
        }
    });

    it('rejects malformed, secret-bearing, and non-serializable contexts', function () {
        const malformedContexts: unknown[] = [
            undefined,
            null,
            [],
            new Date(),
            new Map(),
            Object.create(null),
            {operation: 'read', target: 'lane', remediation: 'retry', extra: 'no'},
            {operation: '', target: 'lane', remediation: 'retry'},
            {operation: 'read', target: 'token=abc', remediation: 'retry'},
            {operation: 'read', target: 'lane', remediation: 'set API_KEY=abc'},
            {operation: 'read', target: 'x'.repeat(201), remediation: 'retry'}
        ];
        for (const code of codes) {
            for (const context of malformedContexts) {
                expect(() => createWatchtowerError(code, context as never)).toThrowError(TypeError);
            }
        }
        expect(isErrorCode('ERR_UNKNOWN')).toBeFalse();
        expect(() => createWatchtowerError('ERR_UNKNOWN' as never, validContext)).toThrowError(TypeError);
        expect(() => WatchtowerError.fromCode('ERR_UNKNOWN' as never, validContext)).toThrowError(TypeError);
    });

    it('rejects attempts to construct an independently mapped error payload', function () {
        for (const code of codes) {
            for (const exitCode of [1, 2, 3, 4, 5]) {
                const conflictingPayload = {
                    code,
                    message: 'forged',
                    exitCode,
                    details: {...validContext, reason: code}
                };
                expect(() => Reflect.construct(WatchtowerError, [conflictingPayload])).toThrowError(TypeError);
                expect(() => Reflect.construct(WatchtowerError, [{...conflictingPayload, token: Symbol('forged')}])).toThrowError(TypeError);
            }
        }
    });

    it('keeps every constructed error and its details immutable', function () {
        for (const code of codes) {
            const error = createWatchtowerError(code, validContext);
            const original = {code: error.code, exitCode: error.exitCode, message: error.message, details: {...error.details}};
            expect(Object.isFrozen(error)).toBeTrue();
            expect(Object.isFrozen(error.details)).toBeTrue();
            expect(Reflect.set(error, 'code', 'ERR_INTERNAL')).toBeFalse();
            expect(Reflect.set(error, 'exitCode', 5)).toBeFalse();
            expect(Reflect.set(error, 'message', 'forged')).toBeFalse();
            expect(Reflect.set(error, 'details', {})).toBeFalse();
            for (const [field, value] of Object.entries({reason: 'ERR_INTERNAL', operation: 'forged', target: 'forged', remediation: 'forged'})) {
                expect(Reflect.set(error.details, field, value)).toBeFalse();
            }
            expect({code: error.code, exitCode: error.exitCode, message: error.message, details: error.details}).toEqual(original);
        }
    });
});
