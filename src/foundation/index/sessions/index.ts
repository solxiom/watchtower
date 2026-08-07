/**
 * Public surface of the CA-16 session-index capability tree (session memory
 * foundation). Consumers open, build, and incrementally update the derived
 * session index, run the bounded typed queries and cross-session capsules, and
 * compact it — never a database handle, path, or raw SQL. Re-exports only.
 */
export {SessionIndex} from './SessionIndexBuilder.js';
export {SessionCompactor} from './SessionCompaction.js';
export {
    SESSION_INDEX_COMPILER_VERSION, SESSION_INDEX_DATABASE_SCHEMA_VERSION,
    SESSION_INDEX_SCHEMA, SESSION_STORE_KIND
} from './sessionIndexSchema.js';
