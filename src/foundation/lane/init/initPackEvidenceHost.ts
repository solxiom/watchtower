/**
 * The init-time durable evidence boundary LC-02's pack consumer requires
 * (`docs/spec/v1-contracts.md` §3.3): "Watchtower reads the pack author's
 * durable role evidence from `state/pack-review-events.jsonl` in the lane
 * identified by `authoredByLaneId`", and each accepted input's `acceptanceRef`
 * must resolve, under its declared repository, to committed accepted-review
 * evidence.
 *
 * This resolves that evidence for a lane that does not exist yet, which is why
 * it cannot reuse the read-model's lane-bound reader: the authoring lane is a
 * *different*, already-existing lane, located by ID through the accepted
 * discovery owners (control-home lanes first, then lanes named by the
 * membership index).
 *
 * Every read crosses an injected port, never `node:fs`. Journals are parsed by
 * `StatusLaneInputReader` (its own `LaneReadFileStore` boundary) and repository
 * bytes are read through LC-02's `PackFileSystem` — the same commons
 * `Storage`-backed adapter (`packFilesystemHost.ts`) the consumer itself uses,
 * so containment authorization and byte access have exactly one owner. Every
 * external document enters as `unknown` and is narrowed by explicit predicates;
 * no value is cast across the trust boundary. This module never writes.
 */
import {join} from 'node:path';
import type {WorkerEventRecord} from '../../../contracts/events.js';
import type {PackAcceptanceEvidence, PackEvidenceInspector, PackFileSystem, PackSessionIdentity} from '../../pack/index.js';
import {discoverHomeLanes, readMembershipIndex} from '../../discovery/index.js';
import {StatusLaneInputReader} from '../../status/index.js';

const MAX_EVIDENCE_BYTES = 256 * 1024;

export interface InitPackEvidenceOptions {
    readonly controlHome: string;
    readonly dataHome: string;
    /** LC-02's own read-only repository boundary; the consumer is given the same adapter. */
    readonly fs: PackFileSystem;
}

/** Builds the read-only `PackEvidenceInspector` init hands to the LC-02 consumer. */
export function createInitPackEvidenceInspector(options: InitPackEvidenceOptions): PackEvidenceInspector {
    const reader = new StatusLaneInputReader();
    const journal = (laneDir: string): readonly WorkerEventRecord[] => reader.readPackReviewEvents(laneDir);
    return {
        resolveReviewEvents: (authoredByLaneId) => {
            const laneDir = resolveLaneDir(authoredByLaneId, options);
            return laneDir === null ? null : journal(laneDir);
        },
        resolveSession: (sessionId) => resolveSession(sessionId, options, journal),
        resolveAcceptanceEvidence: (root, relativePath) => readAcceptanceEvidence(options.fs, root, relativePath)
    };
}

/**
 * The durable pack-review journals are the session authority: a session is
 * recognized only when a record binds it to a lane and to the role it claims.
 * `implementer` is the durable spelling of the pack-author role the consumer
 * calls `author`; no other role is representable.
 */
function resolveSession(
    sessionId: string, options: InitPackEvidenceOptions, journal: (laneDir: string) => readonly WorkerEventRecord[]
): PackSessionIdentity | null {
    for (const lane of discoverableLanes(options)) {
        for (const event of journal(lane.laneDir)) {
            if (event.payload.session !== sessionId) continue;
            if (event.payload.role === 'reviewer') return {sessionId, laneId: event.laneId, role: 'reviewer'};
            if (event.payload.role === 'implementer') return {sessionId, laneId: event.laneId, role: 'author'};
        }
    }
    return null;
}

function resolveLaneDir(laneId: string, options: InitPackEvidenceOptions): string | null {
    return discoverableLanes(options).find((lane) => lane.laneId === laneId)?.laneDir ?? null;
}

function discoverableLanes(options: InitPackEvidenceOptions) {
    return laneHomes(options).flatMap((home) => safeHomeLanes(home));
}

function laneHomes(options: InitPackEvidenceOptions): readonly string[] {
    const homes = new Set<string>([options.controlHome]);
    try {
        for (const membership of readMembershipIndex(options.dataHome).memberships) homes.add(membership.laneHome);
    } catch {
        // An unavailable membership index only narrows the search; it never
        // fabricates or suppresses evidence for a lane found in the control home.
    }
    return [...homes];
}

function safeHomeLanes(home: string) {
    try {
        return discoverHomeLanes(home);
    } catch {
        return [];
    }
}

/**
 * The closed accepted-review evidence contract, read from committed repository
 * bytes through LC-02's own containment-authorizing port. Anything that is not
 * exactly that contract resolves to `null`, which the consumer treats as "not
 * accepted-review evidence" — the fail-closed outcome.
 */
function readAcceptanceEvidence(
    fs: PackFileSystem, repositoryRoot: string, relativePath: string
): PackAcceptanceEvidence | null {
    if (fs.authorizeContained(repositoryRoot, relativePath, 'file') !== 'ok') return null;
    let bytes: Uint8Array;
    try {
        bytes = fs.readFile(join(repositoryRoot, relativePath));
    } catch {
        return null;
    }
    if (bytes.byteLength > MAX_EVIDENCE_BYTES) return null;
    return toAcceptanceEvidence(decodeJson(bytes));
}

function decodeJson(bytes: Uint8Array): unknown {
    try {
        return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
    } catch {
        return null;
    }
}

/** Narrows an external document to the closed evidence contract without any cast. */
function toAcceptanceEvidence(value: unknown): PackAcceptanceEvidence | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    const verdict = textField(value, 'verdict');
    const repository = textField(value, 'repository');
    const inputPath = textField(value, 'inputPath');
    const inputSha256 = textField(value, 'inputSha256');
    const reviewSessionId = textField(value, 'reviewSessionId');
    if (verdict === null || repository === null || inputPath === null
        || inputSha256 === null || reviewSessionId === null) {
        return null;
    }
    return Object.freeze({verdict, repository, inputPath, inputSha256, reviewSessionId});
}

/** One external member, read as `unknown` and accepted only as a non-empty string. */
function textField(value: object, name: string): string | null {
    const field: unknown = Reflect.get(value, name);
    return typeof field === 'string' && field.length > 0 ? field : null;
}
