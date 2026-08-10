import type {NirvanaTuiAdapter, TuiCapabilities, TuiOpenOptions, TuiSurface} from '../../contracts/tuiAdapter.js';

/** Capability seam for the pinned interactive renderer; the renderer is injected for tests and packaging. */
export class NirvanaTuiAdapterFacade implements NirvanaTuiAdapter {
    constructor(private readonly renderer: NirvanaTuiAdapter) {}
    capabilities(): TuiCapabilities { return this.renderer.capabilities(); }
    open(options: TuiOpenOptions): Promise<TuiSurface> { return this.renderer.open(options); }
}
