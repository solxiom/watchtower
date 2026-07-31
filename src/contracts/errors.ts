import {exitCodeFor, type ExitCode} from './exitCodes.js';

const ERROR_DEFINITIONS_SOURCE = {
    ERR_INTERNAL: {messageTemplate: 'An unexpected internal failure prevented {operation} for {target}.'},
    ERR_INVALID_ARGUMENT: {messageTemplate: 'Invalid arguments prevented {operation} for {target}.'},
    ERR_INVALID_LANE_CONFIG: {messageTemplate: 'Invalid lane configuration prevented {operation} for {target}.'},
    ERR_PARSE_FAILURE: {messageTemplate: 'Input parsing prevented {operation} for {target}.'},
    ERR_PATH_ESCAPE: {messageTemplate: 'Path authorization prevented {operation} for {target}.'},
    ERR_CURSOR_INVALID: {messageTemplate: 'Cursor validation prevented {operation} for {target}.'},
    ERR_UNSUPPORTED_VERSION: {messageTemplate: 'Version validation prevented {operation} for {target}.'},
    ERR_AMBIGUOUS_SELECTION: {messageTemplate: 'Ambiguous selection prevented {operation} for {target}.'},
    ERR_LANE_NOT_FOUND: {messageTemplate: 'No matching lane was found for {operation} on {target}.'},
    ERR_SESSION_NOT_FOUND: {messageTemplate: 'No matching session was found for {operation} on {target}.'},
    ERR_WORKSPACE_NOT_FOUND: {messageTemplate: 'No matching workspace was found for {operation} on {target}.'},
    ERR_INDEX_UNAVAILABLE: {messageTemplate: 'Index availability prevented {operation} for {target}.'},
    ERR_INTEGRITY_FAILURE: {messageTemplate: 'Integrity validation prevented {operation} for {target}.'},
    ERR_MISSING_DEPENDENCY: {messageTemplate: 'A missing dependency prevented {operation} for {target}.'},
    ERR_POLICY_UNAVAILABLE: {messageTemplate: 'Policy availability prevented {operation} for {target}.'},
    ERR_PREFLIGHT_FAILED: {messageTemplate: 'Preflight validation prevented {operation} for {target}.'},
    ERR_ROUTE_UNAVAILABLE: {messageTemplate: 'Route availability prevented {operation} for {target}.'},
    ERR_CONFIRMATION_REQUIRED: {messageTemplate: 'Confirmation is required before {operation} for {target}.'},
    ERR_EFFECT_CONFLICT: {messageTemplate: 'An effect conflict prevented {operation} for {target}.'},
    ERR_LOCK_CONFLICT: {messageTemplate: 'A lock conflict prevented {operation} for {target}.'},
    ERR_MANAGED_CONFLICT: {messageTemplate: 'A managed asset conflict prevented {operation} for {target}.'},
    ERR_STALE_PROPOSAL: {messageTemplate: 'A stale proposal prevented {operation} for {target}.'},
    ERR_UNSAFE_MUTATION: {messageTemplate: 'Unsafe mutation prevention blocked {operation} for {target}.'}
} as const;

const MAX_CONTEXT_VALUE_LENGTH = 200;
const secretPattern = /\b(?:token|secret|password|credential|api[ _-]?key)\b\s*[:=]/i;
const constructionToken = Symbol('watchtower-error-construction');

function freezeDefinitions<T extends Record<string, {messageTemplate: string}>>(definitions: T): Readonly<T> {
    for (const definition of Object.values(definitions)) {
        Object.freeze(definition);
    }
    return Object.freeze(definitions);
}

export const ERROR_DEFINITIONS = freezeDefinitions(ERROR_DEFINITIONS_SOURCE);

export type ErrorCode = keyof typeof ERROR_DEFINITIONS;

export interface ErrorContextInput {
    operation: string;
    target: string;
    remediation: string;
}

export interface ErrorContext extends ErrorContextInput {
    reason: ErrorCode;
}

export interface WatchtowerErrorPayload {
    code: ErrorCode;
    message: string;
    exitCode: ExitCode;
    details: ErrorContext;
}

interface InternalErrorPayload extends WatchtowerErrorPayload {
    token: symbol;
}

export class WatchtowerError extends Error implements WatchtowerErrorPayload {
    readonly code: ErrorCode;
    readonly exitCode: ExitCode;
    readonly details: ErrorContext;

    private constructor(payload: InternalErrorPayload) {
        if (payload.token !== constructionToken) {
            throw new TypeError('Watchtower errors must be created from a registered reason code.');
        }
        super(payload.message);
        this.name = 'WatchtowerError';
        this.code = payload.code;
        this.exitCode = payload.exitCode;
        this.details = Object.freeze(payload.details);
        Object.freeze(this);
    }

    static fromCode(code: ErrorCode, context: ErrorContextInput): WatchtowerError {
        if (!isErrorCode(code)) {
            throw new TypeError('Watchtower error code is not registered.');
        }
        const details = normalizeErrorContext(code, context);
        const payload: InternalErrorPayload = {
            code,
            message: formatMessage(ERROR_DEFINITIONS[code].messageTemplate, details),
            exitCode: exitCodeFor(code),
            details,
            token: constructionToken
        };
        return new WatchtowerError(payload);
    }
}

export function createWatchtowerError(code: ErrorCode, context: ErrorContextInput): WatchtowerError {
    if (!isErrorCode(code)) {
        throw new TypeError('Watchtower error code is not registered.');
    }
    return WatchtowerError.fromCode(code, context);
}

export function isErrorCode(value: unknown): value is ErrorCode {
    return typeof value === 'string' && Object.hasOwn(ERROR_DEFINITIONS, value);
}

function normalizeErrorContext(code: ErrorCode, context: ErrorContextInput): ErrorContext {
    if (!isErrorContextInput(context)) {
        throw new TypeError('Watchtower error context must contain safe operation, target, and remediation strings.');
    }
    return {...context, reason: code};
}

function isErrorContextInput(value: unknown): value is ErrorContextInput {
    if (!isPlainRecord(value) || Object.keys(value).length !== 3) {
        return false;
    }
    return isSafeContextValue(value.operation)
        && isSafeContextValue(value.target)
        && isSafeContextValue(value.remediation);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

function isSafeContextValue(value: unknown): value is string {
    return typeof value === 'string'
        && value.length > 0
        && value.length <= MAX_CONTEXT_VALUE_LENGTH
        && !/[\u0000-\u001f\u007f]/.test(value)
        && !secretPattern.test(value);
}

function formatMessage(template: string, context: ErrorContext): string {
    return `${template.replace('{operation}', context.operation).replace('{target}', context.target)} Remediation: ${context.remediation}`;
}
