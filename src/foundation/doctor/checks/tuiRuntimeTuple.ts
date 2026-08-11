/**
 * Derives the CA-23 runtime PTY tuple this process is actually running in,
 * from the doctor query's normalized environment plus two injected evidence
 * ports.
 *
 * The split is deliberate. Everything a terminal reports about itself —
 * emulator, terminfo family, color tier, tmux/SSH invocation, locale — is
 * derived here from environment values that enter as `unknown`. Everything
 * about the *packaged* renderer — the engine version, the native artifact
 * digest, and whether this is a source or global install — is declared
 * evidence, because CA-18's packaging gate and RT-08's distribution proof own
 * artifact integrity, and a diagnostic must not become a second answer to it.
 *
 * This module derives; it never qualifies. Qualification against the promoted
 * matrix stays `qualifyTuiPtyTuple`'s, which is why nothing here compares a
 * derived field to a promoted one.
 */
import {PROMOTED_TUI_NATIVE_INTEGRITY, PROMOTED_TUI_TARGET, TUI_ENGINE_PACKAGES} from '../../../contracts/index.js';
import type {TuiColorMode, TuiInstallPath, TuiPtyInvocation, TuiPtyTuple} from '../../../contracts/index.js';

/** Host identity the promoted matrix pins: OS, CPU, libc flavor, and exact Node version. */
export interface TuiHostEvidence {
    readonly os: string;
    readonly cpu: string;
    readonly libc: string;
    readonly nodeVersion: string;
}

/** Packaged renderer identity, owned by the CA-18 packaging gate and reported here. */
export interface TuiEngineEvidence {
    readonly opentuiVersion: string;
    readonly nativeIntegrity: string;
    readonly installPath: TuiInstallPath;
}

export interface TuiRuntimeTupleSources {
    readonly host: TuiHostEvidence;
    readonly engine: TuiEngineEvidence;
}

export function deriveTuiPtyTuple(environment: NodeJS.ProcessEnv, sources: TuiRuntimeTupleSources): TuiPtyTuple {
    const inTmux = typeof environment.TMUX === 'string' && environment.TMUX.length > 0;
    const overSsh = typeof environment.SSH_CONNECTION === 'string' && environment.SSH_CONNECTION.length > 0;
    return Object.freeze({
        emulator: inTmux ? 'tmux' : 'xterm',
        termFamily: environment.TERM ?? '',
        colorTier: colorTier(environment),
        invocation: invocation(inTmux, overSsh),
        tmuxVersion: inTmux ? tmuxVersion(environment) : null,
        sshMode: overSsh ? 'direct' : 'none',
        locale: locale(environment),
        os: sources.host.os,
        cpu: sources.host.cpu,
        libc: sources.host.libc,
        nodeVersion: sources.host.nodeVersion,
        opentuiVersion: sources.engine.opentuiVersion,
        nativeIntegrity: sources.engine.nativeIntegrity,
        installPath: sources.engine.installPath
    });
}

/**
 * The declared packaged renderer identity. It is the CA-18 promoted engine
 * version and native digest; `installPath` is observed from whether this
 * module was loaded out of an installed package tree.
 */
export function packagedEngineEvidence(moduleUrl: string): TuiEngineEvidence {
    return Object.freeze({
        opentuiVersion: TUI_ENGINE_PACKAGES[0].version,
        nativeIntegrity: PROMOTED_TUI_NATIVE_INTEGRITY,
        installPath: moduleUrl.includes('/node_modules/') ? 'global-install' : 'source'
    });
}

/** Observed host identity, normalized to the vocabulary the promoted matrix uses. */
export function observedHostEvidence(platform: string, arch: string, nodeVersion: string, report: unknown): TuiHostEvidence {
    return Object.freeze({
        os: platform === 'linux' ? PROMOTED_TUI_TARGET.os : platform,
        cpu: CPU_NAMES[arch] ?? arch,
        libc: hasGlibcRuntime(report) ? PROMOTED_TUI_TARGET.libc : 'musl',
        nodeVersion: nodeVersion.startsWith('v') ? nodeVersion.slice(1) : nodeVersion
    });
}

const CPU_NAMES: Readonly<Record<string, string>> = Object.freeze({x64: 'x86_64', arm64: 'aarch64'});

/** `process.report.getReport()` is `unknown` at this boundary and is validated before it is believed. */
function hasGlibcRuntime(report: unknown): boolean {
    if (typeof report !== 'object' || report === null || !('header' in report)) return false;
    const header = (report as {header: unknown}).header;
    return typeof header === 'object' && header !== null && 'glibcVersionRuntime' in header
        && typeof (header as {glibcVersionRuntime: unknown}).glibcVersionRuntime === 'string';
}

function invocation(inTmux: boolean, overSsh: boolean): TuiPtyInvocation {
    if (inTmux && overSsh) return 'ssh+tmux';
    if (inTmux) return 'tmux';
    return overSsh ? 'ssh' : 'local';
}

/**
 * tmux ≥ 3.2 publishes its own version as `TERM_PROGRAM_VERSION`. Reading it
 * keeps this provider a pure observation: no `tmux -V` process is spawned, so
 * a diagnostic never executes a tool to describe a terminal.
 */
function tmuxVersion(environment: NodeJS.ProcessEnv): string | null {
    if (environment.TERM_PROGRAM !== 'tmux') return null;
    const version = environment.TERM_PROGRAM_VERSION;
    return typeof version === 'string' && version.length > 0 ? version : null;
}

/** `LC_ALL` overrides `LC_CTYPE`, which overrides `LANG` — the POSIX precedence for character handling. */
function locale(environment: NodeJS.ProcessEnv): string {
    return environment.LC_ALL ?? environment.LC_CTYPE ?? environment.LANG ?? '';
}

/**
 * The tier the terminal itself advertises. Operator preference (`NO_COLOR`)
 * is deliberately not folded in here: the tuple describes a *capability* the
 * promoted matrix pins, while the effective render mode is `resolveTuiColorMode`'s
 * decision at attachment time, and conflating them would let a preference
 * unpromote a supported terminal.
 */
function colorTier(environment: NodeJS.ProcessEnv): TuiColorMode {
    const colorTerm = environment.COLORTERM ?? '';
    const term = environment.TERM ?? '';
    if (colorTerm === 'truecolor' || colorTerm === '24bit') return 'truecolor';
    if (term.includes('256color')) return '256';
    return term === '' || term === 'dumb' ? 'monochrome' : '16';
}
