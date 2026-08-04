// Public surface of the runtime process capsule. The raw process port, the
// Nirvana `cmd` adapter (`NirvanaProcessInvoker`, `RuntimeProcessRequest`, and
// the process outcome/invoker/disposition types), and the raw
// `LeafRuntimeInvoker` are deliberately NOT exported: they can start an
// executable with a caller-chosen argv/cwd/environment, or reach a leaf by
// naming an action string, so they remain internal to the `LaneTaskRunner` and
// task-leaf composition. Application code receives a `TaskLeafCapability`,
// which exists only inside a packaged run of the task that owns those leaves.
// `grantTaskLeafCapabilityFromArgv` (the internal, argv-injectable core) is
// ALSO deliberately NOT exported here (Correction 05 finding 1): the exported
// `grantExecutingTaskLeafCapability` takes no `argv` field at all and always
// samples this process's own real `process.argv`, so no caller can forge it.
export {grantExecutingTaskLeafCapability} from './taskLeafCapability.js';
export type {TaskLeafGrantOptions} from './taskLeafCapability.js';
