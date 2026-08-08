export const TMUX_COMMANDS = [
    'new-session', 'new-window', 'send-keys', 'capture-pane', 'list-panes',
    'list-windows', 'list-sessions', 'has-session'
] as const;
export type TmuxCommandName = typeof TMUX_COMMANDS[number];

export const TMUX_REASONS = [
    'TMUX_INVALID_TARGET', 'TMUX_TARGET_NOT_FOUND', 'TMUX_COMMAND_FORBIDDEN',
    'TMUX_COMMAND_FAILED', 'TMUX_VERIFY_FAILED', 'TMUX_VERIFY_UNCERTAIN',
    'TMUX_DUPLICATE_SUPPRESSED', 'TMUX_RECOVERY_UNCERTAIN'
] as const;
export type TmuxReason = typeof TMUX_REASONS[number];

export interface TmuxEffectCommand {
    readonly command: string;
    readonly argv: readonly string[];
    readonly session?: string;
    readonly window?: string;
    readonly pane?: string;
}

/** Only the explicitly forwarded WT values may reach a tmux task. */
export type TmuxEnv = Readonly<Partial<Record<
    'WT_WORKSPACE' | 'WT_LANE_ID' | 'WT_LANE_SLUG' | 'WT_LANE_DIR' |
    'WT_COORDINATOR_CYCLE_ID' | 'WT_RUNTIME_VERSION', string>>>;

export interface PrepareResult {
    readonly ok: boolean;
    readonly sessionExists: boolean;
    readonly windowExists: boolean;
    readonly paneExists: boolean;
    readonly rejectReason?: TmuxReason;
}

export interface AttemptResult {
    readonly ok: boolean;
    readonly command: TmuxEffectCommand;
    readonly exitCode: number | null;
    readonly stdout: string;
    readonly stderr: string;
    readonly wallTimeMs: number;
    readonly reason?: TmuxReason;
}

export interface PostconditionCheck {
    readonly name: string;
    readonly ok: boolean;
    readonly expected: string | number | boolean;
    readonly actual: string | number | boolean;
}

export interface TmuxPostcondition {
    readonly exitCode?: number;
    readonly paneContentIncludes?: string;
    readonly sessionExists?: boolean;
    readonly windowExists?: boolean;
    readonly paneExists?: boolean;
}

export interface VerifyResult {
    readonly ok: boolean;
    readonly verified: boolean;
    readonly actualExitCode: number | null;
    readonly actualPaneContent: string | null;
    readonly postconditionResults: readonly PostconditionCheck[];
    readonly reason?: TmuxReason;
}

const TARGET = /^[A-Za-z0-9][A-Za-z0-9_.:+-]{0,127}$/u;
const FORBIDDEN = new Set(['shell', 'run-shell', 'kill-session', 'kill-window', 'kill-pane',
    'pipe-pane', 'source-file', 'if-shell', 'eval']);
const TMUX_ENV_KEYS = new Set([
    'WT_WORKSPACE', 'WT_LANE_ID', 'WT_LANE_SLUG', 'WT_LANE_DIR',
    'WT_COORDINATOR_CYCLE_ID', 'WT_RUNTIME_VERSION'
]);

export function validateTmuxEnvironment(environment: TmuxEnv): TmuxReason | null {
    for (const [key, value] of Object.entries(environment)) {
        if (!TMUX_ENV_KEYS.has(key) || typeof value !== 'string' || value.length > 4096 ||
            /[\u0000-\u001f\u007f]/u.test(value)) return 'TMUX_COMMAND_FORBIDDEN';
    }
    return null;
}

export function validateTmuxCommand(command: TmuxEffectCommand): TmuxReason | null {
    if (typeof command.command !== 'string' || FORBIDDEN.has(command.command)
        || !TMUX_COMMANDS.includes(command.command as TmuxCommandName)) return 'TMUX_COMMAND_FORBIDDEN';
    if (!Array.isArray(command.argv) || command.argv.some((arg) => typeof arg !== 'string')) return 'TMUX_COMMAND_FORBIDDEN';
    for (const target of [command.session, command.window, command.pane]) {
        if (target !== undefined && !validTmuxTarget(target)) return 'TMUX_INVALID_TARGET';
    }
    return validArgv(command) ? null : 'TMUX_COMMAND_FORBIDDEN';
}

export function validTmuxTarget(value: unknown): value is string {
    return typeof value === 'string' && TARGET.test(value) && !value.includes('..');
}

function validArgv(command: TmuxEffectCommand): boolean {
    const target = command.session !== undefined && command.window !== undefined && command.pane !== undefined
        ? `${command.session}:${command.window}.${command.pane}` : null;
    const argv = command.argv;
    if (command.command === 'list-sessions') return argv.length === 0;
    if (command.command === 'has-session') return argv.length === 2 && argv[0] === '-t'
        && command.session !== undefined && argv[1] === command.session;
    if (command.command === 'list-windows') return argv.length === 2 && argv[0] === '-t'
        && command.session !== undefined && argv[1] === command.session;
    if (command.command === 'list-panes') return argv.length === 2 && argv[0] === '-t'
        && command.session !== undefined && command.window !== undefined
        && argv[1] === (command.pane === undefined ? `${command.session}:${command.window}` : target);
    if (command.command === 'capture-pane') return argv.length === 3 && argv[0] === '-p' && argv[1] === '-t'
        && target !== null && argv[2] === target;
    if (command.command === 'new-window') return argv.length === 4 && argv[0] === '-t' && argv[2] === '-n'
        && command.session !== undefined && command.window !== undefined
        && argv[1] === command.session && argv[3] === command.window;
    if (command.command === 'new-session') return argv.length === 3 && argv[0] === '-d' && argv[1] === '-s'
        && command.session !== undefined && argv[2] === command.session;
    return command.command === 'send-keys' && argv.length >= 3 && argv[0] === '-t'
        && target !== null && argv[1] === target && argv.slice(2).every(validKey);
}

function validKey(value: string): boolean {
    return value.length > 0 && value.length <= 4096 && !/[\u0000-\u001f\u007f]/u.test(value);
}
