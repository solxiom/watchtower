/** CA-13: minimal packaged-compile type stub mirroring `journalWindowReader.ts`'s public surface. */
import type {PackagedDurableEvent} from './journalIndexSource.js';

export interface JournalCheckpointExpectation {
    readonly anchorDigest: string;
    readonly lastEventId: string;
    readonly byteLength: number;
}

export interface JournalWindowRequest {
    readonly fromSequence: number;
    readonly fromByteOffset: number;
    readonly limit: number;
    readonly maxBytes: number;
    readonly expected: JournalCheckpointExpectation | null;
}

export interface JournalReadRange {
    readonly offset: number;
    readonly length: number;
}

export interface JournalWindow {
    readonly events: readonly PackagedDurableEvent[];
    readonly offsets: readonly number[];
    readonly lengths: readonly number[];
    readonly recordDigests: readonly string[];
    readonly endByteOffset: number;
    readonly byteLength: number;
    readonly partialTail: boolean;
    readonly exhausted: boolean;
    readonly readRanges: readonly JournalReadRange[];
}

export declare function readJournalWindow(path: string, request: JournalWindowRequest): JournalWindow;
