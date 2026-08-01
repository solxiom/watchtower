import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {resolveLane} from '../../src/foundation/index.js';

const IDS = [
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002'
];
const ROWS = ['0 valid lanes', '1 valid lane', '2+ valid lanes', 'invalid marker', 'missing schemaVersion'] as const;
const COLUMNS = ['UUID match', 'slug match', 'cwd deduction', 'single deduction', 'no deduction'] as const;
type Row = typeof ROWS[number];
type Column = typeof COLUMNS[number];

describe('mandatory 25-cell lane-selection ambiguity matrix', function () {
    it('proves every discovery/cardinality row across every selector context', function () {
        const cells = ROWS.flatMap(row => COLUMNS.map(column => ({row, column})));
        expect(cells.length).toBe(25);
        for (const cell of cells) exerciseCell(cell.row, cell.column);
    });
});

function exerciseCell(row: Row, column: Column): void {
    const root = fixture();
    const context = configure(root, row, column);
    const expectedCode = codeFor(row, column);
    const name = `${row} × ${column}`;
    try {
        if (expectedCode !== undefined) {
            expect(captureCode(() => resolveLane(context))).withContext(name).toBe(expectedCode);
        } else {
            expect(resolveLane(context).slug).withContext(name).toBe(selectedSlug(row, column));
        }
    } finally { rmSync(root, {recursive: true, force: true}); }
}

function configure(root: string, row: Row, column: Column): {cwd: string; lane?: string} {
    if (row === '0 valid lanes') return selectorContext(root, column);
    const laneDir = writeLane(root, 'lane-a', IDS[0], 'paused');
    if (row === '2+ valid lanes') {
        writeLane(root, 'lane-b', IDS[1], column === 'single deduction' ? 'active' : 'paused');
    }
    if (row === 'invalid marker' || row === 'missing schemaVersion') {
        writeInvalidMarker(root, row === 'missing schemaVersion');
    }
    if (column === 'cwd deduction') {
        const cwd = join(laneDir, 'nested');
        mkdirSync(cwd);
        return {cwd};
    }
    return selectorContext(root, column);
}

function selectorContext(root: string, column: Column): {cwd: string; lane?: string} {
    if (column === 'UUID match') return {cwd: root, lane: IDS[0]};
    if (column === 'slug match') return {cwd: root, lane: 'lane-a'};
    return {cwd: root};
}

function codeFor(row: Row, column: Column): string | undefined {
    if (row === '0 valid lanes') return 'ERR_LANE_NOT_FOUND';
    if (row === 'invalid marker' || row === 'missing schemaVersion') return 'ERR_INVALID_LANE_CONFIG';
    if (row === '2+ valid lanes' && column === 'no deduction') return 'ERR_AMBIGUOUS_SELECTION';
    return undefined;
}

function selectedSlug(row: Row, column: Column): string {
    return row === '2+ valid lanes' && column === 'single deduction' ? 'lane-b' : 'lane-a';
}

function writeLane(root: string, slug: string, laneId: string, lifecycle: string): string {
    const laneDir = join(root, '.watchtower', 'lanes', slug);
    mkdirSync(join(laneDir, 'state'), {recursive: true});
    writeFileSync(join(laneDir, 'lane.json'), manifest(slug, laneId));
    writeFileSync(join(laneDir, 'state', 'coordinator-lane-state.txt'), `lane_status=${lifecycle}\n`);
    return laneDir;
}

function writeInvalidMarker(root: string, missingVersion: boolean): void {
    const laneDir = join(root, '.watchtower', 'lanes', 'broken');
    mkdirSync(laneDir, {recursive: true});
    writeFileSync(join(laneDir, 'lane.json'), missingVersion
        ? JSON.stringify({laneId: IDS[1], kind: 'implementation', slug: 'broken'}) : '{');
}

function manifest(slug: string, laneId: string): string {
    return JSON.stringify({schemaVersion: 1, laneId, kind: 'implementation', slug,
        initiativeId: `${slug}-initiative`, controlHomeRepository: 'main', laneDir: `.watchtower/lanes/${slug}`,
        repositories: [{id: 'main', role: 'primary', access: 'write'}]});
}

function fixture(): string { return mkdtempSync(join(tmpdir(), 'watchtower-rm06-matrix-')); }
function captureCode(action: () => unknown): string | undefined {
    try { action(); fail('Expected an error.'); } catch (error) { return (error as {code?: string}).code; }
    return undefined;
}
