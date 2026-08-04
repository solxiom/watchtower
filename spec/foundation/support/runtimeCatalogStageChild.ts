import {writeFileSync} from 'node:fs';
import {RuntimeCatalogError} from '../../../src/contracts/runtimeCatalog.js';
import {RuntimeCatalog} from '../../../src/foundation/runtimeCatalog/index.js';
import {ImmutableVersionStore} from '../../../src/foundation/runtimeCatalog/ImmutableVersionStore.js';

interface ChildRequest {
    readonly dataRoot: string;
    readonly hold?: boolean;
    readonly holdBoundary?: string;
    readonly manifest: unknown;
    readonly ready: string;
    readonly source: string;
    readonly version: string;
}

const raw = process.env.WATCHTOWER_RUNTIME_CATALOG_CHILD;
if (raw) run(JSON.parse(raw) as ChildRequest);

function run(request: ChildRequest): void {
    const catalog = new RuntimeCatalog({
        dataRoot: () => request.dataRoot,
        store: new ImmutableVersionStore({
            publicationMarkerRemoved: () => holdAt(request, 'finalization'),
            temporaryReady: () => holdAt(request, 'temporary')
        })
    });
    try {
        catalog.stageRuntime(request.version, request.manifest as never, request.source);
        process.stdout.write('{"outcome":"published"}\n');
    } catch (error) {
        const reason = error instanceof RuntimeCatalogError ? error.reason : 'UNKNOWN';
        process.stdout.write(`${JSON.stringify({outcome: 'refused', reason})}\n`);
        process.exitCode = 1;
    }
}

function holdAt(request: ChildRequest, boundary: string): void {
    if ((request.holdBoundary ?? 'temporary') !== boundary) return;
    writeFileSync(request.ready, 'ready');
    if (request.hold) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000);
}
