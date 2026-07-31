/**
 * Process start identity for durable lock records, per `docs/spec/v1-contracts.md
 * §11`: a durable lock records owner PID, **process start identity**, command,
 * and acquisition time, and "a PID alone is insufficient stale-lock proof".
 *
 * Nirvana audit (`NIRVANA_API_GAP`, proven): the pinned Watchtower packages are
 * `@nirvana/base`, `@nirvana/b-core`, `@nirvana/builder`, `@nirvana/commons`, and
 * `@nirvana/framework`. Inspected with symlink following, none exports a process
 * start-identity or PID-safety capability. The ecosystem's `nira` component does
 * ship `foundation/process/pidSafety`, but `nira` is not a Watchtower dependency
 * and none of the pinned packages re-export it, so it is **comparable usage**
 * rather than an available API. This module therefore mirrors that accepted
 * mechanism — Linux `/proc/<pid>/stat` `starttime` ticks anchored to
 * `/proc/stat` `btime` — in the smallest focused adapter, and is the only place
 * that reads process facts.
 *
 * One deliberate divergence: Nira compares a recorded wall-clock timestamp
 * against process start time within a 15 s tolerance. Watchtower records the
 * **exact** start marker as its own field, separate from the acquisition
 * timestamp, and compares it by equality. §11 requires start identity and
 * acquisition time to be distinct, and repeated reads of the same process are
 * byte-identical, so equality is both stronger and stable.
 *
 * Supported-platform behavior and failure mode: start identity is available on
 * Linux. On any other platform, or when `/proc` is unreadable, the marker is
 * `UNVERIFIABLE_START_IDENTITY` and a recorded holder can never be classified
 * `stale`. Unverifiable always resolves toward keeping the current holder, so a
 * contender receives a bounded lock conflict instead of stealing a lock it
 * cannot prove is dead.
 */
import {readFileSync} from 'node:fs';
import {basename} from 'node:path';

/** Marker recorded when this platform cannot prove a process start identity. */
export const UNVERIFIABLE_START_IDENTITY = 'unverifiable';

const LINUX_CLOCK_TICKS = 100;
const START_TIME_FIELD_INDEX = 19;

/** Maximum length of a recorded command identity. */
export const MAX_COMMAND_LENGTH = 120;
const UNSAFE_COMMAND_CHARACTERS = /[^A-Za-z0-9._-]+/g;

/**
 * The exact grammar this module mints for a start marker. Both counters are
 * bounded, non-negative, and leading-zero free, so an arbitrary string can never
 * be mistaken for a start identity — which would otherwise let untrusted text
 * masquerade as evidence that a PID was reused.
 */
const START_IDENTITY_PATTERN = /^linux-boot:(?:0|[1-9]\d{0,11}):start:(?:0|[1-9]\d{0,15})$/;

/** Command identities are base names joined by single spaces; never paths. */
const COMMAND_PATTERN = /^[A-Za-z0-9._-]+(?: [A-Za-z0-9._-]+)*$/;

/** The §11 identity fields a durable lock record carries for its owner. */
export interface ProcessIdentity {
    readonly pid: number;
    readonly processStartIdentity: string;
    readonly command: string;
}

/**
 * How a recorded holder relates to the process currently occupying its PID.
 *
 * - `dead` — no process occupies the PID; safe to reclaim.
 * - `stale` — a process occupies the PID but did not create the record (a reused
 *   PID); safe to reclaim.
 * - `active` — the recording process is still running; never reclaim.
 * - `unverifiable` — liveness cannot be proved on this platform or record;
 *   treated as active so the lock is never stolen.
 */
export type ProcessLiveness = 'dead' | 'stale' | 'active' | 'unverifiable';

function parseStartTimeTicks(statRaw: string): number | null {
    const closeIndex = statRaw.lastIndexOf(')');
    if (closeIndex < 0) {
        return null;
    }
    const ticks = Number(statRaw.slice(closeIndex + 2).split(' ')[START_TIME_FIELD_INDEX]);
    return Number.isFinite(ticks) ? ticks : null;
}

function parseBootTimeSeconds(statRaw: string): number | null {
    for (const line of statRaw.split('\n')) {
        if (line.startsWith('btime ')) {
            const value = Number(line.slice('btime '.length).trim());
            return Number.isFinite(value) ? value : null;
        }
    }
    return null;
}

/**
 * Read the exact start marker of `pid`, or `null` when it cannot be proved.
 * The marker is boot-anchored, so it is stable across reads and distinguishes
 * two processes that occupy the same PID at different times.
 */
export function readProcessStartIdentity(pid: number): string | null {
    if (process.platform !== 'linux' || !Number.isInteger(pid) || pid <= 0) {
        return null;
    }
    try {
        const ticks = parseStartTimeTicks(readFileSync(`/proc/${pid}/stat`, 'utf8'));
        const bootSeconds = parseBootTimeSeconds(readFileSync('/proc/stat', 'utf8'));
        if (ticks === null || bootSeconds === null) {
            return null;
        }
        return `linux-boot:${bootSeconds}:start:${Math.floor((ticks / LINUX_CLOCK_TICKS) * 1000)}`;
    } catch {
        return null;
    }
}

/**
 * A bounded, redacted command identity. Only the executable and entry-point base
 * names are used — never full paths and never arguments, which can carry
 * secrets — and the result is character-restricted and length-capped.
 */
export function currentCommandIdentity(): string {
    const parts = [process.execPath, process.argv[1]]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .map((value) => basename(value).replace(UNSAFE_COMMAND_CHARACTERS, '-'));
    return (parts.join(' ') || 'unknown').slice(0, MAX_COMMAND_LENGTH);
}

/**
 * Whether `value` is a start identity this module could have minted, or the
 * explicit unverifiable marker. Anything else is untrusted text and must never
 * be compared against a real process — a mismatch would otherwise be read as
 * proof of PID reuse and would license reclaiming a live holder's lock.
 */
export function isValidProcessStartIdentity(value: unknown): value is string {
    return typeof value === 'string'
        && (value === UNVERIFIABLE_START_IDENTITY || START_IDENTITY_PATTERN.test(value));
}

/** Whether `value` is a bounded, character-safe, path-free command identity. */
export function isValidCommandIdentity(value: unknown): value is string {
    return typeof value === 'string'
        && value.length > 0
        && value.length <= MAX_COMMAND_LENGTH
        && COMMAND_PATTERN.test(value);
}

/** The identity fields this process records when it takes a durable lock. */
export function currentProcessIdentity(): ProcessIdentity {
    return {
        pid: process.pid,
        processStartIdentity: readProcessStartIdentity(process.pid) ?? UNVERIFIABLE_START_IDENTITY,
        command: currentCommandIdentity()
    };
}

function pidOccupied(pid: number): boolean | null {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        // EPERM means a process exists but is owned by another account; that is
        // occupied-but-unprovable, never an invitation to reclaim.
        return (error as NodeJS.ErrnoException).code === 'EPERM' ? null : false;
    }
}

/**
 * Classify a recorded holder by matching **both** its PID and its process start
 * identity. A live PID whose start identity differs is a reused PID and is
 * `stale`; a matching PID and start identity is `active` even when the record's
 * token is foreign to the caller. Anything unproven is `unverifiable`.
 */
export function classifyRecordedProcess(recorded: {readonly pid: number; readonly processStartIdentity: string}): ProcessLiveness {
    const occupied = pidOccupied(recorded.pid);
    if (occupied === false) {
        return 'dead';
    }
    if (occupied === null || recorded.processStartIdentity === UNVERIFIABLE_START_IDENTITY) {
        return 'unverifiable';
    }
    const current = readProcessStartIdentity(recorded.pid);
    if (current === null) {
        return 'unverifiable';
    }
    return current === recorded.processStartIdentity ? 'active' : 'stale';
}
