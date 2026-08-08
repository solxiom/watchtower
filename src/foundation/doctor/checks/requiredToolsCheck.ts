import {delimiter, join} from 'node:path';
import {nodeRuntimeFileSystem, type RuntimeFileSystem} from '../../task/index.js';
import type {DoctorCheckProvider, DoctorLaneContext} from '../DoctorCheckProvider.js';
import {fail, pass} from '../DoctorCheckResult.js';

const ID = 'required-tools' as const;

/** `docs/spec/v1.md` §11.7's required external-tool bullet, in declared order. */
export const REQUIRED_TOOLS = Object.freeze(['bash', 'git', 'tmux', 'jq', 'flock', 'rg'] as const);

export interface RequiredToolsCheckOptions {
    readonly files?: RuntimeFileSystem;
}

/**
 * Verifies `bash`, `git`, `tmux`, `jq`, `flock`, and `rg` each resolve to an
 * executable regular file on `PATH` — a pure filesystem probe (the same
 * `RuntimeFileSystem.observe` port every other injected check uses) that
 * never spawns a tool process, so there is no shell-config/state execution
 * and no tool-specific version-flag fragility. `PATH` is read from the
 * injected `context.environment` (the doctor query's normalized environment
 * boundary — `DoctorQuery.environment`, defaulted once by `DoctorKernel`),
 * never captured ambiently at module/construction time, so isolated and
 * relocated invocations honor the query's own environment.
 */
export function createRequiredToolsCheck(options: RequiredToolsCheckOptions = {}): DoctorCheckProvider {
    const files = options.files ?? nodeRuntimeFileSystem;
    return {
        id: ID,
        run(context: DoctorLaneContext) {
            const pathEnv = context.environment.PATH ?? '';
            const missing = REQUIRED_TOOLS.filter(tool => !resolveOnPath(tool, pathEnv, files));
            if (missing.length > 0) {
                return fail(ID, `Required tool(s) not found on PATH: ${missing.join(', ')}.`);
            }
            return pass(ID, `All required tools are present on PATH: ${REQUIRED_TOOLS.join(', ')}.`);
        }
    };
}

export const requiredToolsCheck: DoctorCheckProvider = createRequiredToolsCheck();

function resolveOnPath(tool: string, pathEnv: string, files: RuntimeFileSystem): boolean {
    for (const dir of pathEnv.split(delimiter)) {
        if (dir.length === 0) continue;
        const observation = files.observe(join(dir, tool));
        if (observation.kind === 'file' && observation.executable) return true;
    }
    return false;
}
