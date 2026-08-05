import {BaseCommand} from '@nirvana/base/cli/basic';
import type {Command} from '@nirvana/base/cli/contracts';
import {WatchAttachment, WatchPreflight} from '../../foundation/task/index.js';
import {parseWatchCommandOptions} from './watchCommandOptions.js';
import {nodeWatchCommandSink} from './watchCommandSink.js';

export default class WatchCommand extends BaseCommand implements Command {
    name = 'watch';
    description = 'Run the lane watcher in the foreground.';
    usage = 'watch [--workspace=<path>] [--lane=<slug-or-uuid>] [--initiative=<id>] [--no-color]';
    group = 'basic';
    keywords = ['watch', 'foreground', 'coordinator'];

    constructor(
        private readonly preflight: WatchPreflight = new WatchPreflight(),
        private readonly attachment: WatchAttachment = new WatchAttachment({sink: nodeWatchCommandSink})
    ) { super(); }

    async run(): Promise<void> {
        const options = parseWatchCommandOptions(this.args);
        const result = await this.preflight.run({
            cwd: this.originalCwd, workspace: options.workspace, lane: options.lane,
            initiative: options.initiative, environment: process.env
        });
        await this.attachment.attach(result.lane);
    }
}
