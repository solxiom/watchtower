import {
    ERROR_DEFINITIONS,
    createWatchtowerError,
    errorCodeExitCodes,
    exitCodeFor
} from '../../src/contracts/index.js';

describe('Watchtower exit-code mapping', function () {
    it('maps every registered error exactly once into the public range', function () {
        const errorCodes = Object.keys(ERROR_DEFINITIONS) as Array<keyof typeof ERROR_DEFINITIONS>;
        expect(Object.keys(errorCodeExitCodes).sort()).toEqual([...errorCodes].sort());
        for (const code of errorCodes) {
            expect(exitCodeFor(code)).toBe(errorCodeExitCodes[code]);
            expect([1, 2, 3, 4, 5]).toContain(exitCodeFor(code));
        }
    });

    it('uses every normative exit-code family', function () {
        expect(new Set(Object.values(errorCodeExitCodes))).toEqual(new Set([1, 2, 3, 4, 5]));
    });

    it('keeps the complete shared registries immutable at runtime', function () {
        expect(Object.isFrozen(errorCodeExitCodes)).toBeTrue();
        expect(Object.isFrozen(ERROR_DEFINITIONS)).toBeTrue();
        for (const definition of Object.values(ERROR_DEFINITIONS)) {
            expect(Object.isFrozen(definition)).toBeTrue();
        }
        const template = ERROR_DEFINITIONS.ERR_INTERNAL.messageTemplate;
        expect(Reflect.set(ERROR_DEFINITIONS.ERR_INTERNAL, 'messageTemplate', 'FORGED')).toBeFalse();
        const error = createWatchtowerError('ERR_INTERNAL', {operation: 'inspect', target: 'lane:alpha', remediation: 'retry'});
        expect(ERROR_DEFINITIONS.ERR_INTERNAL.messageTemplate).toBe(template);
        expect(error.message).toContain('inspect');
        expect(error.message).not.toContain('FORGED');
    });
});
