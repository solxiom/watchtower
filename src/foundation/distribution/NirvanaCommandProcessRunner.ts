import {cmd} from '@nirvana/base/terminal';
import {NirvanaClosureError, type NirvanaClosureFailure} from '../../contracts/nirvanaClosure.js';

export interface NirvanaProcessRequest {
    command: string;
    args: readonly string[];
    cwd: string;
    environment?: Readonly<Record<string, string>>;
    phase: NirvanaClosureFailure['phase'];
    failureReason: 'PACK_FAILED' | 'INSTALL_FAILED' | 'RELOCATION_FAILED';
    rejectRegistry404?: boolean;
}

export interface NirvanaProcessRunner {
    run(request: NirvanaProcessRequest): Promise<string>;
}

export class NirvanaCommandProcessRunner implements NirvanaProcessRunner {
    constructor(private readonly baseEnvironment: Readonly<Record<string, string>>) {}

    async run(request: NirvanaProcessRequest): Promise<string> {
        let exitSignal: NodeJS.Signals | null = null;
        let exitCode: number | null = null;
        try {
            const output = await this.spawn(request, info => {
                exitSignal = info.signal;
                exitCode = info.code;
            });
            if (exitSignal !== null || (exitCode !== null && exitCode !== 0)) {
                throw new NirvanaClosureError(
                    request.failureReason,
                    request.phase,
                    request.command,
                    exitSignal === null ? `Process exited with code ${exitCode}.` : `Process terminated by signal ${exitSignal}.`
                );
            }
            return output;
        } catch (error: unknown) {
            if (error instanceof NirvanaClosureError) throw error;
            const unavailable = error instanceof Error && 'code' in error && error.code === 'ENOENT';
            const registryFallback = request.rejectRegistry404 && processStderr(error).includes('E404');
            throw new NirvanaClosureError(
                unavailable ? 'TOOL_UNAVAILABLE' : registryFallback ? 'REGISTRY_FALLBACK' : request.failureReason,
                request.phase,
                request.command,
                safeProcessMessage(error)
            );
        }
    }

    private async spawn(
        request: NirvanaProcessRequest,
        onExit: (info: {code: number | null; signal: NodeJS.Signals | null}) => void
    ): Promise<string> {
        return String(await cmd.spawn({
            command: request.command,
            args: [...request.args],
            options: {
                cwd: request.cwd,
                env: {...this.baseEnvironment, ...request.environment},
                autoInheritEnv: false,
                autoInheritEnvPath: false,
                shell: false
            },
            onExit: info => {
                onExit({code: info.code, signal: info.signal});
            },
            rejectOnStderr: false
        }));
    }
}

function processStderr(error: unknown): string {
    return error instanceof Error && 'stderr' in error && typeof error.stderr === 'string' ? error.stderr : '';
}

function safeProcessMessage(error: unknown): string {
    if (!(error instanceof Error)) return 'Process execution failed.';
    const stderr = processStderr(error);
    if (stderr.includes('ERESOLVE')) return 'Package dependency resolution failed.';
    if (stderr.includes('Unsupported URL Type') || stderr.includes('must provide string spec')) return 'Package metadata contains an unsupported dependency spec.';
    if (stderr.includes('E404')) return 'The declared registry could not resolve a dependency.';
    if (stderr.includes('EACCES') || stderr.includes('EPERM')) return 'Process execution was denied by filesystem permissions.';
    if (stderr.includes('ENOENT')) return 'A required package artifact or path is missing.';
    if ('code' in error && typeof error.code === 'number') return `Process exited with code ${error.code}.`;
    return error.message === 'spawn npm ENOENT' || error.message === 'spawn node ENOENT'
        ? error.message
        : 'Process execution failed.';
}
