import {PROMOTED_TUI_PTY_MATRIX, type TuiPtyTuple} from '../../../src/contracts/tuiAccessibility.js';

/**
 * Emulator/platform fixtures for the CA-23 conformance matrix.
 *
 * `promotedTuples()` is the exact promoted table; `unpromotedTuples()` are the
 * `tui-operational-experience.md §2.2` targets that must fail closed before
 * alternate-screen entry — arm64, musl, macOS, Windows, an untested Node
 * major, an unpromoted emulator, a tampered native digest, and a tuple that
 * carries an extra key.
 */
export function promotedTuples(): readonly TuiPtyTuple[] { return PROMOTED_TUI_PTY_MATRIX; }

export function tupleFor(invocation: TuiPtyTuple['invocation'], installPath: TuiPtyTuple['installPath']): TuiPtyTuple {
    const match = PROMOTED_TUI_PTY_MATRIX.find((item) => item.invocation === invocation && item.installPath === installPath);
    if (!match) throw new Error(`no promoted tuple for ${invocation}/${installPath}`);
    return match;
}

export function unpromotedTuples(): readonly {readonly name: string; readonly value: unknown}[] {
    const base = PROMOTED_TUI_PTY_MATRIX[0];
    return Object.freeze([
        Object.freeze({name: 'linux-arm64', value: {...base, cpu: 'arm64'}}),
        Object.freeze({name: 'linux-musl', value: {...base, libc: 'musl'}}),
        Object.freeze({name: 'macos', value: {...base, os: 'darwin'}}),
        Object.freeze({name: 'windows', value: {...base, os: 'win32'}}),
        Object.freeze({name: 'untested-node-major', value: {...base, nodeVersion: '24.9.0'}}),
        Object.freeze({name: 'unpromoted-emulator', value: {...base, emulator: 'kitty', termFamily: 'xterm-kitty'}}),
        Object.freeze({name: 'unpromoted-locale', value: {...base, locale: 'C'}}),
        Object.freeze({name: 'tampered-native-digest', value: {...base, nativeIntegrity: `sha256:${'0'.repeat(64)}`}}),
        Object.freeze({name: 'unpromoted-opentui', value: {...base, opentuiVersion: '0.4.4'}}),
        Object.freeze({name: 'extra-key', value: {...base, experimental: true}}),
        Object.freeze({name: 'missing-key', value: {...base, installPath: undefined}}),
        Object.freeze({name: 'not-an-object', value: 'xterm-256color'}),
        Object.freeze({name: 'null', value: null}),
        Object.freeze({name: 'array', value: [PROMOTED_TUI_PTY_MATRIX[0]]})
    ]);
}

/**
 * The environment a locally invoked tuple presents to the child. SSH variables
 * are deliberately absent: `SSH_CONNECTION`/`SSH_TTY` are set by a real `sshd`
 * on the remote side, and injecting them locally would make a local run
 * indistinguishable from a remote one.
 */
export function environmentFor(tuple: TuiPtyTuple): Readonly<Record<string, string>> {
    return Object.freeze({TERM: tuple.termFamily, LANG: tuple.locale, LC_ALL: tuple.locale});
}
