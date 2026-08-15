import type {JsonValue, OpenCodeEndpointReason} from '../../contracts/index.js';

/** Installed OpenCode JSONL contract pinned for unattended parsing (1.18.16). */
export const OPENCODE_JSONL_FORMAT_VERSION = '1.18.16';
export const OPENCODE_JSONL_EVENT_TYPES = ['step_start', 'text', 'tool_use', 'step_finish', 'error'] as const;

export const OPENCODE_MAX_LINE_BYTES = 65_536;
export const OPENCODE_MAX_EVENT_LINES = 512;
export const OPENCODE_MAX_PHYSICAL_LINES = 8192;

const ALLOWED = new Set<string>(OPENCODE_JSONL_EVENT_TYPES);

export interface OpenCodeParseLimits {
    readonly maxTotalBytes: number;
    readonly maxLineBytes: number;
    readonly maxEventLines: number;
    readonly maxPhysicalLines: number;
}

export function openCodeParseLimits(maxTotalBytes: number): OpenCodeParseLimits {
    return {
        maxTotalBytes, maxLineBytes: OPENCODE_MAX_LINE_BYTES, maxEventLines: OPENCODE_MAX_EVENT_LINES,
        maxPhysicalLines: OPENCODE_MAX_PHYSICAL_LINES
    };
}

export function parseOpenCodeResult(
    stdout: string, limits: OpenCodeParseLimits
): {ok: true; value: JsonValue} | {ok: false; reason: OpenCodeEndpointReason} {
    const totalBytes = byteLength(stdout);
    if (totalBytes === 0) return {ok: false, reason: 'truncated-output'};
    if (totalBytes > limits.maxTotalBytes) return {ok: false, reason: 'output-limit'};
    const decisions: JsonValue[] = [];
    let eventLines = 0;
    let physicalLines = 0;
    let openStep = false;
    let lastType: string | null = null;
    for (const rawLine of stdout.split('\n')) {
        physicalLines += 1;
        if (physicalLines > limits.maxPhysicalLines) return {ok: false, reason: 'malformed-output'};
        const line = rawLine.trim();
        if (line.length === 0) continue;
        eventLines += 1;
        if (eventLines > limits.maxEventLines) return {ok: false, reason: 'malformed-output'};
        const lineBytes = byteLength(line);
        if (lineBytes > limits.maxLineBytes) return {ok: false, reason: 'output-limit'};
        let event: unknown;
        try { event = JSON.parse(line); } catch { return {ok: false, reason: 'malformed-output'}; }
        if (!record(event) || typeof event.type !== 'string') return {ok: false, reason: 'malformed-output'};
        if (!ALLOWED.has(event.type)) return {ok: false, reason: 'malformed-output'};
        lastType = event.type;
        if (event.type === 'error') return {ok: false, reason: 'execution-failed'};
        if (event.type === 'step_start') {
            if (openStep) return {ok: false, reason: 'malformed-output'};
            openStep = true;
            continue;
        }
        if (!openStep) return {ok: false, reason: 'malformed-output'};
        if (event.type === 'tool_use') continue;
        if (event.type === 'step_finish') {
            openStep = false;
            continue;
        }
        const text = extractTextEvent(event);
        if (text === null) return {ok: false, reason: 'malformed-output'};
        if (text.trim().length === 0) continue;
        const parsed = parseDecisionText(text);
        if (!parsed.ok) return {ok: false, reason: 'malformed-output'};
        decisions.push(parsed.value);
    }
    if (lastType !== 'step_finish') return {ok: false, reason: 'truncated-output'};
    if (decisions.length === 0) return {ok: false, reason: 'truncated-output'};
    if (decisions.length > 1) return {ok: false, reason: 'ambiguous-output'};
    return {ok: true, value: decisions[0]};
}

function extractTextEvent(event: Record<string, unknown>): string | null {
    const part = event.part;
    if (record(part) && part.type === 'text' && typeof part.text === 'string') return part.text;
    if (typeof event.text === 'string') return event.text;
    return null;
}

function parseDecisionText(text: string): {ok: true; value: JsonValue} | {ok: false} {
    for (const candidate of [text.trim(), extractJsonFence(text)].filter((value): value is string => typeof value === 'string' && value.length > 0)) {
        try {
            const value: unknown = JSON.parse(candidate);
            if (isDecisionObject(value)) return {ok: true, value};
        } catch { return {ok: false}; }
    }
    return {ok: false};
}

function extractJsonFence(text: string): string | undefined {
    const match = /```(?:json)?\s*([\s\S]*?)```/u.exec(text);
    return match?.[1]?.trim();
}

function isDecisionObject(value: unknown): value is JsonValue {
    return isJsonValue(value) && record(value) && Object.keys(value).length > 0;
}

function isJsonValue(value: unknown): value is JsonValue {
    return value === null || typeof value === 'string' || typeof value === 'boolean' ||
        (typeof value === 'number' && Number.isFinite(value)) ||
        (Array.isArray(value) && value.every(isJsonValue)) ||
        (record(value) && Object.values(value).every(isJsonValue));
}

function record(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function byteLength(value: string): number { return new TextEncoder().encode(value).byteLength; }
