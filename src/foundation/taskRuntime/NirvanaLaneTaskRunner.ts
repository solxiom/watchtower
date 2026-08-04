/**
 * The `LaneTaskRunner` adapter over the pinned Watchtower NVB target.
 *
 * It sequences focused collaborators in the required failure order and owns no
 * algorithm of its own: validate the request; resolve the lane's pinned runtime
 * version and its checksum-verified immutable root; validate the pin; verify
 * catalog identity, digest, profile, and action allowlist; validate the packaged
 * typed input and pre-compile the declared result schema; check account, control-home
 * cwd, overlay, and immutability fences; build a side-effect-free plan; run it
 * once through the sole process boundary; then map the bound event/result stream
 * to a typed outcome. Nothing before the process starts changes an authoritative
 * byte.
 */
import {
    LaneTaskRuntimeError,
    type LaneTaskBinding,
    type LaneTaskInvocation,
    type LaneTaskRunResult
} from '../../contracts/taskRuntime.js';
import type {JsonValue} from '../../contracts/types.js';
import {LaneInstallIdentityReader} from '../read/index.js';
import type {RuntimeProcessInvoker} from '../runtime/runtimeProcessPorts.js';
import {NirvanaProcessInvoker} from '../runtime/NirvanaProcessInvoker.js';
import {LaneRuntimeAccessGuard} from './LaneRuntimeAccessGuard.js';
import {LaneTaskCatalog} from './LaneTaskCatalog.js';
import {readDeclaredTaskInput} from './laneTaskConfigInput.js';
import {buildRuntimeEnvironment} from './laneTaskEnvironment.js';
import {requireInvocationEnvelope} from './laneInvocationEnvelope.js';
import {planLaneTaskInvocation} from './laneTaskInvocationPlan.js';
import {encodeTaskRequest, requireJsonRequest} from './laneTaskRequest.js';
import {interpretOutcome} from './laneTaskOutcome.js';
import {LaneInstallTaskRuntimePinSource} from './laneTaskRuntimePinSource.js';
import type {LaneTaskRunner, RuntimeRootResolver, TaskRuntimePinSource} from './LaneTaskRunner.js';
import {NvbRunOutputReader} from './nvbRunOutput.js';
import {resolvePackagedNvbRunner, type NvbRunnerBinding} from './packagedNvbRunner.js';
import {compileSchemaValidator, type SchemaValidator} from './laneTaskSchemaValidation.js';
import {readTaskRuntimePin, requireRuntimeRoot} from './taskRuntimePin.js';
import {nodeRuntimeFileSystem, type RuntimeFileSystem} from './runtimeFileSystem.js';

const ACTION_ID = /^[a-z0-9][a-z0-9.-]{0,127}$/u;

export interface NirvanaLaneTaskRunnerOptions {
    readonly runtimeRoots: RuntimeRootResolver;
    readonly files?: RuntimeFileSystem;
    readonly pins?: TaskRuntimePinSource;
    readonly identity?: LaneInstallIdentityReader;
    readonly processes?: RuntimeProcessInvoker;
    readonly runner?: NvbRunnerBinding;
    readonly nodeExecutable?: string;
    /** Injected clock; establishes the caller-side instant a run may not precede. */
    readonly now?: () => Date;
}

export class NirvanaLaneTaskRunner implements LaneTaskRunner {
    private readonly files: RuntimeFileSystem;
    private readonly pins: TaskRuntimePinSource;
    private readonly identity: LaneInstallIdentityReader;
    private readonly processes: RuntimeProcessInvoker;
    private readonly guard: LaneRuntimeAccessGuard;
    private readonly runtimeRoots: RuntimeRootResolver;
    private readonly runner: NvbRunnerBinding;
    private readonly now: () => Date;

    constructor(options: NirvanaLaneTaskRunnerOptions) {
        this.now = options.now ?? (() => new Date());
        this.files = options.files ?? nodeRuntimeFileSystem;
        this.pins = options.pins ?? new LaneInstallTaskRuntimePinSource();
        this.identity = options.identity ?? new LaneInstallIdentityReader();
        this.processes = options.processes ?? new NirvanaProcessInvoker();
        this.runtimeRoots = options.runtimeRoots;
        this.guard = new LaneRuntimeAccessGuard(this.files);
        this.runner = options.runner
            ?? resolvePackagedNvbRunner(this.files, options.nodeExecutable ?? process.execPath);
    }

    async run(invocation: LaneTaskInvocation): Promise<LaneTaskRunResult> {
        const context = requireContext(invocation);
        const runtimeRoot = this.resolveRuntimeRoot(context.laneDir, context.runtimeVersion, context.runtimeRoot);
        const target = readTaskRuntimePin(this.pins.readTaskRuntime(context.laneDir), runtimeRoot, this.files);
        const catalog = LaneTaskCatalog.open(target, runtimeRoot, this.files);
        const binding = catalog.resolveAction(invocation.actionId);
        const inputValidator = this.compile(binding.inputSchema, catalog);
        const requestArgument = this.validateRequest(invocation.input, binding, inputValidator);
        this.validateDeclaredInput(target.configTarget, binding, inputValidator);
        const envelope = requireInvocationEnvelope(invocation.invocationEnvelope, {
            laneDir: context.laneDir, laneId: context.laneId, binding, target,
            files: this.files, now: this.now()
        });
        const resultValidator = this.compile(binding.resultSchema, catalog);
        const access = this.guard.authorize(context.workspace, context.laneDir, runtimeRoot, binding);
        const reader = new NvbRunOutputReader({
            taskId: binding.taskId,
            workingDirectory: access.workingDirectory,
            notBefore: this.now().toISOString()
        });
        const outcome = await this.processes.invoke(planLaneTaskInvocation({
            runner: this.runner,
            target,
            taskId: binding.taskId,
            workingDirectory: access.workingDirectory,
            environment: buildRuntimeEnvironment(context),
            requestArgument,
            invocationEnvelope: envelope,
            cancellation: invocation.cancellation,
            onStdoutLine: (line) => reader.acceptLine(line)
        }));
        return interpretOutcome({actionId: invocation.actionId, binding, resultValidator, outcome, reader});
    }

    /**
     * The lane's own install manifest is the single authority for which runtime
     * version this lane runs; a caller-supplied context that disagrees with it,
     * or with the catalog's canonical root, is refused rather than reconciled.
     */
    private resolveRuntimeRoot(laneDir: string, requestedVersion: string, requestedRoot: string): string {
        const installed = this.identity.read(laneDir);
        if (installed.runtimeVersion !== requestedVersion) {
            throw new LaneTaskRuntimeError('TASK_RUNTIME_REQUEST_INVALID', 'runtimeVersion',
                'The invocation context does not match the runtime version this lane pins.');
        }
        const root = requireRuntimeRoot(this.runtimeRoots.resolveRuntimeRoot(installed.runtimeVersion), this.files);
        if (requireRuntimeRoot(requestedRoot, this.files) !== root) {
            throw new LaneTaskRuntimeError('TASK_RUNTIME_REQUEST_INVALID', 'runtimeRoot',
                'The invocation context does not match the installed immutable runtime root.');
        }
        return root;
    }

    /**
     * Validate the caller's typed per-invocation request against the binding's
     * checksum-bound `inputSchema` and encode the exact argv token the owning
     * TaskHandler will read. The request is never narrowed, defaulted, or
     * dropped: what a caller supplies is what the handler receives.
     */
    private validateRequest(request: unknown, binding: LaneTaskBinding, validator: SchemaValidator): string {
        const value = requireJsonRequest(request, binding.taskId);
        if (!validator.validate(value)) {
            throw new LaneTaskRuntimeError('TASK_RUNTIME_INPUT_INVALID', binding.taskId,
                `The typed task request does not satisfy its declared schema ${binding.inputSchema}.`);
        }
        return encodeTaskRequest(value, binding.taskId);
    }

    /**
     * Validate the static configuration value the pinned config target hands the
     * task as its `handle.args` parameter. That value is validated configuration
     * rather than the caller request, but it still reaches the child, so it is
     * never left unchecked against the same declared schema.
     */
    private validateDeclaredInput(configTarget: string, binding: LaneTaskBinding, validator: SchemaValidator): void {
        const input = readDeclaredTaskInput(this.files, configTarget, binding.taskId);
        if (!validator.validate(input)) {
            throw new LaneTaskRuntimeError('TASK_RUNTIME_INPUT_INVALID', binding.taskId,
                `The packaged task input does not satisfy its declared schema ${binding.inputSchema}.`);
        }
    }

    /** Read, checksum-verify, and compile one catalog-declared schema before the process starts. */
    private compile(schemaId: string, catalog: LaneTaskCatalog): SchemaValidator {
        const validator = compileSchemaValidator(catalog.readCheckedSchema(schemaId, this.files));
        if (validator === null) {
            throw new LaneTaskRuntimeError('TASK_RUNTIME_RESULT_SCHEMA_UNAVAILABLE', schemaId,
                'The catalog-declared schema cannot be compiled into a validator.');
        }
        return validator;
    }
}

function requireContext(invocation: LaneTaskInvocation): LaneTaskInvocation['context'] {
    if (typeof invocation !== 'object' || invocation === null
        || typeof invocation.actionId !== 'string' || !ACTION_ID.test(invocation.actionId)
        || typeof invocation.context !== 'object' || invocation.context === null) {
        throw new LaneTaskRuntimeError('TASK_RUNTIME_REQUEST_INVALID', 'invocation',
            'A lane task invocation must name an action and carry a lane runtime context.');
    }
    return invocation.context;
}
