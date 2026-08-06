import type {EnvConfigResult, ParseDiagnostic, ParserDiagnosticCode} from '../../contracts/index.js';
import {isBlankLine, isCommentLine, isSafeScalarValue, parseKeyValue, splitLines} from './scalarLineParser.js';

const knownKeys = new Set(['LANE_ID', 'LANE_SLUG', 'INITIATIVE_ID', 'HOME_REPOSITORY_ID', 'WORKSPACE', 'TMUX_PREFIX', 'IMPL_PACK_REL']);

/** The one sensitive-key pattern for this repository; other capsules redact by key against this, not a private copy. */
export const SENSITIVE_KEY_PATTERN = /TOKEN|SECRET|PASSWORD|KEY|CREDENTIAL/i;
const sensitiveKey = SENSITIVE_KEY_PATTERN;

interface EnvParseAccumulator {
    config: Record<string, string>;
    errors: ParseDiagnostic[];
    warnings: ParseDiagnostic[];
    unknownKeys: Record<string, string>;
    seenKeys: Set<string>;
}

export function parseEnvConfig(content: string): EnvConfigResult {
    const result: EnvParseAccumulator = {config: {}, errors: [], warnings: [], unknownKeys: {}, seenKeys: new Set()};
    splitLines(content).forEach((line, index) => parseLine(line, index + 1, result));
    const {seenKeys: _seenKeys, ...parsed} = result;
    return {...parsed, valid: result.errors.length === 0};
}

export function redactSensitiveKeys(config: Record<string, string>): {redacted: Record<string, string>; redactedKeys: string[]} {
    const redacted: Record<string, string> = {};
    const redactedKeys: string[] = [];
    for (const [key, value] of Object.entries(config)) {
        if (sensitiveKey.test(key)) {
            redacted[key] = '[REDACTED]';
            redactedKeys.push(key);
        } else redacted[key] = value;
    }
    return {redacted, redactedKeys};
}

function parseLine(line: string, lineNumber: number, result: EnvParseAccumulator): void {
    if (isBlankLine(line) || isCommentLine(line)) return;
    const entry = parseKeyValue(line);
    if (entry === null) {
        result.errors.push(diagnostic(lineNumber, 'invalid-scalar', 'Expected a KEY=value scalar with balanced quotes.'));
        return;
    }
    if (result.seenKeys.has(entry.key)) {
        result.errors.push(diagnostic(lineNumber, 'duplicate-key', 'Duplicate configuration keys are not allowed.', entry.key));
        return;
    }
    result.seenKeys.add(entry.key);
    if (!isSafeScalarValue(entry.value, entry.quoting)) {
        result.errors.push(diagnostic(lineNumber, 'unsafe-shell-syntax', 'Shell syntax and unquoted whitespace are not allowed in lane configuration.', entry.key));
        return;
    }
    result.config[entry.key] = entry.value;
    if (!knownKeys.has(entry.key)) {
        result.unknownKeys[entry.key] = entry.value;
        result.warnings.push(diagnostic(lineNumber, 'unknown-key', 'Preserved an unknown configuration key.', entry.key));
    }
}

function diagnostic(line: number, code: ParserDiagnosticCode, message: string, key?: string): ParseDiagnostic {
    return key === undefined ? {line, code, message} : {line, code, message, key};
}
