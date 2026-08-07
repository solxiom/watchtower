/** CA-12: minimal packaged-compile type stub mirroring `taskLeafCapability.ts`'s public surface. */
import type {TaskLeafCapability} from '../../../contracts/leafRuntime.js';

export declare function grantExecutingTaskLeafCapability(options: {readonly catalog: unknown; readonly files: unknown}): TaskLeafCapability;
