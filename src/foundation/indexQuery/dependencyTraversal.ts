/**
 * Bounded, depth-limited breadth-first dependency-neighborhood walk over the
 * pre-built `dependsOnByBatch` index (`IndexStore`'s `PackIndexTables`). Every
 * step is an O(1) `Map` lookup keyed by batch ID — never a scan of the full
 * edge list — so the walk's cost is proportional to the returned bounded
 * neighborhood, not to `E` (`coordinator-automation.md §9.5`).
 */
export const MAX_DEPENDENCY_DEPTH = 10;

export interface DependencyWalkResult {
    readonly direct: readonly string[];
    readonly transitive: readonly string[];
    readonly depthLimit: number;
    readonly depthReached: number;
    readonly truncated: boolean;
}

/** Breadth-first walk bounded to exactly `depthLimit` layers (never more than `MAX_DEPENDENCY_DEPTH`). */
export function walkDependencies(
    batchId: string, depthLimit: number, dependsOnByBatch: ReadonlyMap<string, readonly string[]>
): DependencyWalkResult {
    const visited = new Set<string>([batchId]);
    let frontier = [batchId];
    const direct: string[] = [];
    const transitive: string[] = [];
    let depthReached = 0;
    let truncated = false;
    for (let depth = 1; depth <= depthLimit; depth += 1) {
        const next: string[] = [];
        for (const current of frontier) {
            for (const dependsOn of dependsOnByBatch.get(current) ?? []) {
                if (visited.has(dependsOn)) continue;
                visited.add(dependsOn);
                (depth === 1 ? direct : transitive).push(dependsOn);
                next.push(dependsOn);
            }
        }
        if (next.length === 0) { depthReached = depth - 1; break; }
        depthReached = depth;
        frontier = next;
        if (depth === depthLimit) {
            truncated = frontier.some((id) => (dependsOnByBatch.get(id) ?? []).some((dependsOn) => !visited.has(dependsOn)));
        }
    }
    return {direct, transitive, depthLimit, depthReached, truncated};
}
