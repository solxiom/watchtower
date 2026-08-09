/**
 * Public capsule surface for CA-27's explicit scoped automation holds.
 * `ScopedHoldService` is the sole durable owner of `coordinator/holds/`;
 * nothing else in the product places, releases, or lists a scoped hold.
 */
export {ScopedHoldService} from './ScopedHoldService.js';
export type {ScopedHoldServiceOptions} from './ScopedHoldService.js';
export {SCOPED_HOLD_REASONS, ScopedHoldError, emptyHoldDocument} from './holdContracts.js';
export type {ScopedHoldDocument, ScopedHoldReason, ScopedHoldRecord} from './holdContracts.js';
export {holdsDir, holdsPath, readHoldDocument, writeHoldDocument} from './holdPersistence.js';
export {commitHoldDocument} from './holdTransaction.js';
export type {HoldDecision, HoldTransactionOptions} from './holdTransaction.js';
export {nodeHoldIdFactory} from './holdIdFactory.js';
export type {HoldIdFactory} from './holdIdFactory.js';
export {runHoldEffectTask} from './holdEffectTask.js';
export type {HoldTaskInput, HoldTaskResult, PlaceHoldTaskInput, ReleaseHoldTaskInput} from './holdEffectTask.js';
