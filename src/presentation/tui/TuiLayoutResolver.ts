import type {TuiDisplayPreferences, TuiLayout, TuiRegion} from '../../contracts/tuiShell.js';
import type {TuiSize} from '../../contracts/tuiAdapter.js';

export class TuiLayoutResolver {
    resolve(size: TuiSize, preferences: TuiDisplayPreferences): TuiLayout {
        const mode = size.columns < 50 || size.rows < 14 ? 'unusable' : size.columns >= 120 && size.rows >= 24 ? 'wide' : size.columns >= 80 && size.rows >= 20 ? 'standard' : 'narrow';
        const header = Math.min(3, size.rows);
        const footer = Math.min(2, Math.max(0, size.rows - header));
        const body = Math.max(0, size.rows - header - footer);
        if (mode === 'unusable') return {mode, size, conversation: region(0, 0, size.columns, size.rows), inspector: null, overlay: region(0, 0, size.columns, size.rows), resizeRequired: true, inspectorSide: preferences.inspectorSide, inspectorPresentation: 'none', inspectorVisible: false};
        const inspectorWidth = mode === 'wide' && preferences.inspectorVisible ? Math.max(28, Math.min(Math.floor(size.columns * preferences.inspectorWidthRatio), size.columns - 60)) : 0;
        const drawerVisible = mode === 'standard' && preferences.inspectorVisible;
        const conversationWidth = size.columns - inspectorWidth;
        return {mode, size, conversation: region(0, header, conversationWidth, body), inspector: inspectorWidth ? region(preferences.inspectorSide === 'right' ? conversationWidth : 0, header, inspectorWidth, body) : drawerVisible ? region(0, header, size.columns, body) : null, overlay: region(0, header, size.columns, body), resizeRequired: false, inspectorSide: preferences.inspectorSide, inspectorPresentation: mode === 'wide' ? 'persistent' : mode === 'standard' ? drawerVisible ? 'drawer' : 'overlay' : 'overlay', inspectorVisible: preferences.inspectorVisible};
    }
}
function region(column: number, row: number, width: number, height: number): TuiRegion { return Object.freeze({column, row, width, height}); }
