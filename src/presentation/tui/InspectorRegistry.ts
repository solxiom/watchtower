import type {TuiInspectorPage, TuiInspectorViewDescriptor, TuiInspectorViewId, TuiInspectorViewModel} from '../../contracts/tuiInspector.js';

const DESCRIPTORS: readonly TuiInspectorViewDescriptor[] = Object.freeze([
    descriptor('sessions', 'Sessions', 'No operator sessions are available.', true),
    descriptor('lane', 'Lane', 'No lane projection is available.', false),
    descriptor('batches', 'Batches', 'No batch projection is available.', true),
    descriptor('agents', 'Agents', 'Agent allocation is not available.', true),
    descriptor('budgets', 'Budgets', 'No budget projection is available.', false),
    descriptor('holds', 'Holds', 'No active holds are recorded.', true),
    descriptor('proposals', 'Proposals', 'No session proposals are available.', true),
    descriptor('events', 'Events', 'No durable events are available.', true),
    descriptor('context', 'Context', 'No bounded context manifest is available.', true)
]);

export class TuiInspectorRegistry {
    describe(): readonly TuiInspectorViewDescriptor[] { return DESCRIPTORS; }
    present(page: TuiInspectorPage): TuiInspectorViewModel {
        const descriptor = DESCRIPTORS.find((item) => item.id === page.view) ?? DESCRIPTORS[0];
        const rows = Object.freeze(page.rows.map((row) => Object.freeze({...row, fields: Object.freeze([...row.fields])})));
        return Object.freeze({...descriptor, state: page.state, rows, revision: page.revision, truncated: page.truncated, nextCursor: page.nextCursor, reasonCode: page.reasonCode});
    }
    empty(view: TuiInspectorViewId, revision = 'unknown'): TuiInspectorPage {
        return Object.freeze({schemaVersion: 1, view, state: 'empty', rows: Object.freeze([]), revision, stale: false, truncated: false, nextCursor: null, limit: 0, reasonCode: null});
    }
}

function descriptor(id: TuiInspectorViewId, title: string, emptyLabel: string, supportsSelection: boolean): TuiInspectorViewDescriptor {
    return Object.freeze({id, title, emptyLabel, supportsSelection});
}
