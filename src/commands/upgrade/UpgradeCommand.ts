import {relative, sep} from 'node:path';
import {BaseCommand} from '@nirvana/base/cli/basic';
import type {Command} from '@nirvana/base/cli/contracts';
import {createWatchtowerError} from '../../contracts/errors.js';
import type {UpgradeApplyReason} from '../../contracts/upgradeApply.js';
import type {RuntimeManifestV1} from '../../contracts/runtimeKnowledgeManifests.js';
import {UpgradeApply, UpgradePlanner, UpgradePreviewSource, UpgradeRecovery} from '../../foundation/upgrade/index.js';
import {presentUpgradeApplyResult, presentUpgradePlan} from '../../foundation/presentation/index.js';
import {parseUpgradeCommandOptions, type UpgradeCommandOptions} from './upgradeCommandOptions.js';

export default class UpgradeCommand extends BaseCommand implements Command {
    name = 'upgrade';
    description = 'Preview or atomically apply a compatible managed runtime upgrade.';
    usage = 'upgrade [--lane=<slug-or-uuid>] [--workspace=<path>] [--to=<version>] [--apply] [--allow-downgrade] [--dry-run] [--json] [--no-color]';
    group = 'basic';
    constructor(
        private readonly planner: UpgradePlanner = new UpgradePlanner(),
        private readonly source: UpgradePreviewSource = new UpgradePreviewSource(),
        private readonly applier: UpgradeApply = new UpgradeApply(),
        private readonly recovery: UpgradeRecovery = new UpgradeRecovery()
    ) { super(); }

    async run(): Promise<void> {
        const options = parseUpgradeCommandOptions(this.args);
        const input = this.source.read({cwd: this.originalCwd, lane: options.lane, workspace: options.workspace, to: options.to});
        const plan = this.planner.plan(input);
        if (!options.apply) {
            presentUpgradePlan(plan, options);
            if (plan.conflicts.length > 0) throw conflictError(plan.conflicts[0].path);
            return;
        }
        this.guardDowngrade(input.currentInstall.runtimeVersion, input.laneSchemaVersion, input.targetRuntime, options);
        const result = await this.applier.apply({
            laneDir: input.laneDir, plan, currentInstall: input.currentInstall,
            targetRuntime: input.targetRuntime, targetKnowledge: input.targetKnowledge,
            targetRuntimeRoot: requireRoot(input.targetRuntimeRoot),
            taskRuntimeTargets: taskRuntimeTargets(input.currentInstall.taskRuntime, requireRoot(input.currentRuntimeRoot))
        });
        presentUpgradeApplyResult(result, options);
        if (!result.success) throw applyFailureError(result, input.laneDir);
    }

    private guardDowngrade(
        currentRuntimeVersion: string, laneSchemaVersion: number, targetRuntime: RuntimeManifestV1, options: UpgradeCommandOptions
    ): void {
        const guard = this.recovery.guardDowngrade({currentRuntimeVersion, laneSchemaVersion, targetRuntime, allowDowngrade: options.allowDowngrade});
        if (guard.allowed) return;
        if (guard.reason === 'DOWNGRADE_NOT_ALLOWED') {
            throw createWatchtowerError('ERR_UNSAFE_MUTATION', {operation: 'apply upgrade', target: '--allow-downgrade',
                remediation: 'Pass --allow-downgrade to explicitly authorize a downgrade to an older runtime version.'});
        }
        throw createWatchtowerError('ERR_UNSAFE_MUTATION', {operation: 'apply upgrade', target: guard.incompatibleField ?? 'compatibleLaneSchemaVersions',
            remediation: 'Select a downgrade target whose runtime manifest declares the lane schema version backward-compatible.'});
    }
}

function taskRuntimeTargets(
    taskRuntime: {readonly configTarget: string; readonly moduleTarget: string}, currentRuntimeRoot: string
): {readonly configTargetRelative: string; readonly moduleTargetRelative: string} {
    return {
        configTargetRelative: relative(currentRuntimeRoot, taskRuntime.configTarget).split(sep).join('/'),
        moduleTargetRelative: relative(currentRuntimeRoot, taskRuntime.moduleTarget).split(sep).join('/')
    };
}

function applyFailureError(result: {readonly failure: {readonly reason: UpgradeApplyReason; readonly path: string} | null}, laneDir: string) {
    const reason = result.failure?.reason ?? 'IO_UNAVAILABLE';
    const target = result.failure?.path ?? laneDir;
    if (reason === 'TARGET_MISSING') {
        return createWatchtowerError('ERR_MISSING_DEPENDENCY', {operation: 'apply upgrade', target,
            remediation: 'Stage the missing target runtime version, then rerun --apply. Run recovery to clean staging artifacts if needed.'});
    }
    if (reason === 'IO_UNAVAILABLE') {
        return createWatchtowerError('ERR_INTERNAL', {operation: 'apply upgrade', target,
            remediation: 'Inspect the reported I/O failure, then rerun --apply. Run recovery to clean staging artifacts if needed.'});
    }
    return conflictError(target);
}

function requireRoot(root: string | undefined): string {
    if (root === undefined) throw createWatchtowerError('ERR_MISSING_DEPENDENCY', {operation: 'apply upgrade', target: 'runtime root',
        remediation: 'Stage both the current and target runtime versions before applying an upgrade.'});
    return root;
}

function conflictError(target: string) {
    return createWatchtowerError('ERR_MANAGED_CONFLICT', {operation: 'apply upgrade', target,
        remediation: 'Resolve the managed-asset conflict or checksum mismatch, then rerun --apply.'});
}
