/** CA-13: minimal packaged-compile type stub mirroring `journalIndexSource.ts`'s public surface. */
export interface PackagedDurableEvent {
    readonly schemaVersion: 1;
    readonly eventId: string;
    readonly type: string;
    readonly sequence: number;
    readonly at: string;
    readonly laneId: string;
    readonly producer: string;
    readonly correlationId: string;
    readonly causationId: string | null;
    readonly policyVersion: string;
    readonly payload: Record<string, unknown>;
    readonly [field: string]: unknown;
}

export interface ParsedJournal {
    readonly events: readonly PackagedDurableEvent[];
    readonly offsets: readonly number[];
    readonly lengths: readonly number[];
    readonly completeByteLength: number;
    readonly byteLength: number;
    readonly identityHash: string;
    readonly partialTail: boolean;
}

export declare function parseJournal(path: string): ParsedJournal;
export declare function isDurableEvent(value: unknown): value is PackagedDurableEvent;
