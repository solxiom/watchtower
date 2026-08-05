import {existsSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createWatchtowerError, type InstallManifestV1} from '../../contracts/index.js';
import type {KnowledgeManifestV1, RuntimeManifestV1} from '../../contracts/runtimeKnowledgeManifests.js';
import {resolveLane} from '../discovery/index.js';
import {RuntimeCatalog, parseInstallManifest, parseKnowledgeManifest, parseRuntimeManifest} from '../runtime/index.js';

export interface VersionReport {
    readonly cliVersion: string;
    readonly runtimeVersion: string | null;
    readonly knowledgeVersion: string | null;
    readonly laneSchemaVersion: number | null;
    readonly availableRuntimes?: readonly string[];
    readonly availableKnowledge?: readonly string[];
}

export interface VersionReportQuery { readonly cwd: string; readonly lane?: string; }

export interface VersionReportServiceOptions {
    readonly catalog?: RuntimeCatalog;
    readonly packageRoot?: string;
    readonly readText?: (path: string) => string;
}

const packageRoot = findPackageRoot(dirname(fileURLToPath(import.meta.url)));
const packageVersion = readJson(join(packageRoot, 'package.json')).version;

export class VersionReportService {
    private readonly catalog: RuntimeCatalog;
    private readonly packageRoot: string;
    private readonly readText: (path: string) => string;

    constructor(options: VersionReportServiceOptions = {}) {
        this.catalog = options.catalog ?? new RuntimeCatalog();
        this.packageRoot = options.packageRoot ?? packageRoot;
        this.readText = options.readText ?? ((path) => readFileSync(path, 'utf8'));
    }

    report(query: VersionReportQuery): VersionReport {
        return query.lane === undefined ? this.globalReport() : this.laneReport(query);
    }

    private globalReport(): VersionReport {
        const runtimes = this.catalog.listInstalledRuntimes();
        const knowledge = this.catalog.listInstalledKnowledge();
        return {
            cliVersion: packageVersion,
            runtimeVersion: newest(runtimes) ?? this.packagedRuntime().runtimeVersion,
            knowledgeVersion: newest(knowledge) ?? this.packagedKnowledge().knowledgeVersion,
            laneSchemaVersion: 1
        };
    }

    private laneReport(query: VersionReportQuery): VersionReport {
        const lane = resolveLane({cwd: query.cwd, lane: query.lane});
        const install = this.readInstall(lane.laneDir);
        return {
            cliVersion: packageVersion,
            runtimeVersion: install.runtimeVersion,
            knowledgeVersion: install.knowledgeVersion,
            laneSchemaVersion: lane.manifest.schemaVersion,
            availableRuntimes: this.catalog.listInstalledRuntimes(),
            availableKnowledge: this.catalog.listInstalledKnowledge()
        };
    }

    private readInstall(laneDir: string): InstallManifestV1 {
        try { return parseInstallManifest(JSON.parse(this.readText(join(laneDir, 'install.json'))) as unknown); }
        catch { throw createWatchtowerError('ERR_INVALID_LANE_CONFIG', {operation: 'read version report', target: join(laneDir, 'install.json'), remediation: 'Restore a schema-valid install.json for the selected lane.'}); }
    }

    private packagedRuntime(): RuntimeManifestV1 {
        return parseRuntimeManifest(this.readPackaged('runtime/manifest.json'));
    }

    private packagedKnowledge(): KnowledgeManifestV1 {
        return parseKnowledgeManifest(this.readPackaged('knowledge/manifest.json'));
    }

    private readPackaged(relativePath: string): unknown {
        try { return JSON.parse(this.readText(join(this.packageRoot, relativePath))) as unknown; }
        catch { throw createWatchtowerError('ERR_INTERNAL', {operation: 'read version report', target: relativePath, remediation: 'Restore the packaged runtime and knowledge manifests, then retry.'}); }
    }
}

function readJson(path: string): {readonly version: string} {
    try {
        const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
        if (typeof value === 'object' && value !== null && 'version' in value && typeof value.version === 'string') return {version: value.version};
    } catch { /* package boundary reports a normal internal error when used */ }
    throw createWatchtowerError('ERR_INTERNAL', {operation: 'read version report', target: 'package.json', remediation: 'Restore a package.json that declares the Watchtower CLI version.'});
}

function findPackageRoot(start: string): string {
    let current = start;
    while (true) {
        if (existsSync(join(current, 'package.json'))) return current;
        const parent = dirname(current);
        if (parent === current) break;
        current = parent;
    }
    throw createWatchtowerError('ERR_INTERNAL', {operation: 'read version report', target: 'package.json', remediation: 'Restore the package root and its package.json file.'});
}

function newest(values: readonly string[]): string | null {
    return [...values].sort(compareVersions).at(-1) ?? null;
}

function compareVersions(left: string, right: string): number {
    const a = left.split(/[-.]/u).map(part => Number(part) || 0);
    const b = right.split(/[-.]/u).map(part => Number(part) || 0);
    for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
        if ((a[index] ?? 0) !== (b[index] ?? 0)) return (a[index] ?? 0) - (b[index] ?? 0);
    }
    return left.localeCompare(right);
}
