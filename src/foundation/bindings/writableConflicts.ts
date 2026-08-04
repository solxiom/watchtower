import type {LaneLifecycle, RepositoryBinding, ResourceClaim} from '../../contracts/types.js';

export type WritableConflictKind = 'shared-write' | 'path-conflict' | 'branch-conflict';

/** Active lane facts required for the pure writable-conflict inspection. */
export interface ActiveLaneClaims {
    readonly laneId: string;
    readonly lifecycle: LaneLifecycle;
    readonly repositories: readonly RepositoryBinding[];
    readonly claims: readonly ResourceClaim[];
}

export interface WritableConflict {
    readonly kind: WritableConflictKind;
    readonly lanes: readonly [string, string];
    readonly repository: string;
    readonly paths?: readonly [string, string];
}

/** Detects unsafe writable-worktree, declared-branch, and exclusive-path overlaps. */
export function inspectWritableConflicts(lanes: readonly ActiveLaneClaims[]): readonly WritableConflict[] {
    const active = lanes.filter(lane => lane.lifecycle === 'active');
    const conflicts: WritableConflict[] = [];
    for (let left = 0; left < active.length; left += 1) {
        for (let right = left + 1; right < active.length; right += 1) {
            inspectPair(active[left], active[right], conflicts);
        }
    }
    return Object.freeze(conflicts.map(conflict => Object.freeze(conflict)));
}

function inspectPair(left: ActiveLaneClaims, right: ActiveLaneClaims, conflicts: WritableConflict[]): void {
    for (const first of writableBindings(left)) {
        for (const second of writableBindings(right)) {
            if (first.path !== second.path) continue;
            if (first.branch !== second.branch) add(conflicts, 'branch-conflict', left, right, first.id);
            if (!allowsSharedWrite(left, first.id) || !allowsSharedWrite(right, second.id)) {
                add(conflicts, 'shared-write', left, right, first.id);
            }
        }
    }
    for (const first of exclusiveClaims(left)) {
        for (const second of exclusiveClaims(right)) {
            if (first.repository !== second.repository) continue;
            for (const firstPath of first.paths) for (const secondPath of second.paths) {
                if (resourcePathsOverlap(firstPath, secondPath)) add(conflicts, 'path-conflict', left, right,
                    first.repository, [firstPath, secondPath]);
            }
        }
    }
}

function writableBindings(lane: ActiveLaneClaims): readonly RepositoryBinding[] {
    return lane.repositories.filter(binding => binding.access === 'write');
}

function exclusiveClaims(lane: ActiveLaneClaims): readonly ResourceClaim[] {
    return lane.claims.filter(claim => claim.mode === 'exclusive-write');
}

function allowsSharedWrite(lane: ActiveLaneClaims, repository: string): boolean {
    return lane.claims.some(claim => claim.repository === repository && claim.mode === 'shared-write');
}

export function resourcePathsOverlap(left: string, right: string): boolean {
    return segmentOverlap(left.split('/'), right.split('/'));
}

function segmentOverlap(left: readonly string[], right: readonly string[], leftAt: number = 0, rightAt: number = 0): boolean {
    if (leftAt === left.length || rightAt === right.length) return true;
    const leftSegment = left[leftAt];
    const rightSegment = right[rightAt];
    if (leftSegment === '**') return segmentOverlap(left, right, leftAt + 1, rightAt) || segmentOverlap(left, right, leftAt, rightAt + 1);
    if (rightSegment === '**') return segmentOverlap(left, right, leftAt, rightAt + 1) || segmentOverlap(left, right, leftAt + 1, rightAt);
    return segmentsMayOverlap(leftSegment, rightSegment) && segmentOverlap(left, right, leftAt + 1, rightAt + 1);
}

function segmentsMayOverlap(left: string, right: string): boolean {
    const leftTokens = tokenizeSegment(left);
    const rightTokens = tokenizeSegment(right);
    const pending: Array<readonly [number, number]> = [[0, 0]];
    const visited = new Set<string>();
    while (pending.length > 0) {
        const [leftAt, rightAt] = pending.pop() as readonly [number, number];
        const key = `${leftAt}:${rightAt}`;
        if (visited.has(key)) continue;
        visited.add(key);
        if (leftAt === leftTokens.length && rightAt === rightTokens.length) return true;
        const leftToken = leftTokens[leftAt];
        const rightToken = rightTokens[rightAt];
        if (leftToken?.kind === 'star') pending.push([leftAt + 1, rightAt]);
        if (rightToken?.kind === 'star') pending.push([leftAt, rightAt + 1]);
        if (leftToken !== undefined && rightToken !== undefined && tokensMayIntersect(leftToken, rightToken)) {
            pending.push([nextIndex(leftToken, leftAt), nextIndex(rightToken, rightAt)]);
        }
    }
    return false;
}

interface GlobToken {
    readonly kind: 'literal' | 'star' | 'any' | 'class';
    readonly values?: ReadonlySet<string>;
    readonly negated?: boolean;
}

function tokenizeSegment(segment: string): readonly GlobToken[] {
    const tokens: GlobToken[] = [];
    const characters = Array.from(segment);
    for (let index = 0; index < characters.length; index += 1) {
        if (characters[index] === '*') { tokens.push({kind: 'star'}); continue; }
        if (characters[index] === '?') { tokens.push({kind: 'any'}); continue; }
        if (characters[index] !== '[') { tokens.push({kind: 'literal', values: new Set([characters[index]])}); continue; }
        const end = characters.indexOf(']', index + 1);
        if (end === -1) { tokens.push({kind: 'any'}); continue; }
        const expression = characters.slice(index + 1, end);
        const negated = expression[0] === '!' || expression[0] === '^';
        tokens.push({kind: 'class', values: classValues(negated ? expression.slice(1) : expression), negated});
        index = end;
    }
    return tokens;
}

function classValues(characters: readonly string[]): ReadonlySet<string> | undefined {
    const values = new Set<string>();
    for (let index = 0; index < characters.length; index += 1) {
        if (characters[index + 1] === '-' && characters[index + 2] !== undefined) {
            const start = characters[index].codePointAt(0) as number;
            const end = characters[index + 2].codePointAt(0) as number;
            if (start > end || end - start > 128) return undefined;
            for (let point = start; point <= end; point += 1) values.add(String.fromCodePoint(point));
            index += 2;
        } else values.add(characters[index]);
    }
    return values;
}

function tokensMayIntersect(left: GlobToken, right: GlobToken): boolean {
    if (left.kind === 'star' || left.kind === 'any' || right.kind === 'star' || right.kind === 'any') return true;
    if (left.values === undefined || right.values === undefined) return true;
    if (left.negated && right.negated) return true;
    if (left.negated) return [...right.values].some(value => !left.values?.has(value));
    if (right.negated) return [...left.values].some(value => !right.values?.has(value));
    return [...left.values].some(value => right.values?.has(value));
}

function nextIndex(token: GlobToken, index: number): number {
    return token.kind === 'star' ? index : index + 1;
}

function add(conflicts: WritableConflict[], kind: WritableConflictKind, left: ActiveLaneClaims,
    right: ActiveLaneClaims, repository: string, paths?: readonly [string, string]): void {
    if (conflicts.some(conflict => conflict.kind === kind && conflict.lanes[0] === left.laneId &&
        conflict.lanes[1] === right.laneId && conflict.repository === repository && samePaths(conflict.paths, paths))) return;
    conflicts.push(paths === undefined ? {kind, lanes: [left.laneId, right.laneId], repository} :
        {kind, lanes: [left.laneId, right.laneId], repository, paths});
}

function samePaths(left: readonly [string, string] | undefined, right: readonly [string, string] | undefined): boolean {
    return left?.[0] === right?.[0] && left?.[1] === right?.[1];
}
