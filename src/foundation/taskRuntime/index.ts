// Public surface of the lane task runtime capsule. The packaged NVB runner
// resolver (`resolvePackagedNvbRunner`, `NvbRunnerBinding`) is deliberately NOT
// exported: it names an executable runner script and belongs only inside the
// `NirvanaLaneTaskRunner` composition. Application services depend on the
// `LaneTaskRunner` port and reach the runtime through it.
export {LaneTaskCatalog} from './LaneTaskCatalog.js';
export {LaneRuntimeAccessGuard} from './LaneRuntimeAccessGuard.js';
export type {AuthorizedRuntimeAccess} from './LaneRuntimeAccessGuard.js';
export {NirvanaLaneTaskRunner} from './NirvanaLaneTaskRunner.js';
export type {NirvanaLaneTaskRunnerOptions} from './NirvanaLaneTaskRunner.js';
export type {LaneTaskRunner, RuntimeRootResolver, TaskRuntimePinSource} from './LaneTaskRunner.js';
export {LaneInstallTaskRuntimePinSource} from './laneTaskRuntimePinSource.js';
export {BASE_ENVIRONMENT_KEYS, RUNTIME_ENVIRONMENT_KEYS, buildRuntimeEnvironment, redactedEnvironmentKeys} from './laneTaskEnvironment.js';
export {readTaskRuntimePin} from './taskRuntimePin.js';
// The consuming half of the typed per-invocation request channel: a packaged
// TaskHandler reads its token from the pinned `TaskHandler.argMap` and decodes it
// here. The encoding half stays internal to the runner composition.
export {TASK_REQUEST_FLAG, decodeTaskRequest} from './laneTaskRequest.js';
export {nodeRuntimeFileSystem} from './runtimeFileSystem.js';
export type {RuntimeAccount, RuntimeFileSystem, RuntimePathKind, RuntimePathObservation} from './runtimeFileSystem.js';
