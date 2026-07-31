import {computeSemanticRoot, logicalExportCounts} from '../../src/foundation/storage/index.js';
import type {LogicalExport} from '../../src/foundation/storage/index.js';

function exportOf(...tables: LogicalExport['tables']): LogicalExport {
    return {tables};
}

describe('computeSemanticRoot', function () {
    const base = exportOf(
        {name: 'item', rows: [{id: 1, label: 'alpha'}, {id: 2, label: 'beta'}]},
        {name: 'edge', rows: [{fromId: 1, toId: 2}]}
    );

    it('produces a lowercase sha256 root', function () {
        const root = computeSemanticRoot(base);
        expect(root).toMatch(/^sha256:[0-9a-f]{64}$/);
    });

    it('is deterministic for identical logical exports', function () {
        expect(computeSemanticRoot(base)).toBe(computeSemanticRoot(base));
    });

    it('is independent of in-row key insertion order', function () {
        const reordered = exportOf(
            {name: 'item', rows: [{label: 'alpha', id: 1}, {label: 'beta', id: 2}]},
            {name: 'edge', rows: [{toId: 2, fromId: 1}]}
        );
        expect(computeSemanticRoot(reordered)).toBe(computeSemanticRoot(base));
    });

    it('depends on row order within a table', function () {
        const swapped = exportOf(
            {name: 'item', rows: [{id: 2, label: 'beta'}, {id: 1, label: 'alpha'}]},
            {name: 'edge', rows: [{fromId: 1, toId: 2}]}
        );
        expect(computeSemanticRoot(swapped)).not.toBe(computeSemanticRoot(base));
    });

    it('depends on table order', function () {
        const swapped = exportOf(
            {name: 'edge', rows: [{fromId: 1, toId: 2}]},
            {name: 'item', rows: [{id: 1, label: 'alpha'}, {id: 2, label: 'beta'}]}
        );
        expect(computeSemanticRoot(swapped)).not.toBe(computeSemanticRoot(base));
    });

    it('distinguishes scalar types, null, blob, and bigint', function () {
        const asNumber = exportOf({name: 't', rows: [{v: 1}]});
        const asString = exportOf({name: 't', rows: [{v: '1'}]});
        const asNull = exportOf({name: 't', rows: [{v: null}]});
        const asBlob = exportOf({name: 't', rows: [{v: Uint8Array.from([0x31])}]});
        const asBig = exportOf({name: 't', rows: [{v: 1n}]});
        const roots = [asNumber, asString, asNull, asBlob].map(computeSemanticRoot);
        expect(new Set(roots).size).toBe(roots.length);
        expect(computeSemanticRoot(asBig)).toBe(computeSemanticRoot(asNumber));
    });

    it('preserves large integer identity beyond the safe-integer range', function () {
        const big = exportOf({name: 't', rows: [{v: 9007199254740993n}]});
        const other = exportOf({name: 't', rows: [{v: 9007199254740994n}]});
        expect(computeSemanticRoot(big)).not.toBe(computeSemanticRoot(other));
    });

    it('reports per-table row counts', function () {
        expect(logicalExportCounts(base)).toEqual({item: 2, edge: 1});
    });
});
