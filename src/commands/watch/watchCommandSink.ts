import {output as prettyOutput} from '@nirvana/base/utils/pretty';
import type {WatchSink} from '../../foundation/task/index.js';

/** The command-owned presentation boundary: the only place `wt watch` writes a line. */
export const nodeWatchCommandSink: WatchSink = {
    write(line: string): void {
        prettyOutput.write(line, 'basic', 0, true);
    }
};
