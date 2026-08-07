import {createWatchtowerError} from '../../contracts/errors.js';
import {semanticDigest} from '../schemaComposition/jsonCanonicalizer.js';
import type {JsonValue} from '../schemaComposition/schemaCompositionContracts.js';
import type {OpenCodeDecisionOutcome, OpenCodeDecisionRequest, OpenCodeEndpointAdapterOptions, OpenCodeEndpointReason} from '../../contracts/index.js';
import {isEndpointReservationAuthority} from '../../contracts/endpointReservationAuthority.js';
import {openCodeParseLimits, parseOpenCodeResult} from './openCodeEventStream.js';
import {assertIdentityBound, assertInvokeAuthorized, validateOpenCodeRequest} from './openCodeEndpointValidation.js';
import {mapReservationReason} from './openCodeReservationReason.js';

const MODEL = /^[^/\s]+\/[^/\s]+$/u;

/** Focused argv-only OpenCode adapter. It owns provider CLI mechanics only. */
export class OpenCodeEndpointAdapter {
    private readonly leaf: OpenCodeEndpointAdapterOptions['leaf'];
    private readonly leafId: string;
    private readonly reservationAuthority: OpenCodeEndpointAdapterOptions['reservationAuthority'];
    private readonly now: () => number;

    constructor(options: OpenCodeEndpointAdapterOptions) {
        if (!isEndpointReservationAuthority(options.reservationAuthority)) {
            throw createWatchtowerError('ERR_INVALID_ARGUMENT', {
                operation: 'construct OpenCode endpoint adapter', target: 'reservationAuthority',
                remediation: 'Supply the registered CA-06 EndpointReservationAuthority implementation.'
            });
        }
        this.leaf = options.leaf;
        this.leafId = options.leafId;
        this.reservationAuthority = options.reservationAuthority;
        this.now = options.now ?? Date.now;
    }

    async decide(request: unknown): Promise<OpenCodeDecisionOutcome> {
        const checked = validateOpenCodeRequest(request);
        if (!checked.ok) return failure('unknown', checked.reason);
        const input = checked.value;
        const endpointId = input.endpoint.endpointId;
        if (input.endpoint.adapterId !== 'opencode-cli' || input.endpoint.toolId !== 'opencode') return failure(endpointId, 'wrong-adapter');
        if (!MODEL.test(input.endpoint.model)) return failure(endpointId, 'unsupported-model');
        const identity = assertIdentityBound(input.endpoint, input.fingerprint, input.catalogFingerprint);
        if (identity !== null) return failure(endpointId, identity);
        const observed = semanticDigest(input.fingerprint as unknown as JsonValue);
        if (observed !== input.expectedFingerprint) return failure(endpointId, 'stale-fingerprint');
        if (input.fingerprint.catalog !== input.catalogFingerprint) return failure(endpointId, 'catalog-mismatch');
        if (input.endpoint.availability !== 'available') return failure(endpointId, 'unavailable');
        const authorization = assertInvokeAuthorized(input.endpoint);
        if (authorization !== null) return failure(endpointId, authorization);
        const reservation = this.reservationAuthority.assertAuthorized(input.endpoint, input.reservationAuthorization, this.now());
        if (reservation !== null) return failure(endpointId, mapReservationReason(reservation));
        const started = this.now();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), input.timeoutMs);
        try {
            const result = await this.leaf.invoke({leafId: this.leafId, cancellation: controller.signal, context: input.context, args: buildArguments(input)});
            const elapsed = this.now() - started;
            if (result.outcome === 'cancelled') return failure(endpointId, elapsed >= input.timeoutMs ? 'timeout' : 'cancelled');
            if (result.outcome === 'failed') return failure(endpointId, result.reason === 'LEAF_UNAVAILABLE' ? 'unavailable' : 'execution-failed');
            const limits = openCodeParseLimits(input.maxOutputBytes);
            const parsed = parseOpenCodeResult(result.stdout, limits);
            if (!parsed.ok) return failure(endpointId, parsed.reason);
            return {
                outcome: 'completed', endpointId, fingerprint: observed, catalogFingerprint: input.catalogFingerprint,
                result: parsed.value, stdoutBytes: byteLength(result.stdout)
            };
        } finally { clearTimeout(timer); }
    }
}

function buildArguments(input: OpenCodeDecisionRequest): readonly string[] {
    return ['run', '--pure', '--format', 'json', '--model', input.endpoint.model, '--dir', input.workspace, JSON.stringify(input.envelope)];
}
function failure(endpointId: string, reason: OpenCodeEndpointReason): OpenCodeDecisionOutcome {
    return {outcome: 'failed', endpointId, reason, diagnostic: `OpenCode endpoint refused: ${reason}.`};
}
function byteLength(value: string): number { return new TextEncoder().encode(value).byteLength; }
