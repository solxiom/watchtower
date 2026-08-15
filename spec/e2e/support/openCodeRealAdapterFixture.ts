/**
 * REL-03 real OpenCode adapter-matrix fixture.
 *
 * `OpenCodeEndpointAdapter` is exercised everywhere else in the accepted
 * suite against a fake `TaskLeafCapability` that returns pre-recorded
 * stdout (`spec/foundation/opencodeEndpoint.spec.ts`), and the real,
 * nvm-resolved OpenCode 1.18.16 executable is separately exercised by
 * `spec/foundation/opencodeExecutableConformance.spec.ts` with raw
 * `execFileSync`, bypassing the adapter and the leaf-authority boundary
 * entirely. Neither proves the production path: the real adapter driving a
 * real `TaskLeafCapability` that really spawns the real executable through
 * `LeafRuntimeInvoker`'s checksum-verified, contained-runtime-root leaf
 * boundary. This fixture closes that gap, mirroring REL-02's accepted
 * `gitAcceptanceRealPublish.ts` pattern exactly: a real, relocated immutable
 * runtime root carrying one real leaf, opened through the same
 * `LaneTaskCatalog.open` + `grantTaskLeafCapabilityFromArgv` production
 * composition a packaged NVB child actually uses.
 *
 * `NIRVANA_API_GAP`: `wt` ships no CLI command that reaches
 * `OpenCodeEndpointAdapter` (no coordinator-decision command exists in the
 * v1 §10 table yet) — exactly REL-02's already-accepted
 * `GIT_ACCEPTANCE_NO_CLI_FRONT_DOOR` finding, restated for this adapter.
 * This fixture therefore drives the real, accepted foundation composition
 * directly, the same accepted pattern.
 */
import {execFileSync} from 'node:child_process';
import {chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {LaneTaskCatalog} from '../../../src/foundation/task/runtime/LaneTaskCatalog.js';
import {nodeRuntimeFileSystem} from '../../../src/foundation/task/runtime/runtimeFileSystem.js';
import {grantTaskLeafCapabilityFromArgv} from '../../../src/foundation/runtime/leaf/taskLeafCapability.js';
import {semanticDigest} from '../../../src/foundation/schemaComposition/jsonCanonicalizer.js';
import type {JsonObject} from '../../../src/foundation/schemaComposition/schemaCompositionContracts.js';
import type {TaskLeafCapability} from '../../../src/contracts/leafRuntime.js';

const CATALOG_ID = 'watchtower-rel03-opencode-fixture/v1';
const PROFILE_ID = 'implementation-v1';
const ACTION_ID = 'coordinator.decision';
const TASK_ID = 'wt:coordinator:decision';
const LEAF_ID = 'opencode';

export interface OpenCodeRealFixture {
    readonly root: string;
    readonly runtimeRoot: string;
    readonly leafPath: string;
    readonly executable: string;
    remove(): void;
}

/** The nvm-resolved OpenCode executable this checkout is pinned against. */
export function resolveOpenCodeExecutable(): string {
    return execFileSync('bash', ['-lc', 'source ~/.nvm/nvm.sh && command -v opencode'], {encoding: 'utf8'}).trim();
}

function rawDigest(text: string): `sha256:${string}` {
    return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

/** Stages a real, relocated immutable runtime root whose one leaf `exec`s the real OpenCode binary. */
export function makeOpenCodeRealFixture(): OpenCodeRealFixture {
    const executable = resolveOpenCodeExecutable();
    const root = mkdtempSync(join(tmpdir(), 'wt-rel03-opencode-'));
    const runtimeRoot = join(root, 'runtimes', '1.0.0');
    const catalogDirectory = join(runtimeRoot, 'runtime-nvb');
    mkdirSync(join(catalogDirectory, 'leaves'), {recursive: true});
    const leafPath = join(catalogDirectory, 'leaves', 'opencode.sh');
    const leafSource = `#!/bin/sh\nexec ${executable} "$@"\n`;
    writeFileSync(leafPath, leafSource);
    chmodSync(leafPath, 0o555);
    writeFileSync(join(catalogDirectory, 'runtime-nvb.json'), JSON.stringify({tasks: {}}));
    writeFileSync(join(catalogDirectory, 'runtime-nvb.js'), 'export {};\n');
    const document = catalogDocument(rawDigest(leafSource));
    writeFileSync(join(catalogDirectory, 'task-catalog.json'), JSON.stringify(document));
    chmodSync(runtimeRoot, 0o555);
    return {
        root, runtimeRoot, leafPath, executable,
        remove: () => { chmodSync(runtimeRoot, 0o755); rmSync(root, {recursive: true, force: true}); }
    };
}

function catalogDocument(leafDigest: `sha256:${string}`): JsonObject {
    return {
        schemaVersion: 1, catalogId: CATALOG_ID, catalogVersion: 1, fragments: ['opencode-adapter-matrix'],
        minimumRuntime: {cliVersion: '0.1.0', nodeVersion: '26.4.0'},
        handlers: {}, tasks: {[TASK_ID]: {executionScope: 'lane-runtime', handlerId: 'CoordinatorDecisionTaskHandler',
            inputSchema: 'watchtower://runtime/schemas/coordinator-decision-input/v1',
            resultSchema: 'watchtower://runtime/schemas/coordinator-decision-result/v1',
            leafIds: [LEAF_ID], mutationClass: 'read-only', requiresInvocationEnvelope: true}},
        groups: {}, actions: {[ACTION_ID]: {taskId: TASK_ID}},
        leaves: {[LEAF_ID]: {executable: true, mode: '0555', path: './leaves/opencode.sh', sha256: leafDigest}},
        profiles: {[PROFILE_ID]: {taskIds: [TASK_ID]}}, schemas: {}
    };
}

/** Fake argv matching the exact shape `taskLeafCapability.ts` requires: task id at index 2, a `--jsonfile=` flag pointing inside the runtime root. */
function packagedArgv(fixture: OpenCodeRealFixture): readonly string[] {
    return ['/usr/bin/node', join(fixture.runtimeRoot, 'runtime-nvb', 'runtime-nvb.js'), TASK_ID,
        `--jsonfile=${join(fixture.runtimeRoot, 'runtime-nvb', 'runtime-nvb.json')}`,
        `--jsfile=${join(fixture.runtimeRoot, 'runtime-nvb', 'runtime-nvb.js')}`];
}

/** Real leaf capability bound to the real, on-disk staged catalog + leaf script above. */
export function openLeafCapability(fixture: OpenCodeRealFixture): TaskLeafCapability {
    const target = {
        catalogId: CATALOG_ID, catalogSha256: semanticDigest(catalogDocument(rawDigest(`#!/bin/sh\nexec ${fixture.executable} "$@"\n`))),
        profile: PROFILE_ID, configTarget: join(fixture.runtimeRoot, 'runtime-nvb', 'runtime-nvb.json'),
        moduleTarget: join(fixture.runtimeRoot, 'runtime-nvb', 'runtime-nvb.js')
    };
    const catalog = LaneTaskCatalog.open(target, fixture.runtimeRoot, nodeRuntimeFileSystem);
    return grantTaskLeafCapabilityFromArgv({
        catalog, files: nodeRuntimeFileSystem, argv: packagedArgv(fixture)
    });
}

/** Wraps a real capability to count real invocations without changing its behaviour. */
export function countingCapability(capability: TaskLeafCapability): TaskLeafCapability & {invocations: number} {
    let invocations = 0;
    return {
        taskId: capability.taskId, leafIds: capability.leafIds,
        get invocations() { return invocations; },
        async invoke(request) { invocations += 1; return capability.invoke(request); }
    };
}
