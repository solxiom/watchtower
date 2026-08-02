import {homedir} from 'node:os';
import {DirectoryHostAdapter} from './DirectoryHostAdapter.js';
import {resolveKnownDestination} from './hostAdapterInstaller.js';
import type {HostAdapter} from './hostAdapterTypes.js';

/** Default destination: `~/.codex/skills/watchtower-coordinator/`. */
export function createCodexHostAdapter(home: string = homedir()): HostAdapter {
    return new DirectoryHostAdapter('codex', resolveKnownDestination(home, '.codex', 'skills', 'watchtower-coordinator'));
}
