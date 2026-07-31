export type ScalarQuoting = 'unquoted' | 'single-quoted' | 'double-quoted';

export interface ScalarKeyValue {
    key: string;
    value: string;
    quoting: ScalarQuoting;
}

const keyPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;
const unquotedScalarPattern = /^[A-Za-z0-9_./:=@%+,-]*$/;
const unsafeQuotedByte = /[\u0000$`&|;<>!\\\r\n]/;

/** Splits physical lines without removing a trailing empty line. */
export function splitLines(content: string): string[] {
    return content.split(/\r\n|\n|\r/);
}

export function isBlankLine(line: string): boolean {
    return /^\s*$/.test(line);
}

export function isCommentLine(line: string): boolean {
    return line.trimStart().startsWith('#');
}

export function classifyScalarValue(value: string): ScalarQuoting | 'invalid' {
    if (value.startsWith("'")) return isClosedQuote(value, "'") ? 'single-quoted' : 'invalid';
    if (value.startsWith('"')) return isClosedQuote(value, '"') ? 'double-quoted' : 'invalid';
    return value.includes("'") || value.includes('"') ? 'invalid' : 'unquoted';
}

export function parseKeyValue(line: string): ScalarKeyValue | null {
    const separator = line.indexOf('=');
    if (separator < 1) return null;
    const key = line.slice(0, separator);
    const rawValue = line.slice(separator + 1);
    const quoting = classifyScalarValue(rawValue);
    if (!keyPattern.test(key) || quoting === 'invalid') return null;
    return {key, value: unquote(rawValue, quoting), quoting};
}

/** Rejects shell-sensitive or non-round-trippable scalar spellings. */
export function isSafeScalarValue(value: string, quoting: ScalarQuoting): boolean {
    return !unsafeQuotedByte.test(value) && (quoting !== 'unquoted' || unquotedScalarPattern.test(value));
}

function isClosedQuote(value: string, quote: string): boolean {
    return value.length >= 2 && value.endsWith(quote) && !value.slice(1, -1).includes(quote);
}

function unquote(value: string, quoting: ScalarQuoting): string {
    return quoting === 'unquoted' ? value : value.slice(1, -1);
}
