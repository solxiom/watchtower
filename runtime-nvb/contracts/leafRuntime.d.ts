/** CA-12: minimal packaged-compile type stub mirroring `src/contracts/leafRuntime.ts`'s public surface. */
export interface LeafInvocationResult {
    readonly outcome: 'completed' | 'failed' | 'cancelled';
    readonly leafId: string;
    readonly exitCode?: number | null;
    readonly signal?: string | null;
    readonly reason?: string;
    readonly diagnostic?: string;
    readonly stdout: string;
    readonly stderr: string;
}

export interface TaskLeafRequest {
    readonly leafId: string;
    readonly args: readonly string[];
    readonly context: unknown;
    readonly cancellation?: AbortSignal;
}

export interface TaskLeafCapability {
    readonly taskId: string;
    readonly leafIds: readonly string[];
    invoke(request: TaskLeafRequest): Promise<LeafInvocationResult>;
}
