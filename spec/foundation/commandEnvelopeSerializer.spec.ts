import {createWatchtowerError, ERROR_DEFINITIONS, type ErrorCode, type JsonValue} from '../../src/contracts/index.js';
import {buildCommandError, buildCommandResult, validateEnvelope} from '../../src/foundation/presentation/commandEnvelopeSerializer.js';
import {renderResult} from '../../src/foundation/presentation/ResultRenderer.js';

const jsonValues: JsonValue[] = [{future: true}, ['future'], 'future', 4, false, null];
const contexts = {operation: 'test envelope', target: 'fixture', remediation: 'use a valid fixture'};

describe('command envelope serializer', function () {
    it('round-trips every schema-permitted JSON value in data and details', function () {
        for (const value of jsonValues) {
            const result = buildCommandResult('list', value);
            const error = buildCommandError('status', createWatchtowerError('ERR_LANE_NOT_FOUND', contexts), value);

            expect(validateEnvelope(JSON.parse(JSON.stringify(result))).valid).toBeTrue();
            expect(validateEnvelope(JSON.parse(JSON.stringify(error))).valid).toBeTrue();
        }
    });

    it('derives every constructed error exit code from the RM-01 registry', function () {
        for (const code of Object.keys(ERROR_DEFINITIONS) as ErrorCode[]) {
            const source = createWatchtowerError(code, contexts);
            const result = buildCommandError('status', source);

            expect(result.error.code).toBe(code);
            expect(result.error.exitCode).toBe(source.exitCode);
        }
    });

    it('validates schema-valid external error codes without granting construction authority', function () {
        const external = validateEnvelope({
            schemaVersion: 1, command: 'status', ok: false,
            error: {code: 'ERR_EXTERNAL_EXTENSION', message: 'External error.', exitCode: 4}
        });

        expect(external.valid).toBeTrue();
        expect(() => buildCommandError('status', {code: 'ERR_INTERNAL', message: 'forged', exitCode: 5} as never)).toThrowError();
    });

    it('rejects every closed-shape and scalar contract failure without throwing from validation', function () {
        const invalid: unknown[] = [
            {schemaVersion: 1, command: 'list', ok: true},
            {schemaVersion: 1, command: 3, ok: true, data: null},
            {schemaVersion: 1, command: 'list', ok: true, data: null, extra: true},
            {schemaVersion: 1, command: 'status', ok: false, error: {code: 'ERR_INTERNAL', message: 'x', exitCode: 6}},
            {schemaVersion: 1, command: 'status', ok: false, error: {code: 'ERR_INTERNAL', message: 'x', exitCode: 1, extra: true}}
        ];

        for (const value of invalid) {
            expect(() => validateEnvelope(value)).not.toThrow();
            const validation = validateEnvelope(value);
            expect(validation.valid).toBeFalse();
            if (validation.valid === false) {
                expect(validation.error.error.code).toBe('ERR_PARSE_FAILURE');
            }
        }
    });

    it('rejects non-JSON values and cycles through the typed parse failure before rendering', function () {
        const cyclic: {self?: unknown} = {};
        cyclic.self = cyclic;

        for (const value of [BigInt(1), Number.NaN, cyclic]) {
            expect(() => buildCommandResult('list', value as never)).toThrowError(/Input parsing prevented/);
        }
    });

    it('rejects values whose JSON serialization would change their representation', function () {
        class ValueHolder {value = 1;}
        const accessor: {[key: string]: unknown} = {};
        Object.defineProperty(accessor, 'value', {enumerable: true, get: () => 1});
        const withToJson = {value: 1, toJSON: () => ({value: 2})};
        const sparse = new Array<unknown>(2);
        sparse[1] = 1;
        const symbolKey = {[Symbol('value')]: 1};
        const cases: unknown[] = [
            new Date('2020-01-01T00:00:00.000Z'), new Map([['value', 1]]), new Set([1]),
            new ValueHolder(), sparse, accessor, withToJson, symbolKey, {value: Symbol('value')},
            {nested: [new Date('2020-01-01T00:00:00.000Z')]}
        ];

        for (const value of cases) {
            expect(() => buildCommandResult('list', value as never)).toThrowError(/Input parsing prevented/);
            expect(validateEnvelope({schemaVersion: 1, command: 'list', ok: true, data: value}).valid).toBeFalse();
        }
    });

    it('refuses unsafe runtime envelopes at the rendering boundary', function () {
        const unsafe = {schemaVersion: 1, command: 'list', ok: true, data: new Date()} as never;

        expect(() => renderResult(unsafe, {json: true, noColor: false})).toThrowError(/Input parsing prevented/);
    });

    it('rejects non-enumerable object data at construction, validation, nesting, and rendering', function () {
        const hidden = (): object => {
            const value = {};
            Object.defineProperty(value, 'hidden', {value: 1, enumerable: false});
            return value;
        };
        const external = {schemaVersion: 1, command: 'list', ok: true, data: hidden()};
        const nested = {schemaVersion: 1, command: 'list', ok: true, data: {nested: hidden()}};

        expect(() => buildCommandResult('list', hidden() as never)).toThrowError(/Input parsing prevented/);
        expect(validateEnvelope(external).valid).toBeFalse();
        expect(() => buildCommandResult('list', {nested: hidden()} as never)).toThrowError(/Input parsing prevented/);
        expect(validateEnvelope(nested).valid).toBeFalse();
        expect(() => renderResult(external as never, {json: true, noColor: false})).toThrowError(/Input parsing prevented/);
    });
});
