import {
    PROMOTED_TUI_NATIVE_INTEGRITY, PROMOTED_TUI_TARGET, qualifyTuiPtyTuple, reconcileTuiPtyMatrix
} from '../../../contracts/index.js';
import type {TuiPtyTuple, TuiRuntimeTarget} from '../../../contracts/index.js';
import type {DoctorCheckProvider, DoctorLaneContext} from '../DoctorCheckProvider.js';
import {fail, pass, skip, warn} from '../DoctorCheckResult.js';
import {
    deriveTuiPtyTuple, observedHostEvidence, packagedEngineEvidence,
    type TuiEngineEvidence, type TuiHostEvidence
} from './tuiRuntimeTuple.js';

const ID = 'tui-terminal' as const;

export interface TuiTerminalCheckOptions {
    readonly host?: TuiHostEvidence;
    readonly engine?: TuiEngineEvidence;
}

/**
 * Validates the exact supported target tuple this attachment would run in,
 * before any terminal mode is changed — the `--tui` half of `docs/spec/v1.md`
 * §11.7 that CA-31 delivers.
 *
 * Both judgments reuse CA-23's accepted owners verbatim.
 * `qualifyTuiPtyTuple` decides whether the derived runtime tuple is one of
 * the eight promoted tuples, so this provider cannot invent a ninth;
 * `reconcileTuiPtyMatrix` proves the promoted matrix still neither reduces
 * nor widens CA-18's supported-target set, so a packaging drift that silently
 * changed one of them is visible here rather than at alternate-screen entry.
 * An unpromoted tuple is `fail` and names the remediation CA-23 fixed: use a
 * non-TUI command; Watchtower never fetches or repairs native artifacts to
 * make an unsupported terminal work.
 */
export function createTuiTerminalCheck(options: TuiTerminalCheckOptions = {}): DoctorCheckProvider {
    const engine = options.engine ?? packagedEngineEvidence(import.meta.url);
    return {
        id: ID,
        run(context: DoctorLaneContext) {
            const reconciliation = reconcileTuiPtyMatrix(SUPPORTED_TARGETS);
            if (!reconciliation.consistent) {
                return fail(ID, `The promoted PTY matrix no longer agrees with the supported target set (uncovered: ${
                    describe(reconciliation.uncoveredTargets)}; widened: ${describe(reconciliation.widenedTuples)}).`,
                    'ERR_INTEGRITY_FAILURE');
            }
            const term = context.environment.TERM ?? '';
            if (term === '') {
                return skip(ID, 'No controlling terminal is described by this invocation (TERM is unset); there is no target tuple to qualify.');
            }
            const host = options.host ?? observedHostEvidence(process.platform, process.arch, process.version, reportOf());
            return reportTuple(deriveTuiPtyTuple(context.environment, {host, engine}), context.environment);
        }
    };
}

export const tuiTerminalCheck: DoctorCheckProvider = createTuiTerminalCheck();

/** The CA-18 supported-target set the promoted matrix is reconciled against. */
const SUPPORTED_TARGETS: readonly TuiRuntimeTarget[] = Object.freeze([Object.freeze({
    os: PROMOTED_TUI_TARGET.os, cpu: PROMOTED_TUI_TARGET.cpu, libc: PROMOTED_TUI_TARGET.libc,
    nativePackage: PROMOTED_TUI_TARGET.nativePackage, artifactIntegrity: PROMOTED_TUI_NATIVE_INTEGRITY
})]);

function reportTuple(tuple: TuiPtyTuple, environment: NodeJS.ProcessEnv) {
    const qualification = qualifyTuiPtyTuple(tuple);
    if (!qualification.promoted) {
        return fail(ID, `${qualification.detail} ${qualification.remediation}`, 'ERR_MISSING_DEPENDENCY');
    }
    if (typeof environment.NO_COLOR === 'string') {
        return warn(ID, `The terminal target ${describeTuple(tuple)} is promoted, but NO_COLOR is set, so this attachment renders without color.`);
    }
    return pass(ID, `The terminal target ${describeTuple(tuple)} is one of the promoted TUI tuples.`);
}

function describeTuple(tuple: TuiPtyTuple): string {
    return `${tuple.emulator}/${tuple.termFamily}/${tuple.invocation}/${tuple.installPath}`;
}

function describe(values: readonly string[]): string {
    return values.length === 0 ? 'none' : values.join(', ');
}

/** `process.report` is optional at runtime and its report is `unknown` to this module. */
function reportOf(): unknown {
    try {
        return process.report?.getReport();
    } catch {
        return undefined;
    }
}
