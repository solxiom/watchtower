import {
    boundedLimit, CONVERSATION_LIMITS, ConversationError,
    type ExplicitReference, type ReferenceKind, type ReferenceResolution, type ReferenceResolutionPort
} from '../../contracts/tuiConversation.js';

const CONTROL = /[\u0000-\u001f\u007f]/u;
const ID = '[A-Za-z0-9][A-Za-z0-9._-]{0,63}';
const TURN_NUMBER = '[1-9][0-9]{0,8}';
const MAX_PATH_LENGTH = 512;

/**
 * The normative `cli-session.md §10` reference grammar. The operator token is
 * the `@` form; `req` is the normative spelling of a requirement reference, and
 * the compound `@finding:<batch>:<finding>` and `@session:<id>:turn:<n>` forms
 * are exact shapes rather than free text.
 */
const GRAMMAR: readonly {readonly token: string; readonly refKind: ReferenceKind; readonly value: RegExp}[] = Object.freeze([
    Object.freeze({token: 'batch', refKind: 'batch', value: new RegExp(`^${ID}$`, 'u')}),
    Object.freeze({token: 'event', refKind: 'event', value: new RegExp(`^${ID}$`, 'u')}),
    Object.freeze({token: 'req', refKind: 'requirement', value: new RegExp(`^${ID}$`, 'u')}),
    Object.freeze({token: 'turn', refKind: 'turn', value: new RegExp(`^${TURN_NUMBER}$`, 'u')}),
    Object.freeze({token: 'finding', refKind: 'finding', value: new RegExp(`^${ID}:${ID}$`, 'u')}),
    Object.freeze({token: 'session', refKind: 'session', value: new RegExp(`^${ID}:turn:${TURN_NUMBER}$`, 'u')})
]);

/** Syntactic validation of one `@` reference before any resolver, model, or journal use. */
export function parseExplicitReference(raw: string): ExplicitReference | ConversationError {
    const trimmed = raw.trim();
    const body = trimmed.startsWith('@') ? trimmed.slice(1) : '';
    const separator = body.indexOf(':');
    const token = body.slice(0, separator);
    const value = body.slice(separator + 1);
    if (separator <= 0 || value.length === 0 || CONTROL.test(trimmed)) {
        return new ConversationError('REFERENCE_SYNTAX_INVALID', trimmed, 'Use the @<kind>:<value> form, for example @batch:B14 or @turn:3.');
    }
    if (token === 'file') return parseFileReference(trimmed, value);
    const rule = GRAMMAR.find((candidate) => candidate.token === token);
    if (!rule) return new ConversationError('REFERENCE_SYNTAX_INVALID', trimmed, 'Use @batch, @event, @finding, @req, @turn, @session, or @file.');
    if (!rule.value.test(value)) return new ConversationError('REFERENCE_SYNTAX_INVALID', trimmed, `The @${token} form requires its exact documented value shape.`);
    return Object.freeze({refKind: rule.refKind, value, raw: trimmed});
}

/** The operator-visible token for a reference; it round-trips through `parseExplicitReference`. */
export function referenceToken(reference: ExplicitReference): string {
    return `@${GRAMMAR.find((candidate) => candidate.refKind === reference.refKind)?.token ?? 'file'}:${reference.value}`;
}

function parseFileReference(raw: string, value: string): ExplicitReference | ConversationError {
    const segments = value.split('/');
    if (value.startsWith('/') || /^[A-Za-z]:/u.test(value) || segments.includes('..') || value.includes('\\') || value.length > MAX_PATH_LENGTH) {
        return new ConversationError('REFERENCE_PATH_ESCAPE', raw, 'Use a workspace-relative path without parent-directory segments.');
    }
    if (segments.some((segment) => segment.length === 0)) return new ConversationError('REFERENCE_SYNTAX_INVALID', raw, 'Use a path without empty segments.');
    return Object.freeze({refKind: 'file', value, raw});
}

/**
 * The authorized-reference picker. It validates one explicit reference against
 * the normative grammar, refuses ambiguity before any read, delegates
 * resolution to the accepted resolver — which owns canonical paths, symlink
 * escape, authorization, secret classification, and commit state — and then
 * validates the returned result field by field before any byte can reach the
 * composer, a journal, or a model. A malformed resolver result is a typed
 * refusal, never an exception from a dereferenced field.
 */
export class ReferencePicker {
    private readonly maxBytes: number;

    constructor(private readonly port: ReferenceResolutionPort, maxBytes: number = CONVERSATION_LIMITS.maxReferenceBytes) {
        this.maxBytes = boundedLimit(maxBytes, CONVERSATION_LIMITS.maxReferenceBytes);
    }

    parse(raw: string): ExplicitReference {
        const parsed = parseExplicitReference(raw);
        if (parsed instanceof ConversationError) throw parsed;
        return parsed;
    }

    async resolve(raw: string, signal: AbortSignal): Promise<ReferenceResolution> {
        const reference = this.parse(raw);
        if (signal.aborted) throw new ConversationError('SEARCH_CANCELLED', reference.raw, 'The reference read was cancelled before it started.');
        const result: unknown = await this.port.resolve(reference, signal).catch((cause: unknown) => { throw asConversationError(cause, reference); });
        return this.verify(reference, result);
    }

    /** Several candidates for one operator token is an ambiguity refusal, never an arbitrary winner. */
    async pickOne(candidates: readonly string[], signal: AbortSignal): Promise<ReferenceResolution> {
        const unique = [...new Set(candidates.map((candidate) => candidate.trim()))].filter((candidate) => candidate.length > 0);
        if (unique.length === 0) throw new ConversationError('REFERENCE_NOT_FOUND', '(none)', 'No candidate matched the reference.');
        if (unique.length > 1) throw new ConversationError('REFERENCE_AMBIGUOUS', unique.join(', '), 'Select exactly one candidate.');
        return this.resolve(unique[0], signal);
    }

    /** The exact token inserted into the composer; it names the reference and never inlines resolved content. */
    insertion(resolution: ReferenceResolution): string { return referenceToken(resolution.reference); }

    /** Every field of an `unknown` resolver result is validated before the result becomes usable. */
    private verify(reference: ExplicitReference, result: unknown): ReferenceResolution {
        const deny = (reason: DenyReason, detail: string): never => { throw new ConversationError(reason, reference.raw, detail); };
        if (!isRecord(result) || !isRecord(result.reference)) return deny('REFERENCE_DENIED', 'The resolver returned no structured reference resolution.');
        const answered = result.reference;
        if (answered.refKind !== reference.refKind || answered.value !== reference.value || answered.raw !== reference.raw) {
            return deny('REFERENCE_DENIED', 'The resolver answered a different reference than the one requested.');
        }
        if (typeof result.title !== 'string' || typeof result.excerpt !== 'string' || typeof result.stale !== 'boolean'
            || !Number.isInteger(result.revision) || (result.revision as number) < 0 || !Number.isInteger(result.excerptBytes)) {
            return deny('REFERENCE_DENIED', 'The resolution is missing a required typed metadata field.');
        }
        if (result.authorized !== true) return deny('REFERENCE_DENIED', 'The attachment is not authorized for this reference.');
        if (result.transitive !== false) return deny('REFERENCE_TRANSITIVE_DENIED', 'Cross-session references are never transitive.');
        const bytes = result.excerptBytes as number;
        if (bytes < 0 || bytes > this.maxBytes) return deny('REFERENCE_TOO_LARGE', `A reference excerpt is at most ${this.maxBytes} bytes.`);
        return Object.freeze({
            reference, title: result.title, excerpt: result.excerpt, excerptBytes: bytes,
            revision: result.revision as number, stale: result.stale, authorized: true, transitive: false
        });
    }
}

type DenyReason = 'REFERENCE_DENIED' | 'REFERENCE_TRANSITIVE_DENIED' | 'REFERENCE_TOO_LARGE';
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }

/** Resolver refusals keep their typed reason; anything else fails closed as an unresolved reference. */
function asConversationError(cause: unknown, reference: ExplicitReference): ConversationError {
    if (cause instanceof ConversationError) return cause;
    return new ConversationError('REFERENCE_NOT_FOUND', reference.raw, 'The accepted resolver could not resolve this reference.');
}
