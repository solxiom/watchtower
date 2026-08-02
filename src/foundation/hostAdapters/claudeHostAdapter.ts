import {homedir} from 'node:os';
import {DirectoryHostAdapter} from './DirectoryHostAdapter.js';
import {resolveKnownDestination} from './hostAdapterInstaller.js';
import type {HostAdapter} from './hostAdapterTypes.js';

/** Default destination: `~/.claude/skills/watchtower-coordinator/`. */
export function createClaudeHostAdapter(home: string = homedir()): HostAdapter {
    return new DirectoryHostAdapter('claude', resolveKnownDestination(home, '.claude', 'skills', 'watchtower-coordinator'));
}
