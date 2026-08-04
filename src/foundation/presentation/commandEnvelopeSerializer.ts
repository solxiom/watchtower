import Ajv2020 from 'ajv/dist/2020.js';
import type {ValidateFunction} from 'ajv';
import {
    createWatchtowerError,
    WatchtowerError,
    type CommandEnvelope,
    type CommandError,
    type CommandResult,
    type EnvelopeValidationResult,
    type JsonValue
} from '../../contracts/index.js';
import {loadV1SchemaBundle, type SchemaBundleLoadResult} from '../schemaComposition/schemaBundle.js';

interface EnvelopeValidators {
    readonly result: ValidateFunction;
    readonly error: ValidateFunction;
}

export class CommandEnvelopeSerializer {
    private readonly validators: EnvelopeValidators | WatchtowerError;

    constructor(schemaLoader: () => SchemaBundleLoadResult = loadV1SchemaBundle) {
        this.validators = compileEnvelopeValidators(schemaLoader);
    }

    buildCommandResult(command: string, data: JsonValue): CommandResult {
        return this.requireSerializable({schemaVersion: 1, command, ok: true, data});
    }

    buildCommandError(command: string, source: WatchtowerError, details?: JsonValue): CommandError {
        if (!(source instanceof WatchtowerError)) {
            throw createParseFailure('construct command error', 'use a registered WatchtowerError');
        }
        const error = details === undefined
            ? {code: source.code, message: source.message, exitCode: source.exitCode}
            : {code: source.code, message: source.message, exitCode: source.exitCode, details};
        return this.requireSerializable({schemaVersion: 1, command, ok: false, error});
    }

    validateEnvelope(envelope: unknown): EnvelopeValidationResult {
        try {
            if (!isJsonValue(envelope)) return invalid(createParseFailure());
            if (this.validators instanceof WatchtowerError) return invalid(this.validators);
            if (!this.validators.result(envelope) && !this.validators.error(envelope)) {
                return invalid(createParseFailure());
            }
            const normalized = normalizeEnvelope(envelope);
            return normalized === null ? invalid(createParseFailure()) : {valid: true, envelope: normalized};
        } catch {
            return invalid(createParseFailure());
        }
    }

    private requireSerializable<T extends CommandEnvelope>(envelope: T): T {
        const validation = this.validateEnvelope(envelope);
        if (validation.valid === false) {
            throw validation.error.error.code === 'ERR_INTEGRITY_FAILURE'
                ? integrityFailure('command-envelope schema is unavailable')
                : createParseFailure('construct command envelope', 'supply serializable schema-valid values');
        }
        return envelope;
    }
}

export function buildCommandResult(command: string, data: JsonValue): CommandResult {
    return new CommandEnvelopeSerializer().buildCommandResult(command, data);
}

export function buildCommandError(command: string, source: WatchtowerError, details?: JsonValue): CommandError {
    return new CommandEnvelopeSerializer().buildCommandError(command, source, details);
}

export function validateEnvelope(envelope: unknown): EnvelopeValidationResult {
    return new CommandEnvelopeSerializer().validateEnvelope(envelope);
}

function compileEnvelopeValidators(schemaLoader: () => SchemaBundleLoadResult): EnvelopeValidators | WatchtowerError {
    try {
        const bundle = schemaLoader();
        if (bundle.ok === false) return bundle.error;
        const ajv = new Ajv2020({strict: false});
        ajv.addSchema(bundle.bundle.schema);
        const result = ajv.getSchema(`${bundle.bundle.id}#/$defs/commandResult`);
        const error = ajv.getSchema(`${bundle.bundle.id}#/$defs/commandError`);
        return result === undefined || error === undefined
            ? integrityFailure('compiled envelope validators are unavailable')
            : {result, error};
    } catch {
        return integrityFailure('schema compilation failed');
    }
}

function normalizeEnvelope(value: JsonValue): CommandEnvelope | null {
    if (!isRecord(value) || value.schemaVersion !== 1 || typeof value.command !== 'string') return null;
    if (value.ok === true && isJsonValue(value.data)) {
        return {schemaVersion: 1, command: value.command, ok: true, data: value.data};
    }
    if (value.ok !== false || !isRecord(value.error) || typeof value.error.code !== 'string' ||
        typeof value.error.message !== 'string' || !isExitCode(value.error.exitCode)) return null;
    if (value.error.details === undefined) {
        return {schemaVersion: 1, command: value.command, ok: false, error: {
            code: value.error.code, message: value.error.message, exitCode: value.error.exitCode
        }};
    }
    return isJsonValue(value.error.details) ? {schemaVersion: 1, command: value.command, ok: false, error: {
        code: value.error.code, message: value.error.message, exitCode: value.error.exitCode,
        details: value.error.details
    }} : null;
}

function isJsonValue(value: unknown, ancestors = new Set<object>()): value is JsonValue {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value !== 'object' || ancestors.has(value)) return false;
    if (Array.isArray(value)) return isJsonArray(value, ancestors);
    return isJsonObject(value, ancestors);
}

function isJsonArray(value: unknown[], ancestors: Set<object>): value is JsonValue[] {
    if (Object.getPrototypeOf(value) !== Array.prototype || Reflect.ownKeys(value).length !== value.length + 1) {
        return false;
    }
    ancestors.add(value);
    try {
        for (let index = 0; index < value.length; index += 1) {
            const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
            if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor) ||
                !isJsonValue(descriptor.value, ancestors)) return false;
        }
        return true;
    } finally {
        ancestors.delete(value);
    }
}

function isJsonObject(value: object, ancestors: Set<object>): value is {[key: string]: JsonValue} {
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return false;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== 'string' || key === 'toJSON')) return false;
    ancestors.add(value);
    try {
        for (const key of keys) {
            const descriptor = Object.getOwnPropertyDescriptor(value, key);
            if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor) ||
                !isJsonValue(descriptor.value, ancestors)) return false;
        }
        return true;
    } finally {
        ancestors.delete(value);
    }
}

function isRecord(value: JsonValue): value is {[key: string]: JsonValue} {
    return typeof value === 'object' && value !== null && !Array.isArray(value) &&
        (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function isExitCode(value: unknown): value is 1 | 2 | 3 | 4 | 5 {
    return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

function invalid(error: WatchtowerError): EnvelopeValidationResult {
    return {valid: false, error: {
        schemaVersion: 1, command: 'unknown', ok: false,
        error: {code: error.code, message: error.message, exitCode: error.exitCode, details: {
            operation: error.details.operation, target: error.details.target,
            remediation: error.details.remediation, reason: error.details.reason
        }}
    }};
}

function createParseFailure(operation = 'validate command envelope', remediation = 'supply a serializable v1 command envelope'):
    WatchtowerError {
    return createWatchtowerError('ERR_PARSE_FAILURE', {operation, target: 'command output', remediation});
}

function integrityFailure(target: string): WatchtowerError {
    return createWatchtowerError('ERR_INTEGRITY_FAILURE', {
        operation: 'compile command-envelope schema', target, remediation: 'restore the RM-13 generated schema asset'
    });
}
