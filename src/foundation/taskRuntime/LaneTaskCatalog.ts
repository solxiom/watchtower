/**
 * The lane's view of the immutable packaged task catalog: it reads the catalog
 * aggregate beside the pinned config target, proves catalog identity and digest
 * against the lane pin, and answers exactly two questions — which task an
 * allowlisted action maps to, and where a cataloged leaf lives.
 *
 * The catalog document is composed and validated at build time by `RT-09`; this
 * module is its lane-runtime reader. It never composes, repairs, or rewrites
 * catalog bytes, and treats every field as `unknown` until proved.
 */
import {dirname, join} from 'node:path';
import {isJsonValue, semanticDigest} from '../schemaComposition/jsonCanonicalizer.js';
import {hasDuplicateJsonObjectKey} from '../schemaComposition/jsonDuplicateKeyDetector.js';
import type {JsonObject} from '../schemaComposition/schemaCompositionContracts.js';
import {LeafRuntimeError} from '../../contracts/leafRuntime.js';
import {
    LaneTaskRuntimeError,
    type LaneRuntimeLeaf,
    type LaneTaskBinding,
    type LaneTaskMutationClass,
    type LaneTaskRuntimeReason,
    type PinnedTaskRuntimeTarget
} from '../../contracts/taskRuntime.js';
import {containedInRoot, requireContainedRuntimeFile} from './taskRuntimePin.js';
import {readCatalogSchema, type JsonSchemaDocument} from './laneTaskSchemaValidation.js';
import type {RuntimeFileSystem} from './runtimeFileSystem.js';

const CATALOG_FILE = 'task-catalog.json';
const MAX_CATALOG_BYTES = 4 * 1024 * 1024;
const SIMPLE_ID = /^[a-z0-9][a-z0-9.-]{0,127}$/u;
const TASK_ID = /^wt:[a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*)+$/u;
const HANDLER_ID = /^[A-Z][A-Za-z0-9]{0,127}$/u;
const SCHEMA_ID = /^watchtower:\/\/runtime\/schemas\/[a-z0-9-]+\/v1$/u;
const LEAF_DIGEST = /^sha256:[a-f0-9]{64}$/u;
const LEAF_PREFIX = './leaves/';
const MUTATION_CLASSES: readonly LaneTaskMutationClass[] = [
    'read-only', 'derived-write', 'managed-runtime-write', 'managed-lane-write',
    'journaled-mutation', 'authoritative-effect', 'external-effect'
];

/** A verified catalog aggregate bound to exactly one lane task profile. */
export class LaneTaskCatalog {
    private constructor(
        private readonly document: JsonObject,
        private readonly profileTaskIds: ReadonlySet<string>,
        private readonly catalogDirectory: string,
        private readonly runtimeRoot: string
    ) {}

    /**
     * Read, verify, and bind the catalog named by `pin`. Identity and digest are
     * proved before any lookup, so a stale or swapped catalog fails closed
     * rather than resolving an action against unexpected bytes.
     */
    static open(pin: PinnedTaskRuntimeTarget, runtimeRoot: string, files: RuntimeFileSystem): LaneTaskCatalog {
        const catalogDirectory = dirname(pin.configTarget);
        const lexicalPath = join(catalogDirectory, CATALOG_FILE);
        // Prove the canonical (symlink-resolved) target, not merely the lexical
        // path, sits inside the pinned runtime root: a checksum-matching symlink
        // must not let the catalog be read from outside the immutable root.
        const canonicalPath = requireContainedRuntimeFile(
            files, runtimeRoot, lexicalPath, CATALOG_FILE, 'TASK_RUNTIME_CATALOG_UNREADABLE'
        );
        const document = parseCatalog(files.readText(canonicalPath, MAX_CATALOG_BYTES));
        verifyIdentity(document, pin);
        return new LaneTaskCatalog(document, readProfile(document, pin.profile), catalogDirectory, runtimeRoot);
    }

    /** The pinned immutable runtime root this catalog was verified against. */
    get root(): string {
        return this.runtimeRoot;
    }

    /**
     * Read and checksum-verify one catalog-declared JSON Schema from inside the
     * immutable runtime root, delegating the file access to the schema module so
     * this class stays the catalog aggregate reader and nothing more.
     */
    readCheckedSchema(schemaId: string, files: RuntimeFileSystem): JsonSchemaDocument {
        return readCatalogSchema(fields(this.document.schemas), this.catalogDirectory, this.runtimeRoot, files, schemaId);
    }

    /**
     * Resolve one allowlisted action to exactly one catalog task. Absent,
     * dangling, and out-of-profile actions each carry their own reason so an
     * operator can tell "not offered in this lane" from "not built".
     */
    resolveAction(actionId: string): LaneTaskBinding {
        if (typeof actionId !== 'string' || !SIMPLE_ID.test(actionId)) {
            throw refuse('TASK_RUNTIME_REQUEST_INVALID', 'actionId',
                'An action identifier must match the catalog action syntax.');
        }
        const action = fields(this.document.actions)[actionId];
        if (action === undefined) {
            throw refuse('TASK_RUNTIME_ACTION_UNKNOWN', actionId, 'The packaged catalog declares no such action.');
        }
        const taskId = fields(action).taskId;
        if (typeof taskId !== 'string' || !TASK_ID.test(taskId)) {
            throw refuse('TASK_RUNTIME_ACTION_DANGLING', actionId,
                'The catalog action does not name a syntactically valid task.');
        }
        const entry = fields(this.document.tasks)[taskId];
        if (entry === undefined) {
            throw refuse('TASK_RUNTIME_ACTION_DANGLING', actionId,
                'The catalog action names a task the catalog does not define.');
        }
        if (!this.profileTaskIds.has(taskId)) {
            throw refuse('TASK_RUNTIME_TASK_NOT_IN_PROFILE', taskId,
                'The lane task profile does not allow this task.');
        }
        return binding(actionId, taskId, fields(entry));
    }

    /**
     * Resolve the binding of a task by its own identifier, for the packaged
     * process that was started to run exactly that task. Authority is the task,
     * so the catalog must name it through exactly one allowlisted action;
     * ambiguity is refused rather than resolved by preference.
     */
    resolveExecutingTask(taskId: string): LaneTaskBinding {
        const actions = fields(this.document.actions);
        const owning = Object.keys(actions)
            .filter((actionId) => fields(actions[actionId]).taskId === taskId)
            .sort();
        if (owning.length !== 1) {
            throw refuse('TASK_RUNTIME_ACTION_UNKNOWN', taskId,
                'The packaged catalog does not map exactly one allowlisted action to this task.');
        }
        return this.resolveAction(owning[0]);
    }

    /**
     * Resolve one cataloged leaf declaration to a runtime-root-contained path.
     * Byte identity is proved by the leaf invoker, which owns execution.
     */
    resolveLeaf(leafId: string): LaneRuntimeLeaf {
        if (typeof leafId !== 'string' || !SIMPLE_ID.test(leafId)) {
            throw new LeafRuntimeError('LEAF_REQUEST_INVALID', String(leafId),
                'A leaf identifier must match the catalog leaf syntax.');
        }
        const entry = fields(this.document.leaves)[leafId];
        if (entry === undefined) {
            throw new LeafRuntimeError('LEAF_UNKNOWN', leafId,
                'The packaged catalog declares no such leaf executable.');
        }
        const leaf = fields(entry);
        if (typeof leaf.path !== 'string' || !leaf.path.startsWith(LEAF_PREFIX)
            || leaf.path.split('/').includes('..')
            || typeof leaf.sha256 !== 'string' || !LEAF_DIGEST.test(leaf.sha256)
            || leaf.executable !== true || leaf.mode !== '0555') {
            throw new LeafRuntimeError('LEAF_REQUEST_INVALID', leafId,
                'The cataloged leaf declaration is not a complete executable entry.');
        }
        const path = join(this.catalogDirectory, leaf.path.replace('./', ''));
        if (!containedInRoot(this.runtimeRoot, path)) {
            throw new LeafRuntimeError('LEAF_PATH_ESCAPE', leafId,
                'The cataloged leaf path resolves outside the pinned runtime root.');
        }
        return {leafId, path, sha256: leaf.sha256 as `sha256:${string}`, mode: '0555'};
    }
}

function binding(actionId: string, taskId: string, entry: JsonObject): LaneTaskBinding {
    const mutationClass = entry.mutationClass as LaneTaskMutationClass;
    if (typeof entry.handlerId !== 'string' || !HANDLER_ID.test(entry.handlerId)
        || typeof entry.inputSchema !== 'string' || !SCHEMA_ID.test(entry.inputSchema)
        || typeof entry.resultSchema !== 'string' || !SCHEMA_ID.test(entry.resultSchema)
        || typeof entry.requiresInvocationEnvelope !== 'boolean'
        || !MUTATION_CLASSES.includes(mutationClass)
        || !Array.isArray(entry.leafIds) || !entry.leafIds.every((id) => typeof id === 'string')) {
        throw refuse('TASK_RUNTIME_CATALOG_INVALID', taskId,
            'The catalog task entry does not declare a complete execution contract.');
    }
    if (entry.executionScope !== 'lane-runtime') {
        throw refuse('TASK_RUNTIME_TASK_SCOPE_INVALID', taskId,
            'Only a lane-runtime task may be invoked through the lane task runner.');
    }
    return {
        actionId,
        taskId,
        handlerId: entry.handlerId,
        inputSchema: entry.inputSchema,
        resultSchema: entry.resultSchema,
        mutationClass,
        requiresInvocationEnvelope: entry.requiresInvocationEnvelope,
        leafIds: entry.leafIds as readonly string[]
    };
}

function parseCatalog(text: string | null): JsonObject {
    if (text === null) {
        throw refuse('TASK_RUNTIME_CATALOG_UNREADABLE', CATALOG_FILE,
            'The packaged task catalog is missing, unreadable, or oversized.');
    }
    let value: unknown;
    try {
        if (hasDuplicateJsonObjectKey(text)) throw new Error('duplicate member');
        value = JSON.parse(text);
    } catch {
        throw refuse('TASK_RUNTIME_CATALOG_INVALID', CATALOG_FILE,
            'The packaged task catalog is not a well-formed JSON document.');
    }
    if (!isJsonValue(value) || typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw refuse('TASK_RUNTIME_CATALOG_INVALID', CATALOG_FILE,
            'The packaged task catalog must be a JSON object.');
    }
    return value;
}

function verifyIdentity(document: JsonObject, pin: PinnedTaskRuntimeTarget): void {
    if (document.schemaVersion !== 1 || document.catalogId !== pin.catalogId) {
        throw refuse('TASK_RUNTIME_CATALOG_IDENTITY_MISMATCH', pin.catalogId,
            'The packaged task catalog identity does not match the lane pin.');
    }
    if (semanticDigest(document) !== pin.catalogSha256) {
        throw refuse('TASK_RUNTIME_CATALOG_DIGEST_MISMATCH', pin.catalogId,
            'The packaged task catalog digest does not match the lane pin.');
    }
}

function readProfile(document: JsonObject, profile: string): ReadonlySet<string> {
    const entry = fields(document.profiles)[profile];
    if (entry === undefined) {
        throw refuse('TASK_RUNTIME_PROFILE_UNKNOWN', profile,
            'The packaged task catalog declares no such lane task profile.');
    }
    const taskIds = fields(entry).taskIds;
    if (!Array.isArray(taskIds) || !taskIds.every((id) => typeof id === 'string' && TASK_ID.test(id))) {
        throw refuse('TASK_RUNTIME_CATALOG_INVALID', profile,
            'The lane task profile does not declare a valid task allowlist.');
    }
    return new Set(taskIds as string[]);
}

function fields(value: unknown): JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as JsonObject : {};
}

function refuse(reason: LaneTaskRuntimeReason, subject: string, message: string): LaneTaskRuntimeError {
    return new LaneTaskRuntimeError(reason, subject, message);
}
