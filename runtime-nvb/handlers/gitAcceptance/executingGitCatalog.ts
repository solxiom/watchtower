/**
 * Grants `wt:git:publish-commits` its own cataloged Git leaf capability from
 * this exact process's real argv/environment — the same `--jsonfile=` config
 * target and `WT_RUNTIME_ROOT` `LaneTaskRunner` gave this packaged child,
 * never a caller-suppliable override (mirrors
 * `src/foundation/runtime/leaf/taskLeafCapability.ts`'s own argv-only
 * authority model). `grantExecutingTaskLeafCapability` itself only *checks*
 * containment against an already-open `LaneTaskCatalog`; this module is the
 * one piece that must open that catalog from inside the running task, since
 * no production caller has needed to before CA-12.
 */
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {isJsonObject, isJsonValue, semanticDigest} from '../../foundation/schemaComposition/index.js';
import {LaneTaskCatalog} from '../../foundation/task/runtime/LaneTaskCatalog.js';
import {nodeRuntimeFileSystem} from '../../foundation/task/runtime/runtimeFileSystem.js';
import {grantExecutingTaskLeafCapability} from '../../foundation/runtime/leaf/taskLeafCapability.js';
import type {TaskLeafCapability} from '../../contracts/leafRuntime.js';

const CONFIG_FLAG = '--jsonfile=';
const MODULE_FLAG = '--jsfile=';
const CATALOG_FILE = 'task-catalog.json';

function flagValue(argv: readonly string[], flag: string): string | undefined {
    const entry = argv.find((value) => typeof value === 'string' && value.startsWith(flag));
    return entry === undefined ? undefined : entry.slice(flag.length);
}

/** The one profile (of the catalog's own declared set) that actually lists `taskId`. */
function selectOwningProfile(document: Record<string, unknown>, taskId: string): string {
    const profiles = isJsonObject(document.profiles) ? document.profiles : {};
    for (const [profileId, entry] of Object.entries(profiles)) {
        const taskIds = isJsonObject(entry) && Array.isArray(entry.taskIds) ? entry.taskIds : [];
        if (taskIds.includes(taskId)) return profileId;
    }
    throw new Error(`The packaged task catalog declares no lane task profile for "${taskId}".`);
}

/**
 * Open this process's own immutable packaged catalog and grant the leaf
 * capability the executing task (`taskId`) is entitled to. Refuses (throws)
 * outside a real packaged run, exactly like `grantExecutingTaskLeafCapability`
 * itself refuses when `process.argv`/pin proof fails.
 */
export function grantGitLeafCapability(taskId: string): TaskLeafCapability {
    const configTarget = flagValue(process.argv, CONFIG_FLAG);
    const moduleTarget = flagValue(process.argv, MODULE_FLAG);
    const runtimeRoot = process.env.WT_RUNTIME_ROOT;
    if (configTarget === undefined || moduleTarget === undefined || !runtimeRoot) {
        throw new Error('Leaf authority is only granted inside a packaged run of a cataloged lane task.');
    }
    const catalogPath = join(dirname(configTarget), CATALOG_FILE);
    const parsed: unknown = JSON.parse(readFileSync(catalogPath, 'utf8'));
    if (!isJsonValue(parsed) || !isJsonObject(parsed) || typeof parsed.catalogId !== 'string') {
        throw new Error('The packaged task catalog does not declare a catalog identity.');
    }
    const catalog = LaneTaskCatalog.open({
        catalogId: parsed.catalogId, catalogSha256: semanticDigest(parsed),
        profile: selectOwningProfile(parsed, taskId), configTarget, moduleTarget
    }, runtimeRoot, nodeRuntimeFileSystem);
    return grantExecutingTaskLeafCapability({catalog, files: nodeRuntimeFileSystem});
}
