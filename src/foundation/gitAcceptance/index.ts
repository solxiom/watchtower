// Public surface of the Git acceptance/publication capability (CA-12).
export {GitAcceptanceAdapter} from './GitAcceptance.js';
export type {GitAcceptanceCycleContext, GitAcceptanceDeps} from './gitAcceptancePublication.js';
export {nodeGitAcceptanceInspector} from './gitAcceptanceCommitSet.js';
export type {GitAcceptanceInspector} from './gitAcceptanceCommitSet.js';
export {findReviewerAcceptEvent, readWorkerEventJournal} from './gitAcceptanceOwnership.js';
