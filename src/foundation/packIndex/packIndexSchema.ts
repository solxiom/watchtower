/**
 * The closed pack-index table registry (`docs/spec/coordinator-automation.md
 * §9.2`/§9.3): `artifact`, `batch`, `dependency`, `requirement`, `repository`,
 * `proof`, `batch_repository`, `batch_requirement`, plus `index_meta` for the
 * store-identity row set CA-02 verifies before trusting a published index.
 *
 * `index_meta` participates in the semantic root like any other table. Its rows
 * never include the semantic root itself (only pack/compiler/schema identity
 * fixed before the rebuild's populate step runs), so there is no circularity:
 * the root is a pure function of pack content plus the compiler/schema
 * identity that produced it, matching §8A.3 ("the same pack bytes, compiler
 * version, database schema, and logical-export algorithm produce the same
 * typed rows and semantic root").
 */
import type {DerivedStoreSchema} from '../storage/index.js';

export const PACK_INDEX_META_TABLE = 'index_meta';
export const PACK_INDEX_DATABASE_SCHEMA_VERSION = 1;

export const PACK_INDEX_SCHEMA: DerivedStoreSchema = [
    {
        name: PACK_INDEX_META_TABLE,
        columns: [{name: 'key', type: 'text', notNull: true}, {name: 'value', type: 'text', notNull: true}],
        primaryKey: ['key']
    },
    {
        name: 'repository',
        columns: [
            {name: 'id', type: 'text', notNull: true},
            {name: 'role', type: 'text', notNull: true},
            {name: 'access', type: 'text', notNull: true}
        ],
        primaryKey: ['id']
    },
    {
        name: 'batch',
        columns: [
            {name: 'id', type: 'text', notNull: true},
            {name: 'title', type: 'text', notNull: true},
            {name: 'primary_repository', type: 'text', notNull: true},
            {name: 'work_brief', type: 'text', notNull: true},
            {name: 'review_brief', type: 'text', notNull: true},
            {name: 'implementation_reasoning', type: 'text', notNull: true},
            {name: 'review_reasoning', type: 'text', notNull: true},
            {name: 'workload', type: 'text', notNull: true}
        ],
        primaryKey: ['id'],
        foreignKeys: [{columns: ['primary_repository'], references: {table: 'repository', columns: ['id']}}]
    },
    {
        name: 'dependency',
        columns: [
            {name: 'batch_id', type: 'text', notNull: true},
            {name: 'depends_on_batch_id', type: 'text', notNull: true}
        ],
        primaryKey: ['batch_id', 'depends_on_batch_id'],
        foreignKeys: [
            {columns: ['batch_id'], references: {table: 'batch', columns: ['id']}},
            {columns: ['depends_on_batch_id'], references: {table: 'batch', columns: ['id']}}
        ]
    },
    {
        name: 'requirement',
        columns: [
            {name: 'id', type: 'text', notNull: true},
            {name: 'repository', type: 'text', notNull: true},
            {name: 'source', type: 'text', notNull: true}
        ],
        primaryKey: ['id'],
        foreignKeys: [{columns: ['repository'], references: {table: 'repository', columns: ['id']}}]
    },
    {
        name: 'batch_requirement',
        columns: [
            {name: 'batch_id', type: 'text', notNull: true},
            {name: 'requirement_id', type: 'text', notNull: true},
            {name: 'relation', type: 'text', notNull: true}
        ],
        primaryKey: ['batch_id', 'requirement_id', 'relation'],
        foreignKeys: [
            {columns: ['batch_id'], references: {table: 'batch', columns: ['id']}},
            {columns: ['requirement_id'], references: {table: 'requirement', columns: ['id']}}
        ]
    },
    {
        name: 'batch_repository',
        columns: [
            {name: 'batch_id', type: 'text', notNull: true},
            {name: 'repository_id', type: 'text', notNull: true},
            {name: 'access', type: 'text', notNull: true},
            {name: 'claim_mode', type: 'text', notNull: true},
            {name: 'paths', type: 'text', notNull: true}
        ],
        primaryKey: ['batch_id', 'repository_id'],
        foreignKeys: [
            {columns: ['batch_id'], references: {table: 'batch', columns: ['id']}},
            {columns: ['repository_id'], references: {table: 'repository', columns: ['id']}}
        ]
    },
    {
        name: 'proof',
        columns: [
            {name: 'id', type: 'text', notNull: true},
            {name: 'batch_id', type: 'text', notNull: true},
            {name: 'kind', type: 'text', notNull: true},
            {name: 'proof_class', type: 'text'},
            {name: 'repository', type: 'text'},
            {name: 'path', type: 'text'},
            {name: 'optional', type: 'integer'}
        ],
        primaryKey: ['id'],
        foreignKeys: [
            {columns: ['batch_id'], references: {table: 'batch', columns: ['id']}},
            {columns: ['repository'], references: {table: 'repository', columns: ['id']}}
        ]
    },
    {
        name: 'artifact',
        columns: [
            {name: 'ref', type: 'text', notNull: true},
            {name: 'repository', type: 'text', notNull: true},
            {name: 'path', type: 'text', notNull: true},
            {name: 'sha256', type: 'text', notNull: true},
            {name: 'bytes', type: 'integer', notNull: true},
            {name: 'role', type: 'text', notNull: true},
            {name: 'owning_batch_id', type: 'text'}
        ],
        primaryKey: ['ref'],
        foreignKeys: [
            {columns: ['repository'], references: {table: 'repository', columns: ['id']}},
            {columns: ['owning_batch_id'], references: {table: 'batch', columns: ['id']}}
        ]
    }
];
