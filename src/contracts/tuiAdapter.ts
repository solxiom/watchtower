import {createWatchtowerError, type WatchtowerError} from './errors.js';

export const TUI_ADAPTER_CONTRACT_REVISION = 'tui-adapter/v1';
export const PROMOTED_TUI_NATIVE_INTEGRITY = 'sha256:ce73133a58d35e35610ef53353ddeeeb93fb29505dde0cf1854ce25facee241d';
export const TUI_ENGINE_PACKAGES = Object.freeze([
    Object.freeze({name: '@opentui/core', version: '0.4.5', integrity: 'sha512-JsgRTPkA6e+Vxmumxai6SElOSlRQkbzNKHlCfemlArRiLhfC1IZ9RXJo2QH4xSu+uBOWAM90uss73/pPlkdEig=='}),
    Object.freeze({name: '@opentui/keymap', version: '0.4.5', integrity: 'sha512-S1wzKHhF70zT6bH+VBFY+lSeTImLcIFW28JNQiME8MoPcy6KGPs7rKFSHrb/U7P8rsTJeRfW5A4d1Cy6PKodDg=='})
]);
export const PROMOTED_TUI_TARGET = Object.freeze({
    os: 'linux', cpu: 'x86_64', libc: 'glibc', nativePackage: '@opentui/core-linux-x64'
});

export type TuiBootstrapStrategy = 'process-flag' | 'posix-execve' | 'focused-launcher';
export type TuiFeasibilityVerdict = 'PASS' | 'FAIL' | 'SPEC_BLOCKED';

export interface TuiRuntimeTarget {
    readonly os: string;
    readonly cpu: string;
    readonly libc?: string;
    readonly nativePackage: string;
    readonly artifactIntegrity: string;
}

export interface TuiFeasibilityDecision {
    readonly verdict: TuiFeasibilityVerdict;
    readonly nodeRange: string;
    readonly enginePackages: readonly TuiEnginePackage[];
    readonly bootstrap: TuiBootstrapStrategy;
    readonly supportedTargets: readonly TuiRuntimeTarget[];
    readonly adapterContractRevision: string;
    readonly evidenceRefs: readonly string[];
}

export interface TuiEnginePackage {
    readonly name: string;
    readonly version: string;
    readonly integrity: string;
}

export interface TuiCapabilities {
    readonly alternateScreen: boolean;
    readonly rawInput: boolean;
    readonly resize: boolean;
    readonly unicodeWidth: boolean;
    readonly color: 'truecolor' | '256' | '16' | 'monochrome';
    readonly mouse: boolean;
    readonly bracketedPaste: boolean;
    readonly reducedMotion: boolean;
}

export interface TuiSize { readonly columns: number; readonly rows: number; }
export interface TuiFrame { readonly cells: readonly TuiCell[]; readonly size: TuiSize; }
export interface TuiCell { readonly column: number; readonly row: number; readonly text: string; }
export interface TuiInputEvent { readonly type: string; readonly value?: string; }
export type TuiCloseReason = 'operator' | 'signal' | 'renderer-failure' | 'unsupported-target';

export interface NirvanaTuiAdapter {
    capabilities(): TuiCapabilities;
    open(options: TuiOpenOptions): Promise<TuiSurface>;
}

export interface TuiOpenOptions {
    readonly size: TuiSize;
    readonly signal: AbortSignal;
}

export interface TuiSurface {
    render(frame: TuiFrame): void;
    events(signal: AbortSignal): AsyncIterable<TuiInputEvent>;
    close(reason: TuiCloseReason): Promise<void>;
}

const VERSION = /^\d+\.\d+\.\d+$/u;
const INTEGRITY = /^sha512-[A-Za-z0-9+/]{86}==$/u;
const PACKAGE = /^@[a-z0-9-]+\/[a-z0-9-]+$/u;
const TARGET = /^[a-z0-9][a-z0-9._-]{0,31}$/u;
const EVIDENCE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/u;

export function validateTuiFeasibilityDecision(value: unknown):
    {readonly ok: true; readonly value: TuiFeasibilityDecision} | {readonly ok: false; readonly error: WatchtowerError} {
    if (!isRecord(value) || !hasOnlyKeys(value, ['verdict', 'nodeRange', 'enginePackages', 'bootstrap', 'supportedTargets', 'adapterContractRevision', 'evidenceRefs'])
        || !isVerdict(value.verdict) || value.nodeRange !== '>=26.4.0'
        || !Array.isArray(value.enginePackages) || !Array.isArray(value.supportedTargets)
        || !isStrategy(value.bootstrap) || value.adapterContractRevision !== TUI_ADAPTER_CONTRACT_REVISION
        || !Array.isArray(value.evidenceRefs)) return invalid('shape');
    if (value.enginePackages.length !== 2 || !value.enginePackages.every(isEnginePackage)
        || new Set(value.enginePackages.map((item) => item.name)).size !== 2
        || value.enginePackages.some((item) => !TUI_ENGINE_PACKAGES.some((expected) => expected.name === item.name && expected.version === item.version))) {
        return invalid('engine-packages');
    }
    if (value.supportedTargets.length !== 1 || !value.supportedTargets.every(isTarget)
        || value.evidenceRefs.length === 0 || !value.evidenceRefs.every((item) => typeof item === 'string' && EVIDENCE.test(item))
        || new Set(value.evidenceRefs).size !== value.evidenceRefs.length) {
        return invalid('targets-or-evidence');
    }
    return {ok: true, value: freezeDecision(value)};
}

function freezeDecision(value: Record<string, unknown>): TuiFeasibilityDecision {
    const packages = (value.enginePackages as readonly TuiEnginePackage[]).map((item) => Object.freeze({...item}));
    const targets = (value.supportedTargets as readonly TuiRuntimeTarget[]).map((item) => Object.freeze({...item}));
    return Object.freeze({...value, enginePackages: Object.freeze(packages), supportedTargets: Object.freeze(targets), evidenceRefs: Object.freeze([...(value.evidenceRefs as string[])])}) as TuiFeasibilityDecision;
}

function isEnginePackage(value: unknown): value is TuiEnginePackage {
    return isRecord(value) && hasOnlyKeys(value, ['name', 'version', 'integrity'])
        && typeof value.name === 'string' && PACKAGE.test(value.name)
        && typeof value.version === 'string' && VERSION.test(value.version)
        && typeof value.integrity === 'string' && INTEGRITY.test(value.integrity)
        && TUI_ENGINE_PACKAGES.some((expected) => expected.name === value.name
            && expected.version === value.version && expected.integrity === value.integrity);
}

function isTarget(value: unknown): value is TuiRuntimeTarget {
    return isRecord(value) && hasOnlyKeys(value, ['os', 'cpu', 'libc', 'nativePackage', 'artifactIntegrity'])
        && value.os === PROMOTED_TUI_TARGET.os && value.cpu === PROMOTED_TUI_TARGET.cpu
        && value.libc === PROMOTED_TUI_TARGET.libc && value.nativePackage === PROMOTED_TUI_TARGET.nativePackage
        && value.artifactIntegrity === PROMOTED_TUI_NATIVE_INTEGRITY;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}
function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
    return Object.keys(value).every((key) => keys.includes(key));
}
function isVerdict(value: unknown): value is TuiFeasibilityVerdict { return value === 'PASS' || value === 'FAIL' || value === 'SPEC_BLOCKED'; }
function isStrategy(value: unknown): value is TuiBootstrapStrategy { return value === 'process-flag' || value === 'posix-execve' || value === 'focused-launcher'; }
function invalid(reason: string): {readonly ok: false; readonly error: WatchtowerError} {
    return {ok: false, error: createWatchtowerError('ERR_INVALID_ARGUMENT', {operation: 'validate TUI feasibility decision', target: 'TUI-EXP-01 handoff', remediation: `Provide a closed CA-18 evidence contract (${reason}).`})};
}
