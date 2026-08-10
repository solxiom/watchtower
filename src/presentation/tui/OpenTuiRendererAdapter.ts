import type {NirvanaTuiAdapter, TuiCapabilities, TuiFrame, TuiOpenOptions, TuiSurface} from '../../contracts/tuiAdapter.js';

/** OpenTUI is intentionally isolated here. The injected engine object is the CA-18 adapter boundary. */
export class OpenTuiRendererAdapter implements NirvanaTuiAdapter {
    constructor(private readonly engine: OpenTuiEngine) {}
    capabilities(): TuiCapabilities { return this.engine.capabilities(); }
    async open(options: TuiOpenOptions): Promise<TuiSurface> { return this.engine.open(options); }
}
export interface OpenTuiEngine { capabilities(): TuiCapabilities; open(options: TuiOpenOptions): Promise<TuiSurface>; }

export class FakeTuiSurface implements TuiSurface {
    readonly frames: TuiFrame[] = [];
    render(frame: TuiFrame): void { this.frames.push(frame); }
    async *events(_signal: AbortSignal): AsyncIterable<{readonly type: string}> { yield {type: 'ready'}; }
    async close(_reason: 'operator' | 'signal' | 'renderer-failure' | 'unsupported-target'): Promise<void> {}
}
