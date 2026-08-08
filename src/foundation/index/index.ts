// Coordinator-index capability barrel for command consumers.
export {createDefaultIndexBuildComposition} from './assembly/IndexBuildComposition.js';
export type {IndexBuildRequestSource, IndexBuildService} from './assembly/index.js';
export {IndexStore} from './store/index.js';
export type {IndexIdentity} from './store/index.js';
export {IndexQuery} from './query/index.js';
export {buildCommandResult, renderResult} from '../presentation/index.js';
